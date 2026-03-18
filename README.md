<<<<<<< HEAD
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
=======
<<<<<<< ours
# Quercus

Base técnica inicial de Quercus con Next.js, TypeScript, Tailwind CSS, Prisma y PostgreSQL.

## Requisitos

- Node.js 20+
- Docker + Docker Compose

## Configuración local

1. Copiar variables de entorno:

```bash
cp .env.example .env
```

2. Instalar dependencias:

```bash
npm install
```

3. Levantar PostgreSQL local:

```bash
npm run db:up
```

4. Generar cliente Prisma y migrar:

```bash
npm run db:generate
npm run db:migrate
```

5. Seed técnico base:

```bash
npm run db:seed
```

6. Ejecutar aplicación:

```bash
npm run dev
```

## Scripts útiles

- `npm run setup`: instalación + db up + generate + migrate + seed.
- `npm run db:push`: aplica cambios de schema sin crear migración.
- `npm run db:studio`: UI de Prisma para inspeccionar datos.
- `npm run typecheck`: validación TypeScript.
- `npm run lint`: lint de Next.js.

## Estructura

```text
src/
  app/
  auth/
  config/
  domain/
  infrastructure/
  modules/
prisma/
=======
# Quercus - Fase Prompt Operativo 4

Implementación de **auth real + contexto multiempresa + roles/permisos + tenant isolation** usando Python WSGI + SQLite (sin dependencias externas).

## Diseño implementado

### 1) Autenticación real con credenciales
- `POST /api/auth/login` valida `email + password` contra hash PBKDF2-SHA256.
- Las contraseñas se almacenan como `salt$hash`.
- Se crea una sesión server-side en tabla `sessions` y se envía cookie `quercus_session` con:
  - `HttpOnly`
  - `Secure`
  - `SameSite=Strict`
  - `Max-Age`

### 2) Modelo de usuario, empresa y usuario_empresa
Tablas:
- `users`
- `companies`
- `user_companies` (relación y rol por empresa)
- `role_permissions` (base granular por rol)
- `user_company_permissions` (override granular por usuario-empresa)

### 3) Empresa activa para operar
- Se guarda en `sessions.active_company_id`.
- Endpoint `POST /api/context/active-company` cambia empresa activa solo si el usuario pertenece a esa empresa.

### 4) Tenant isolation backend
- Operaciones transaccionales (`/api/transactions`) usan **exclusivamente** `active_company_id` de sesión.
- El cliente no envía `company_id` para escribir datos transaccionales.
- Listados se filtran obligatoriamente por tenant activo.

### 5) Validación de permisos por rol
Permisos base:
- `superadmin`: `*`
- `admin`: `transactions.read`, `transactions.write`, `context.switch`, `reports.company`
- `analyst`: `transactions.read`, `reports.company`

### 6) Base granular de permisos
- `role_permissions` agrega permisos extras por rol.
- `user_company_permissions` permite allow/deny por usuario-empresa.

### 7) Contexto consolidado para reporting
- Endpoint `GET /api/reporting/consolidated` devuelve agregados por empresa.
- Marcado como `scope: reporting_only`.
- No se usa para carga transaccional.

### 8) Protección de rutas/APIs
- `require_auth`: bloquea si no hay sesión válida.
- `require_company_context`: exige empresa activa para operaciones transaccionales.
- `require_permission`: valida permisos efectivos.

### 9) Manejo seguro de sesión
- Sesión almacenada en DB (server-side), no JWT en frontend.
- Expiración `SESSION_TTL_SECONDS`.
- Logout borra sesión y expira cookie.

### 10) Seed inicial mínimo
`python app.py seed` crea:
- `superadmin@quercus.local` / `SuperSecret!123`
- 2 empresas: `ACME`, `BETA`
- Usuario multiempresa: `multiempresa@quercus.local` asignado a ACME (admin) y BETA (analyst)
- Usuario adicional: `analyst@quercus.local`

## Flujo login y cambio de empresa
1. `POST /api/auth/login`
2. `GET /api/auth/me` para obtener empresas y contexto actual
3. `POST /api/context/active-company` para cambiar tenant
4. Operar con `/api/transactions` (lectura/escritura según permisos)

## Cómo probar aislamiento entre empresas
1. Login con `multiempresa@quercus.local` (empresa default ACME: admin)
2. Crear transacción en ACME (`POST /api/transactions`) -> OK
3. Cambiar a BETA (`POST /api/context/active-company` con `company_id=2`)
4. Intentar crear transacción en BETA -> **403** (rol analyst sin write)
5. Listar transacciones en BETA -> no muestra las de ACME

## Ejecutar
```bash
python app.py init-db
python app.py seed
python app.py run --host 0.0.0.0 --port 8000
```

## Tests
```bash
python -m unittest -v
>>>>>>> theirs
```
>>>>>>> main
