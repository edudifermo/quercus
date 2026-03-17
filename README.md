# Quercus - Fase Prompt Operativo 7

Implementación de compras + stock real + movimientos + stock actual + valorizado.

## Modelo funcional implementado
- Compras (`purchases`) y detalle (`purchase_items`).
- Movimientos de stock (`stock_movements`) con `reference_type` y `reference_id`.
- Stock actual por depósito (sumatoria de ingresos/egresos).
- Stock valorizado por costo último (`items.last_cost`).
- Impacto en cuenta corriente de proveedores (`supplier_account_movements`).
- Control por `company_id` en todas las operaciones.

## Endpoints / servicios
- `GET /api/masters`: catálogos base (proveedores, depósitos, ítems).
- `POST /api/purchases`: crea compra, detalle, movimientos de stock e impacto en cuenta corriente.
- `GET /api/reports/stock-by-deposit`: stock actual por depósito.
- `GET /api/reports/kardex`: movimientos de stock.
- `GET /api/reports/stock-valued`: stock valorizado.
- `GET /api/reports/purchases-by-period?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- `GET /api/reports/purchases-by-supplier`.

## Pantallas reales
- `/` pantalla de compras (alta de compra con múltiples ítems y conversiones).
- `/stock` stock por depósito.
- `/reports` accesos a reportes mínimos.

## Flujo completo de prueba
1. Iniciar servidor: `python3 app.py`.
2. Abrir `http://localhost:8000/`.
3. Cargar una compra con un ítem de stock (`raw_material`/`product`) y opcionalmente un servicio.
4. Validar respuesta de compra (ID y total).
5. Abrir `/stock` para ver impacto por depósito.
6. Abrir `/api/reports/kardex` para trazabilidad de movimientos.
7. Abrir `/api/reports/stock-valued` para valorización.
8. Abrir `/api/reports/purchases-by-period` y `/api/reports/purchases-by-supplier`.

## Nota de lógica
- Si el ítem `stock_managed=1` y no es `service`, genera movimiento de ingreso.
- Si es `service`, no mueve stock pero sí impacta en compra y cuenta corriente.
- La lógica sensible vive 100% en backend.
