<<<<<<< ours
# Base técnica inicial - Quercus

## Decisiones finales de modelado

1. **Aislamiento multiempresa**: las tablas operativas incluyen `company_id` y relaciones con `ON DELETE RESTRICT` para evitar pérdida accidental de datos contables históricos.
2. **Soft delete**: se usó `deleted_at` en maestros operativos (`companies`, `chart_accounts`, `third_parties`, `cost_centers`) y `is_active` para activación rápida.
3. **Trazabilidad temporal**: todas las tablas principales tienen `created_at` y `updated_at`; `audit_logs` conserva `created_at` como marca principal de auditoría.
4. **Preparación contable base**: el circuito `accounting_batches` + `staging_entries` permite validar antes de generar asientos (`journal_entries`).
5. **Consolidación multiempresa**: se modeló con `consolidation_groups`, `consolidation_group_companies`, `consolidation_runs`, `consolidation_entries` y `consolidation_account_maps`.
6. **Integridad contable**: checks para débitos/créditos mutuamente excluyentes y positivos, más checks de rangos de fechas y ownership en consolidación.
7. **Compatibilidad Prisma/SQL**: tipos enum y nombres se alinean entre Prisma y PostgreSQL; los checks viven en SQL (Prisma no los modela nativamente).
8. **Ajuste respecto del diseño previo**: se agregó `accounting_batches.posted_entry_id` (1:1 opcional) para ligar explícitamente una importación validada con el asiento resultante, mejorando auditabilidad del proceso de preparación.

## Notas de migración inicial

1. Habilitar extensión `pgcrypto` para `gen_random_uuid()`.
2. Aplicar primero creación de enums y luego tablas para evitar dependencias rotas.
3. Cargar catálogos base mínimos (compañías, usuarios, diarios, períodos) antes de asientos.
4. Si se usa Prisma Migrate, preservar checks y algunos índices vía SQL adicional post-migración.
5. Definir timezone de base de datos y aplicación (recomendado UTC) para coherencia en `timestamptz`.

## Riesgos o puntos a validar antes de Etapa 1

1. **Moneda**: validar lista inicial de `currency_code` contra alcance comercial real por país.
2. **Seguridad por tenant**: reforzar con políticas de acceso a nivel aplicación o RLS en PostgreSQL.
3. **Cierre de períodos**: evaluar necesidad de constraints/triggers extra para impedir inserciones en períodos `LOCKED`.
4. **Balance de asientos**: completar con trigger transaccional para garantizar sum(debit)=sum(credit) por asiento al momento de publicar.
5. **Volumen de auditoría**: definir retención y particionado de `audit_logs` si el volumen esperado es alto.
=======
# Quercus ERP — Initial Design Notes

## Objective
Provide a minimal but extensible ERP foundation with:

- Core master data (organization, users, products, customers, suppliers)
- Financial primitives (chart of accounts, journals, entries)
- Commercial flow (sales and purchase documents)
- Inventory movement baseline
- Audit-friendly metadata (`created_at`, `updated_at`, optional `deleted_at`)

## Architectural Decisions
- PostgreSQL as primary relational datastore.
- UUID primary keys for all core entities.
- Soft-delete support where future archival may be required.
- Explicit status enums for business documents.
- Decoupled tables for line-level details.

## Non-goals for this phase
- Workflow engine
- Advanced tax rules by jurisdiction
- Multi-currency revaluation automation
- Warehouse optimization logic
>>>>>>> theirs
