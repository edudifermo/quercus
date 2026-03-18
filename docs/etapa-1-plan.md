# Etapa 1 — Plan de implementación

## Objetivos

- Materializar esquema inicial en PostgreSQL.
- Definir `schema.prisma` alineado al SQL base.
- Documentar arquitectura y decisiones iniciales.

## Entregables

1. `sql/001_initial_schema.sql`
2. `db/init.sql`
3. `prisma/schema.prisma`
4. Documentación técnica en `docs/`

## Criterios de aceptación

- El SQL crea tablas y constraints sin errores.
- Prisma valida correctamente el modelo.
- Existe relación consistente entre entidades principales.
- Índices base en claves de acceso frecuente.
