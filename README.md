# Quercus · Producción + Tesorería

Implementación de las fases operativas sobre el stack oficial: **Next.js + React + TypeScript + Tailwind CSS + Node.js + PostgreSQL + Prisma**.

## Alcance funcional implementado

### Producción

- **Composición / BOM** por producto fabricable.
- **Órdenes de fabricación** con cálculo automático de requerimientos teóricos.
- **Control de faltantes** contra stock disponible por depósito.
- **Registro de consumos reales** con lote, usuario y merma.
- **Cierre de OF** con impacto en stock y trazabilidad completa.

### Tesorería y proveedores

- **Cajas** y **movimientos de caja** con tenant, moneda, tipo de movimiento y adjuntos.
- **Bancos** y **movimientos bancarios** con base para conciliación (`isReconciled`, referencias externas, grupos de conciliación).
- **Pagos a proveedores** con origen por caja o banco.
- **Imputación de pagos contra compras** mediante `SupplierPaymentItem` vinculado a `SupplierInvoice`.
- **Cuenta corriente de proveedores** mediante `SupplierLedgerEntry` y `Supplier.currentBalance`.
- **Adjuntos** para pagos, compras, caja y bancos con storage local listo para demo y adapter compatible con Supabase Storage (`LOCAL` / `SUPABASE`, metadata S3-ready).
- **Base preparada para futura imputación contable** mediante `accountingStatus`, referencias de origen y movimientos firmados.
- **Base fiscal ARCA/AFIP preparada** mediante configuración fiscal por empresa, puntos de venta, documento fiscalizable y trazabilidad de procesamiento.

## Modelo de datos principal

### Producción

- `Company`, `User`, `Membership`
- `Warehouse`
- `Item`
- `Bom`, `BomLine`
- `ProductionOrder`
- `ProductionRequirement`
- `ProductionConsumption`
- `StockMovement`

### Tesorería

- `Supplier`
- `CashBox`, `CashMovement`
- `BankAccount`, `BankMovement`
- `SupplierInvoice`
- `SupplierPayment`, `SupplierPaymentItem`
- `SupplierLedgerEntry`
- `FileAttachment`

### Base fiscal preparada

- `FiscalConfig`
- `FiscalPointOfSale`
- `FiscalDocument`
- `FiscalProcessingLog`

## Pantallas incluidas

- `/` → tablero de producción con acceso directo a tesorería.
- `/tesoreria` → pantalla operativa real de tesorería:
  - alta de compra proveedor,
  - pago a proveedor,
  - movimientos de caja,
  - movimientos bancarios,
  - adjuntos y trazabilidad.
- `/reportes/produccion` → reportes mínimos de producción.
- `/reportes/tesoreria` → reportes mínimos de tesorería:
  - cuenta corriente proveedor,
  - caja diaria,
  - movimientos bancarios,
  - pagos por período,
  - conciliación base preparada.

## Puesta en marcha

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Abrir `http://localhost:3000/`.

## Variables de entorno relevantes

```bash
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_NAME=Quercus
STORAGE_PROVIDER=LOCAL
STORAGE_BUCKET=quercus-adjuntos
# opcionales para Supabase Storage
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Datos demo incluidos en seed

Se generan:

- 2 empresas.
- 3 usuarios con roles distintos.
- 1 depósito productivo principal.
- BOM, OF cerrada / en curso / con faltantes.
- 2 proveedores reales de ejemplo.
- 1 caja y 1 cuenta bancaria.
- 2 compras proveedor.
- 1 pago imputado parcialmente.
- movimientos de caja y banco listos para reportes.
- cuenta corriente proveedor precargada.

## Cómo probar un pago completo con comprobante adjunto

1. Ejecutar `npm run db:seed`.
2. Abrir `/tesoreria`.
3. En **Compra / cuenta corriente proveedor**, registrar una nueva compra y adjuntar PDF o imagen.
4. En **Pago a proveedor**:
   - seleccionar el mismo proveedor,
   - elegir banco o caja origen,
   - cargar importe total,
   - imputar saldo en la grilla de compras abiertas,
   - adjuntar comprobante de transferencia / ticket / recibo.
5. Grabar el pago.
6. Verificar en `/tesoreria`:
   - el pago aparece en “Pagos por período”,
   - el egreso impacta en caja o banco,
   - el adjunto aparece en “Adjuntos”.
7. Verificar en `/reportes/tesoreria`:
   - el proveedor baja su saldo en cuenta corriente,
   - la compra pasa a `PARTIAL` o `PAID`,
   - el movimiento bancario queda disponible para conciliación.

## Permisos de referencia

- `OWNER`: lectura, altas y pagos en producción/tesorería.
- `PLANNER`: lectura, altas y pagos operativos.
- `OPERATOR`: lectura y cargas operativas sin cierre productivo.
- `VIEWER`: solo lectura.
