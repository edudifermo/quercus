# Quercus ERP · App Shell (Etapa de navegación SaaS)

## Objetivo
Se implementó un **app shell ERP** para convertir la app en una experiencia navegable real, manteniendo los módulos existentes y respetando el contexto multiempresa.

## Organización de la UI
- `src/components/app-shell/app-shell.tsx`
  - Sidebar persistente con dominios funcionales.
  - Topbar con:
    - empresa activa,
    - usuario y rol,
    - selector de grupo consolidado (si existe acceso).
  - Header contextual con breadcrumbs.
- `src/components/app-shell/navigation.ts`
  - Configuración central de módulos (`Dashboard`, `Producción`, `Comercial`, `Tesorería`, `Contabilidad`, `Fiscal`, `Reportes`, `Configuración`).
- `src/components/app-shell/query.ts`
  - Conservación de contexto (`company`, `user`, `group`) al navegar.

## Rutas principales
- `/` redirige a `/dashboard` (manteniendo query params).
- `/dashboard` home interna ERP.
- `/produccion` módulo operativo existente integrado al shell.
- `/tesoreria` módulo operativo existente integrado al shell.
- `/reportes` centro de reportes.
  - `/reportes/produccion`
  - `/reportes/tesoreria`
  - `/reportes/consolidacion`
- Placeholders honestos:
  - `/comercial`
  - `/contabilidad`
  - `/fiscal`
  - `/configuracion`

## Empresa activa (multiempresa)
- Se reutiliza `getAppContext` y `listAvailableContexts` para empresa activa + memberships.
- El selector de empresa cambia el tenant visual/operativo mediante query params.
- El contexto activo se ve en sidebar y topbar para evitar ambigüedad.

## Consolidación / mini holding
- Se reutiliza `getConsolidationGroupsForUser`.
- Si hay grupos, aparece selector de grupo consolidado en topbar.
- `Reportes > Consolidación` diferencia claramente la vista consolidada del tenant individual.

## Próximos pasos sugeridos
1. Convertir placeholders a vistas funcionales usando servicios ya implementados.
2. Incorporar permisos por módulo en navegación (visibilidad dinámica por rol).
3. Persistir tenant/grupo en sesión además de query params para UX extendida.
