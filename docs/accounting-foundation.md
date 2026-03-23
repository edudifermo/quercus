# Base contable estructural — Quercus ERP

## Qué se creó
- **Plan de cuentas multi-tenant** con `AccountingPlan`, `CompanyAccountingPlan` y `AccountingAccount` para soportar planes base reutilizables y planes propios por empresa.
- **Catálogo de imputación contable** con `AccountingPostingType` y `AccountingPostingRule`, pensado para resolver cuentas por módulo, entidad origen, operación y tipo de movimiento.
- **Fundación técnica de asientos** con `AccountingEntry` y `AccountingEntryLine`, manteniendo estado, trazabilidad al origen y totales débito/crédito.
- **Referencias prudentes sobre módulos existentes**:
  - `Supplier.payableAccountId`
  - `CashBox.accountingAccountId`
  - `BankAccount.accountingAccountId`
  - `Item.inventoryAccountId` y `Item.expenseAccountId`
  - `SupplierInvoice`, `SupplierPayment`, `CashMovement`, `BankMovement`, `StockMovement` y `ProductionOrder` con referencias opcionales a `accountingRuleId` y `accountingEntryId`.
- **Servicios mínimos de dominio** en `src/modules/accounting/` para:
  - validar borradores de asientos,
  - asegurar que una cuenta esté disponible para una empresa,
  - resolver reglas contables activas por contexto.

## Qué quedó preparado
- Reutilización de un plan base por múltiples empresas sin perder la opción de derivar un plan propio.
- Cuentas activas/inactivas, jerarquía padre/hijo, naturaleza contable, rubro/categoría y control de imputación directa.
- Reglas configurables con prioridad para futura derivación automática desde compras, tesorería, stock y producción.
- Trazabilidad opcional entre documentos operativos y futuros asientos contables sin obligar todavía a generar asientos automáticos.
- Seed de ejemplo con plan base, plan propio, cuentas mínimas y reglas iniciales para proveedores, pagos, caja y producción.

## Qué NO se implementó todavía
- Libro diario funcional completo.
- Mayor, balance, cierres o períodos contables.
- Motor automático end-to-end que genere asientos definitivos al operar cada módulo.
- UI administrativa avanzada para mantenimiento contable.
- Proceso masivo de contabilización o reproceso histórico.

## Cómo seguir en una fase futura
1. Crear ABM de planes, cuentas y reglas respetando membresías y tenant activo.
2. Incorporar validaciones transaccionales para que cada documento operativo solo use cuentas accesibles por su empresa.
3. Implementar un servicio de posting que:
   - resuelva la regla contable,
   - construya `AccountingEntry`/`AccountingEntryLine`,
   - balancee importes,
   - marque el `accountingStatus` del documento origen.
4. Agregar auditoría funcional: quién configuró reglas, cuándo se activaron y desde qué versión de plan.
5. Diseñar reportes contables recién cuando exista el posting engine y reglas operativas estabilizadas.
