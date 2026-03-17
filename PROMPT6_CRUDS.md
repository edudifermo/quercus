# CRUDs maestros base (Prompt Operativo 6)

## Módulos implementados
- proveedores
- proveedor_medios_pago (histórico, favorito, vigencia y múltiples registros por proveedor)
- clientes
- depositos
- items (modelo unificado para materias_primas/productos/servicios)
- categorias
- unidades
- auditoría básica

## Backend
Base URL: `/api`

- `GET/POST /proveedores`
- `PUT/DELETE /proveedores/:id`
- `GET/POST /proveedor_medios_pago`
- `PUT/DELETE /proveedor_medios_pago/:id`
- `GET/POST /clientes`
- `PUT/DELETE /clientes/:id`
- `GET/POST /depositos`
- `PUT/DELETE /depositos/:id`
- `GET/POST /items`
- `PUT/DELETE /items/:id`
- `GET/POST /categories`
- `PUT/DELETE /categories/:id`
- `GET/POST /units`
- `PUT/DELETE /units/:id`
- `GET /catalogs`
- `GET /audit_logs`

### Reglas implementadas
- Todos los registros incluyen `company_id`.
- Bajas lógicas por `deleted_at`.
- Auditoría en altas/modificaciones/bajas en `audit_logs`.
- Permisos por rol (`X-Role`: `admin`, `editor`, `viewer`).
- `proveedor_medios_pago`:
  - múltiples registros por proveedor;
  - `is_favorite` (solo uno activo por proveedor);
  - vigencia con `valid_from` y `valid_to`;
  - histórico por no sobrescribir eliminados y por auditoría.

## Validaciones
Backend:
- Campos requeridos por módulo.
- Validación de proveedor existente en medios de pago.
- Validación de vigencia (`valid_to >= valid_from`).
- Constraints de unicidad por `company_id` para campos clave (por ejemplo, `tax_id`, `sku`).

Frontend:
- Validación de campos requeridos antes de enviar.
- Validación de vigencia en medios de pago.
- Visualización de errores de API.

## UI y flujo funcional
- Pantalla principal con tabs por módulo.
- Tabla con búsqueda, orden (`sort`, `direction`) y paginación (`page`, `per_page`).
- Formulario reutilizable para alta/edición.
- Baja lógica desde grilla.
- Auditoría visible en la misma pantalla.
- `proveedor_medios_pago` accesible como módulo específico, vinculable por `supplier_id`.

## Cómo probar cada módulo
1. Instalar dependencias: `pip install -r requirements.txt`.
2. Ejecutar app: `python app.py`.
3. Abrir `http://localhost:5000`.
4. Elegir módulo y rol.
5. Probar:
   - Alta (Create).
   - Edición (Update).
   - Baja lógica (Delete).
   - Listado con búsqueda/orden/paginación.
6. Para permisos:
   - `viewer`: solo lectura.
   - `editor`: crea/edita, sin baja.
   - `admin`: CRUD completo.

