# Quercus — Revisión estructural y modelo base definitivo (Prompt Operativo 1)

> Alcance de esta entrega: cerrar base de datos y decisiones de arquitectura de un ERP multiproceso (compras, ventas, stock, producción, contabilidad), priorizando consistencia de datos y escalabilidad.

## 1) Observaciones y riesgos del diseño original

Sin el documento maestro completo en este repositorio, se asumen los riesgos típicos de un diseño ERP inicial con entidades separadas para `materias_primas`, `productos` y `servicios`.

### 1.1 Riesgo de duplicidad semántica de ítems
- Mantener tres tablas separadas suele duplicar atributos comunes: código interno, descripción, unidad de medida, impuestos, cuentas contables, estado, empresa, trazabilidad.
- El costo de mantenimiento sube (validaciones repetidas, reglas de pricing repetidas, joins complejos).
- Integraciones transversales (listas de precios, promociones, reportes, BI) se vuelven frágiles porque deben “unificar” por consulta.

### 1.2 Riesgo de inconsistencias en stock/movimientos
- Diseños que actualizan stock “por acumulado en tabla de artículo” sin ledger de movimientos generan descuadres y baja auditabilidad.
- Mezclar eventos de compras/ventas/producción en lógica de aplicación sin un modelo de movimientos canónico impide reconstrucción histórica.

### 1.3 Riesgo financiero por moneda mal modelada
- Si se guarda solo importe en moneda de transacción sin tipo de cambio al momento del hecho, se pierde trazabilidad para auditoría y diferencia de cambio.
- Recalcular históricos con cotización “actual” genera errores contables.

### 1.4 Riesgo fiscal por impuestos embebidos en documentos
- Grabar impuestos solo como texto o campos sueltos por documento dificulta cambios de alícuotas y convivencia de regímenes.
- Falta de vigencias en alícuotas lleva a recomputar facturas históricas incorrectamente.

### 1.5 Riesgo de seguridad y operación multiempresa
- Modelos sin separación estricta por `company_id` o sin jerarquía corporativa habilitan fugas de datos.
- No separar operación por empresa y consolidación analítica complica reporting corporativo y cierre.

### 1.6 Riesgo de auditoría insuficiente
- Solo usar `created_at/updated_at` no alcanza para controles ERP (quién cambió qué, antes/después, motivo, origen).
- Sin versionado de estados/documentos no hay inmutabilidad funcional en procesos críticos.

---

## 2) Decisiones estructurales recomendadas

### 2.1 Capa común de `items` (recomendado)
**Decisión:** unificar `materias_primas`, `productos` y `servicios` en una entidad raíz `item` + especializaciones opcionales por comportamiento.

- Tabla central: `item` (catálogo único).
- Clasificación por tipo: `item_type` (`RAW_MATERIAL`, `FINISHED_GOOD`, `SERVICE`, `CONSUMABLE`, etc.).
- Extensiones opcionales:
  - `item_inventory` (solo si maneja stock).
  - `item_service` (parametría de servicio: imputación por horas, SLA, etc.).
  - `item_production` (si participa en BOM/rutas).

**Beneficio:** reglas transversales únicas (impuestos por defecto, cuentas contables, listas de precios, estados).

### 2.2 Modelo canónico de documentos + movimientos
**Decisión:** separar documentos de negocio y efectos físicos/financieros.

- Documentos: compras, ventas, producción, ajustes.
- Efectos en stock: siempre por `inventory_movement` (ledger inmutable, preferentemente append-only con reversos).
- Efectos contables: asientos en `gl_entry` y `gl_entry_line`.
- Evitar actualizar stock “a mano” fuera de movimientos.

### 2.3 Estrategia compras/ventas/stock/producción coherente
- Compras: `purchase_order` -> `goods_receipt` -> `vendor_invoice`.
- Ventas: `sales_order` -> `delivery_note` -> `customer_invoice`.
- Producción: `production_order` consume componentes y produce terminados vía movimientos de inventario.
- Reservas de stock: entidad de reserva separada para promesas comerciales/producción.

### 2.4 Estrategia de monedas y cotizaciones
- Catálogo `currency` (ISO) + tabla `fx_rate` con fuente, fecha/hora y tipo (oficial, comprador, vendedor, promedio).
- En cada documento/linea monetaria:
  - `currency_id` (moneda transacción)
  - `fx_rate_id` o snapshot de cotización aplicada
  - importes en moneda transaccional y funcional (`amount_tx`, `amount_func`)
- Definir moneda funcional por empresa (`company.functional_currency_id`).

### 2.5 Estrategia de impuestos
- Separar:
  - `tax` (impuesto)
  - `tax_rate` (alícuota con vigencia desde/hasta)
  - `tax_rule` (determinación por jurisdicción, tipo de ítem, contraparte, condición fiscal)
- En documentos, persistir detalle calculado por línea en `document_tax_line` para congelar histórico.

### 2.6 Estrategia de auditoría
- Auditoría técnica: `audit_log` (tabla, PK, operación, actor, timestamp, before/after JSON, request_id).
- Auditoría funcional:
  - Estados con máquina explícita (`DRAFT`, `POSTED`, `CANCELLED`, etc.).
  - Política de no borrado físico para documentos transaccionales (soft delete o anulaciones por reverso).
- Incluir `created_by`, `updated_by`, `posted_by`, `cancelled_by` según corresponda.

### 2.7 RBAC y permisos
- Modelo RBAC estándar:
  - `user`
  - `role`
  - `permission`
  - `user_role`
  - `role_permission`
- Alcance por empresa y opcional por sucursal/deposito: `user_role_scope`.
- Permisos por acción/recurso (`sales.invoice.post`, `inventory.adjust.approve`).

### 2.8 Multiempresa operativa + consolidación analítica
- Operación: todo dato transaccional con `company_id` obligatorio.
- Grupo corporativo:
  - `company_group`
  - `company_group_member`
- Consolidación analítica sin mezclar operación:
  - vistas/materializaciones por grupo y período
  - mapeos de cuentas (`consolidation_account_map`) para homologar plan de cuentas entre empresas.

### 2.9 Preparación contable base
- Plan de cuentas por empresa: `chart_of_accounts`, `account`.
- Asientos:
  - `gl_entry` (cabecera)
  - `gl_entry_line` (debe/haber, moneda transaccional y funcional)
- Integración subledger:
  - Cada documento posteado referencia asiento generado (`source_doc_type`, `source_doc_id`).
- Controles:
  - balance por asiento = 0 en moneda funcional.
  - períodos contables `accounting_period` con estados (`OPEN`, `CLOSED`, `LOCKED`).

---

## 3) Modelo relacional mejorado y definitivo

> Modelo lógico propuesto (nivel entidad-relación, sin SQL físico).

### 3.1 Núcleo organizacional
- `company` (1) — (N) `branch`
- `company_group` (1) — (N) `company_group_member` — (N) `company`
- `warehouse` pertenece a `branch` y `company`

### 3.2 Maestros comerciales y catálogo
- `business_partner` (cliente/proveedor/ambos)
- `partner_fiscal_profile` (condición fiscal, jurisdicción)
- `item` (raíz)
- `item_inventory` (1:1 opcional con `item`)
- `item_service` (1:1 opcional)
- `uom` y `uom_conversion`
- `price_list` y `price_list_item`

### 3.3 Compras
- `purchase_order` (cabecera) — `purchase_order_line`
- `goods_receipt` — `goods_receipt_line` (genera `inventory_movement` tipo IN)
- `vendor_invoice` — `vendor_invoice_line` + `document_tax_line`
- `ap_open_item` para cuentas por pagar

### 3.4 Ventas
- `sales_order` — `sales_order_line`
- `delivery_note` — `delivery_note_line` (genera `inventory_movement` tipo OUT)
- `customer_invoice` — `customer_invoice_line` + `document_tax_line`
- `ar_open_item` para cuentas por cobrar

### 3.5 Inventario
- `inventory_movement` (ledger cabecera) — `inventory_movement_line`
- `stock_balance` (tabla derivada/materializada por item-deposito-lote)
- `inventory_reservation`
- `lot_serial` (trazabilidad opcional)
- `inventory_adjustment` (documento origen de movimientos de ajuste)

### 3.6 Producción
- `bom` (lista de materiales) — `bom_line`
- `routing` — `routing_operation`
- `work_center`
- `production_order`
- `production_issue` / `production_receipt` (o un único doc de partes) que impacta `inventory_movement`

### 3.7 Impuestos y fiscal
- `tax`
- `tax_rate`
- `tax_rule`
- `document_tax_line`
- `fiscal_document_type` (factura A/B/etc. según país)

### 3.8 Moneda y finanzas
- `currency`
- `fx_rate`
- `payment_term`
- `payment`
- `bank_account`
- `cash_account`

### 3.9 Contabilidad
- `chart_of_accounts`
- `account`
- `accounting_period`
- `gl_entry` — `gl_entry_line`
- `subledger_link` (opcional si se desea desacoplar referencias)

### 3.10 Seguridad y auditoría
- `user`
- `role`
- `permission`
- `user_role`
- `role_permission`
- `user_role_scope`
- `audit_log`
- `document_event` (timeline de workflow)

---

## 4) Listado final de tablas

### 4.1 Organización
1. `company`
2. `branch`
3. `company_group`
4. `company_group_member`
5. `warehouse`

### 4.2 Maestros
6. `business_partner`
7. `partner_address`
8. `partner_fiscal_profile`
9. `item`
10. `item_inventory`
11. `item_service`
12. `item_production`
13. `uom`
14. `uom_conversion`
15. `price_list`
16. `price_list_item`

### 4.3 Compras
17. `purchase_order`
18. `purchase_order_line`
19. `goods_receipt`
20. `goods_receipt_line`
21. `vendor_invoice`
22. `vendor_invoice_line`
23. `ap_open_item`

### 4.4 Ventas
24. `sales_order`
25. `sales_order_line`
26. `delivery_note`
27. `delivery_note_line`
28. `customer_invoice`
29. `customer_invoice_line`
30. `ar_open_item`

### 4.5 Inventario y producción
31. `inventory_movement`
32. `inventory_movement_line`
33. `stock_balance`
34. `inventory_reservation`
35. `lot_serial`
36. `inventory_adjustment`
37. `bom`
38. `bom_line`
39. `routing`
40. `routing_operation`
41. `work_center`
42. `production_order`
43. `production_issue`
44. `production_receipt`

### 4.6 Fiscal, moneda, pagos
45. `tax`
46. `tax_rate`
47. `tax_rule`
48. `document_tax_line`
49. `fiscal_document_type`
50. `currency`
51. `fx_rate`
52. `payment_term`
53. `payment`
54. `bank_account`
55. `cash_account`

### 4.7 Contabilidad
56. `chart_of_accounts`
57. `account`
58. `accounting_period`
59. `gl_entry`
60. `gl_entry_line`
61. `consolidation_account_map`

### 4.8 Seguridad y auditoría
62. `user`
63. `role`
64. `permission`
65. `user_role`
66. `role_permission`
67. `user_role_scope`
68. `audit_log`
69. `document_event`

---

## 5) Enums / catálogos necesarios

### 5.1 Enums transversales
- `document_status`: `DRAFT`, `CONFIRMED`, `POSTED`, `CANCELLED`, `REVERSED`
- `line_status`: `OPEN`, `PARTIAL`, `CLOSED`, `CANCELLED`
- `movement_type`: `IN`, `OUT`, `TRANSFER`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `PRODUCTION_ISSUE`, `PRODUCTION_RECEIPT`
- `item_type`: `RAW_MATERIAL`, `FINISHED_GOOD`, `SEMI_FINISHED`, `SERVICE`, `CONSUMABLE`
- `valuation_method`: `FIFO`, `WEIGHTED_AVG`, `STANDARD`
- `account_type`: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`
- `normal_balance`: `DEBIT`, `CREDIT`
- `partner_type`: `CUSTOMER`, `SUPPLIER`, `BOTH`
- `tax_application_level`: `LINE`, `DOCUMENT`
- `fx_rate_type`: `OFFICIAL`, `BUY`, `SELL`, `AVERAGE`, `CUSTOM`

### 5.2 Catálogos parametrizables
- `country`, `province_state`, `city`
- `jurisdiction_tax`
- `incoterm` (si aplica logística internacional)
- `payment_method`
- `cost_center`
- `analytic_account`
- `reason_code` (ajustes, anulaciones, devoluciones)

---

## 6) Orden recomendado de implementación

### Fase A — Fundaciones (obligatorio)
1. Organización y seguridad base: `company`, `branch`, `user`, RBAC.
2. Catálogos críticos: `currency`, `uom`, `tax`/`tax_rate`, `accounting_period`.
3. Maestro unificado `item` + extensiones.
4. `business_partner` + perfil fiscal.

### Fase B — Núcleo transaccional mínimo viable
5. Compras básicas (`purchase_order`, `goods_receipt`, `vendor_invoice`).
6. Ventas básicas (`sales_order`, `delivery_note`, `customer_invoice`).
7. Ledger de inventario (`inventory_movement` + `inventory_movement_line`) y `stock_balance` derivado.

### Fase C — Integración contable y control
8. `chart_of_accounts`, `account`, `gl_entry`, `gl_entry_line`.
9. Posteos automáticos desde subledgers (compras/ventas/stock).
10. Auditoría técnica (`audit_log`) y funcional (`document_event`, estados).

### Fase D — Producción y analítica corporativa
11. BOM/rutas/órdenes de producción + movimientos asociados.
12. Multiempresa avanzada (`company_group`, consolidación, mapeos contables).
13. Analítica y cierres (KPIs, reportes consolidados, control de diferencias de cambio e impuestos).

---

## Notas de cierre
- Este diseño privilegia inmutabilidad de eventos, trazabilidad completa y desacople entre operación, fiscalidad y contabilidad.
- La decisión clave para minimizar inconsistencias es: **documentos de negocio + ledgers canónicos (inventario/contabilidad) + reglas versionadas (impuestos/cotizaciones)**.
