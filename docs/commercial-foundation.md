# Base comercial moderna — Quercus ERP

## Qué se creó

Se incorporó la base comercial multiempresa para ventas internas, cuenta corriente de clientes y cobranzas dentro del stack actual (`Next.js + TypeScript + Prisma + PostgreSQL`).

### Modelo Prisma agregado

- `Client`: maestro de clientes por empresa, con datos fiscales/comerciales básicos, estado activo/inactivo, `soft delete` (`deletedAt`) y saldo corriente.
- `CommercialDocument`: comprobantes comerciales de venta (internos), con numeración, importes, estado, vínculo opcional fiscal y contable.
- `CommercialDocumentLine`: líneas detalladas de cada comprobante, con soporte de ítem o descripción libre controlada.
- `CommercialReceipt`: recibos/cobranzas por cliente, con estado de aplicación y saldo no aplicado.
- `CommercialReceiptApplication`: aplicaciones parciales/totales de cobranzas sobre comprobantes.
- `CommercialLedgerEntry`: libro de cuenta corriente comercial por cliente para saldo histórico y trazabilidad.

### Reutilización/extensión del catálogo de ítems

Se extendió `Item` para evitar duplicación entre stock y comercial:

- `commercialItemType` (`PRODUCT`, `SERVICE`, `SELLABLE`, `NON_COMMERCIAL`)
- `isCommercialSellable`
- `defaultSalePrice`
- `salesAccountId` (vínculo contable opcional)

Además, `ItemType` incorpora `SERVICE` para representar servicios sin romper el modelo de inventario existente.

### Enums agregados

- `ClientType`
- `CommercialDocumentType`
- `CommercialDocumentStatus`
- `CommercialReceiptStatus`
- `CommercialLedgerEntryType`
- `CommercialItemType`

## Integración fiscal prudente

- `CommercialDocument` referencia opcionalmente a `FiscalDocument` (`fiscalDocumentId`).
- El vínculo permite que un comprobante comercial sea fiscalizable sin duplicar lógica fiscal.
- No se implementa emisión electrónica real ni flujo AFIP/ARCA operativo en esta etapa.

## Integración contable prudente

- Se amplía `AccountingModule` con `SALES`.
- `CommercialDocument` y `CommercialReceipt` incorporan referencias opcionales a:
  - `accountingRuleId`
  - `accountingEntryId`
- `Client` permite `receivableAccountId` para preparar imputaciones automáticas futuras.

## Capa de dominio mínima (TypeScript)

Nuevo módulo `src/modules/commercial/` con:

- `types.ts`: contratos y esquemas Zod para cliente, comprobantes y cobranzas.
- `validators.ts`: validaciones de coherencia de totales, estados, cliente activo, topes de aplicación y consistencia documental.
- `service.ts`: creación transaccional de comprobantes/cobranzas, aplicación de cobranzas a documentos y actualización del libro corriente.

## Seeds demo

La seed ahora incluye:

- 2 clientes demo,
- 2 comprobantes comerciales (`producto` y `servicio`),
- 1 cobranza aplicada parcialmente,
- asientos de cuenta corriente comercial,
- reglas contables base para `SALES`.

## Pendientes para próxima fase

1. Exponer UI operativa comercial (ABM y circuitos) con permisos por membresía.
2. Integrar posting contable automático completo para ventas/cobranzas.
3. Definir motor de numeración comercial por tipo/punto de venta interno.
4. Incorporar reglas de impuestos comerciales más completas por línea.
5. Añadir reportes comerciales y aging de cuenta corriente por cliente.
