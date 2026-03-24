# Consolidación multiempresa · Fase 1

## Qué se creó

Se implementó una capa base de consolidación multiempresa para Quercus ERP orientada a grupos chicos y holdings livianos.

### Modelo de datos (Prisma)

- `ConsolidationGroup`: define el grupo de consolidación (nombre, código, descripción, estado, creador y timestamps).
- `ConsolidationGroupCompany`: define pertenencia de empresas al grupo (estado activo, orden opcional, fecha de alta opcional).
- `ConsolidationGroupMembership`: controla acceso por usuario al grupo (`ADMIN`, `ANALYST`, `VIEWER`).

También se agregaron relaciones en `Company` y `User` para navegar membresías y grupos creados.

### Capa de servicios

Se creó `src/modules/consolidation/service.ts` con funciones tipadas para consultas consolidadas:

- `getConsolidationGroupsForUser`
- `getConsolidatedTreasurySummary`
- `getConsolidatedPayablesSummary`
- `getConsolidatedReceivablesSummary`
- `getConsolidatedCommercialSummary`
- `getConsolidatedCompanyBreakdown`

### UI mínima

Se agregó la pantalla:

- `/reportes/consolidacion`

Incluye selector de grupo, filtros de fechas/moneda, tarjetas con totales consolidados y tabla de resumen por empresa.

## Métricas consolidadas incluidas

### Tesorería
- saldo de caja por empresa
- saldo de bancos por empresa
- liquidez consolidada

### Proveedores
- facturas pendientes por empresa
- pagos por período por empresa
- deuda consolidada de proveedores

### Comercial / Clientes
- documentos comerciales emitidos por empresa
- ventas totales por período por empresa
- cobranzas por período por empresa
- saldo de cuenta corriente de clientes por empresa (con detalle por cliente)

### Resumen por empresa
- liquidez
- deuda proveedores
- saldo clientes
- ventas y cobranzas período
- participación porcentual en liquidez y ventas

## Integración con módulos existentes

La consolidación no duplica datos: opera sobre tablas reales existentes de tesorería, proveedores y comercial.

- Tesorería: `CashBox`, `CashMovement`, `BankAccount`, `BankMovement`
- Proveedores: `SupplierInvoice`, `SupplierPayment`
- Comercial: `CommercialDocument`, `CommercialReceipt`
- Seguridad multi-tenant: `Membership` + membresía explícita al grupo (`ConsolidationGroupMembership`)

El acceso final se resuelve por intersección:
1) usuario miembro del grupo de consolidación,
2) usuario con membresía tenant (`Membership`) en la empresa del grupo.

## Limitaciones de esta fase

- No hay eliminaciones intercompany complejas.
- No hay consolidación contable legal.
- No hay forecast financiero avanzado.
- No hay dashboard ejecutivo avanzado ni BI masivo.
- La valuación multicurrency usa filtros simples por moneda del documento/movimiento (sin reexpresión consolidada avanzada).

## Evolución recomendada (fases futuras)

1. Dashboards ejecutivos por grupo económico (KPIs y tendencias).
2. Forecast financiero consolidado (caja y capital de trabajo).
3. Comparativas intercompany con métricas homogéneas por unidad de negocio.
4. Consolidación contable más avanzada con reglas y ajustes por grupo.
5. Reportería exportable y scheduling para directorio/gerencia.
