# Arquitectura — Etapa 0 (Fundación)

## Capas

1. **Persistencia**: PostgreSQL con esquema relacional normalizado.
2. **Acceso a datos**: Prisma como ORM para tipado y migraciones.
3. **Dominio**: Módulos separados por bounded context:
   - Core
   - Finanzas
   - Comercial
   - Inventario
4. **API/Application** (futuro): servicios transaccionales y validaciones de negocio.

## Principios

- Integridad referencial estricta mediante claves foráneas.
- Trazabilidad temporal con timestamps en UTC.
- Diseño preparado para crecimiento modular.
- Convenciones consistentes de nombres (`snake_case` en DB).

## Esquema de alto nivel

- `organizations`, `users`
- `customers`, `suppliers`, `products`
- `chart_of_accounts`, `journal_entries`, `journal_entry_lines`
- `sales_orders`, `sales_order_lines`
- `purchase_orders`, `purchase_order_lines`
- `stock_movements`
