# Quercus · Producción base

Implementación de la fase **“Producción composición + OF + consumos + faltantes”** sobre el stack oficial: **Next.js + React + TypeScript + Tailwind CSS + Node.js + PostgreSQL + Prisma**.

## Alcance funcional implementado

- **Composición / BOM** por producto fabricable.
- **Órdenes de fabricación** con cálculo automático de requerimientos teóricos.
- **Control de faltantes** contra stock disponible por depósito.
- **Registro de consumos reales** con lote, usuario y merma.
- **Cierre de OF** con impacto en stock:
  - egreso de materias primas consumidas,
  - ingreso de producto terminado.
- **Trazabilidad completa** vía `stock_movements.trace_code`, consumos y referencias a OF.
- **Dashboard y reportes mínimos**:
  - órdenes por estado,
  - consumos teóricos vs reales,
  - materias primas faltantes,
  - producción resumida.
- **Tenant y permisos** por membresía (`OWNER`, `PLANNER`, `OPERATOR`, `VIEWER`).
- **Base preparada para futura imputación contable** al conservar costo estándar, referencias y movimientos trazables.

## Modelo de datos principal

- `companies`, `users`, `memberships`
- `warehouses`
- `items`
- `boms`, `bom_lines`
- `production_orders`
- `production_requirements`
- `production_consumptions`
- `stock_movements`

## Puesta en marcha

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Abrir `http://localhost:3000/`.

## Datos demo reales incluidos en seed

Se generan:
- 2 empresas.
- 3 usuarios con roles distintos.
- 1 depósito productivo principal.
- Materias primas reales: harina, azúcar, cacao, empaque.
- 1 producto terminado fabricable: alfajor cacao 55g.
- 1 BOM activo.
- 3 OF de ejemplo:
  - una cerrada,
  - una en curso,
  - una en borrador con faltantes.
- stock inicial y movimientos productivos para validar trazabilidad.

## Cómo probar una OF punta a punta

1. Entrar al tablero principal `/`.
2. Verificar contexto activo de empresa/usuario en la cabecera.
3. Crear una nueva OF desde “Nueva orden de fabricación”.
4. Confirmar que la OF aparece en estado:
   - `RELEASED` si no tiene faltantes,
   - `DRAFT` si detecta faltantes.
5. Abrir la OF desde la tabla “Órdenes por estado”.
6. Revisar requerimientos teóricos, disponible al liberar y faltantes.
7. Registrar consumos reales indicando cantidad, merma y lote.
8. Cerrar la OF cargando producción real y merma final.
9. Volver al tablero y validar:
   - cambio de estado a `CLOSED`,
   - actualización de stock,
   - actualización de reportes.
10. Revisar `/reportes/produccion` para ver resumen y desvíos.

## Permisos de referencia

- `OWNER`: lectura, alta, consumos y cierre.
- `PLANNER`: lectura, alta y planificación.
- `OPERATOR`: lectura y carga de consumos.
- `VIEWER`: solo lectura.
