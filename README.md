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
```
