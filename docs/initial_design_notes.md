# Notas de diseño inicial · Producción base

## Decisiones tomadas

1. **Tenant isolation**: todas las entidades transaccionales incluyen `companyId` y la UI opera siempre contra el tenant activo obtenido desde `Membership`.
2. **Permisos**: se resuelven por rol (`OWNER`, `PLANNER`, `OPERATOR`, `VIEWER`) en backend antes de crear OF, cargar consumos o cerrar órdenes.
3. **Composición/BOM**: un `Bom` identifica la receta base de un producto fabricable y `BomLine` define cantidades y merma esperada por componente.
4. **Requerimientos**: al crear una OF se calculan desde la BOM, considerando cantidad planificada, base quantity y `scrapRate` de cada línea.
5. **Faltantes**: se comparan los requerimientos contra stock disponible por depósito usando agregación de `StockMovement`.
6. **Consumos reales**: se guardan separados del movimiento físico para mantener trazabilidad operativa antes del cierre.
7. **Cierre de OF**: recién al cerrar se generan movimientos de stock negativos para MP y positivos para PT.
8. **Trazabilidad**: `ProductionConsumption` conserva usuario, lote y notas; `StockMovement` guarda `referenceType`, `referenceId` y `traceCode`.
9. **Contabilidad futura**: `standardCost` y los movimientos trazables dejan el modelo listo para una futura imputación contable de producción.
