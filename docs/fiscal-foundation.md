# Base fiscal ARCA/AFIP para Quercus

## Qué se creó

Se incorporó una base fiscal estructural y multiempresa para preparar integraciones futuras con ARCA/AFIP sin emitir comprobantes reales todavía.

### Modelo Prisma agregado

- `FiscalConfig`: parametrización fiscal por empresa (`CUIT`, razón social, condición IVA, ambiente, referencias técnicas e indicadores de activación).
- `FiscalPointOfSale`: puntos de venta fiscales por empresa con unicidad por tenant y soporte de uso/alcance.
- `FiscalDocument`: puente entre una entidad comercial futura y su representación fiscal potencial.
- `FiscalProcessingLog`: trazabilidad de solicitudes, respuestas, estados y errores fiscales.

### Enums agregados

- `FiscalEnvironment`
- `FiscalIvaCondition`
- `GrossIncomeCondition`
- `FiscalPointOfSaleUse`
- `FiscalDocumentType`
- `FiscalDocumentStatus`
- `FiscalOperationType`
- `FiscalProcessingStatus`

### Capa de dominio mínima

En `src/modules/fiscal/` se dejó:

- `types.ts`: contratos tipados y esquemas Zod.
- `validators.ts`: validación de CUIT, configuración fiscal y consistencia básica de documentos fiscales.
- `service.ts`: recuperación de configuración activa, selección de punto de venta, armado de borradores fiscales y registro de logs.
- `adapters.ts`: interfaz para una futura integración real con ARCA/AFIP y un adapter `Noop` que solo deja definido el contrato.

### Seed demo

La seed principal ahora genera:

- una configuración fiscal de ejemplo para `Quercus Foods`,
- un punto de venta de testing,
- un log inicial de validación de configuración.

## Qué quedó preparado

- Base multi-tenant por `Company` sin romper la arquitectura actual.
- Relación futura entre documentos comerciales y fiscales mediante `sourceEntityType` + `sourceEntityId`.
- Ambientes `TESTING` / `PRODUCTION`.
- Referencias seguras a certificado/clave mediante placeholders, sin guardar secretos reales en claro.
- Trazabilidad transaccional para intentos fiscales y futuros adapters externos.

## Qué NO se implementó todavía

- Emisión real de comprobantes contra ARCA/AFIP.
- WSAA / WSFEv1 / padrón / CAE / CAEA.
- Libro IVA.
- Circuito comercial completo de ventas.
- UI operativa fiscal completa.
- Gestión segura final de secretos en un vault productivo.

## Cómo seguir en una próxima fase

1. Definir estrategia de secretos (`Vault`, `KMS`, `Secrets Manager`, etc.).
2. Crear un adapter real ARCA/AFIP que implemente `FiscalAuthorityAdapter`.
3. Vincular `FiscalDocument` con la entidad comercial definitiva de ventas cuando exista.
4. Incorporar numeración fiscal, validación de receptor, alícuotas IVA y totales fiscales.
5. Persistir solicitudes/respuestas firmadas y flujos asincrónicos de consulta de estado.
6. Exponer server actions o endpoints solo cuando el patrón de integración fiscal quede validado funcionalmente.
