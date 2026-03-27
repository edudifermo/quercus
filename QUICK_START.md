# 🚀 Quick Start - Ejecutar los Seeds

## En 30 segundos

```bash
# 1. Navegar al proyecto
cd c:/Users/EduardoDiFermo/dev/quercus

# 2. Ejecutar los nuevos seeds (sin resetear BD)
npx tsx prisma/seed_new_companies.ts

# 3. ¡Listo! Las dos empresas se crearon con todos sus datos
```

---

## Esperar a ver

```
🧵 Inicializando: Tejedora del Sur (Empresa Textil)
📱 Inicializando: tiempodesguro.com.ar (Publicidad Digital)

✅ Tejedora del Sur creada exitosamente
✅ tiempodesguro.com.ar creada exitosamente

📊 RESUMEN CREADO:
  ✅ Empresa 1: Tejedora del Sur S.A.
  ✅ Empresa 2: Tiempodesguro.com.ar S.A.

🎉 Seeds completados exitosamente!
```

---

## Ver los datos en la BD

```bash
# Abrir DB Studio (interfaz visual de Prisma)
npx prisma studio

# Navegar a:
# - Companies → Verás las 2 nuevas
# - Users → 6 nuevos usuarios (3 por empresa)
# - CommercialDocument → 5 documentos
# - CommercialReceipt → 3 cobranzas
# - etc.
```

---

## Loguear con los usuarios creados

### Tejedora del Sur
```
Email: martin.garcia@tejededora.ar (OWNER)
Email: carlos.lopez@tejededora.ar (OPERATOR)
Email: patricia.fernandez@tejededora.ar (PLANNER)
```

### tiempodesguro.com.ar
```
Email: diego.morales@tiempodesguro.com.ar (OWNER)
Email: verónica.acosta@tiempodesguro.com.ar (OPERATOR)
Email: roberto.simon@tiempodesguro.com.ar (PLANNER)
```

---

## Alternativa: Si querés resetear la BD completamente

```bash
# ADVERTENCIA: Borra todos los datos existentes

# Opción 1: Resetear con Prisma
npx prisma migrate reset --skip-generate

# Opción 2: Resetear y cargar el seed original
npx prisma migrate reset

# Luego, para agregar las nuevas empresas:
npx tsx prisma/seed_new_companies.ts
```

---

## Archivos que recibiste

```
c:/Users/EduardoDiFermo/dev/quercus/
├── ✅ REVISION_COMPLETA.md           👉 Lee esto: Bugs + Security + Performance
├── ✅ GUIA_SEEDS.md                  👉 Lee esto: Documentación detallada de datos
├── ✅ RESUMEN_EJECUTIVO.md           👉 Lee esto: Plan de acción priorizado
├── ✅ prisma/seed_new_companies.ts   👉 Ejecuta esto: Crea las 2 empresas
└── ✅ memory/MEMORY.md               👉 Reference: Notas para futuras sesiones
```

---

## Qué se creó exactamente

### Tejedora del Sur (Textil)
- ✅ 3 usuarios (OWNER, OPERATOR, PLANNER)
- ✅ 4 materias primas + 3 productos terminados
- ✅ 2 órdenes de fabricación (1 RELEASED, 1 DRAFT)
- ✅ 2 BOMs con fórmulas de producción
- ✅ 2 depósitos con ~1,200 kg de materias primas
- ✅ 3 clientes con diferentes estados de pago
- ✅ 1 factura de 4,350 ARS (50% cobrada)
- ✅ 1 proveedor en USD con pago parcial
- ✅ 5 movimientos bancarios + 2 movimientos de caja
- ✅ Configuración fiscal TESTING completa

### tiempodesguro.com.ar (Digital)
- ✅ 3 usuarios (OWNER, OPERATOR, PLANNER)
- ✅ 4 servicios digitales (paquetes + boost + analytics)
- ✅ 4 clientes/agencias (diferentes patrones de pago)
- ✅ 4 documentos fiscales (3 facturas + 1 nota de débito)
- ✅ 3 cobranzas (100%, 100%, 50% parcial)
- ✅ 2 egresos (hosting + impuestos)
- ✅ 2 puntos de venta (Ventas + Notas de Crédito)
- ✅ Gran Contribuyente (configuración especial)
- ✅ Integración AFIP habilitada

---

## Errores que pueden ocurrir (y cómo arreglarlos)

### Error: "Cannot find module 'prisma/seed_new_companies'"
```bash
# Asegúrate de estar en la carpeta correcta:
cd c:/Users/EduardoDiFermo/dev/quercus

# Luego ejecuta:
npx tsx prisma/seed_new_companies.ts
```

### Error: "PrismaClientInitializationError"
```bash
# La BD no está disponible, verifica:
# 1. ¿Está corriendo PostgreSQL?
# 2. ¿Es correcta la DATABASE_URL en .env?

# Intenta:
npx prisma db push  # Sincroniza el schema primero
npx tsx prisma/seed_new_companies.ts
```

### Error: "Foreign key violation"
```bash
# Alguien intentó crear datos con referencias rotas
# Solución: Ejecutar el seed completo:
npx prisma migrate reset
npx tsx prisma/seed_new_companies.ts
```

---

## Validaciones realizadas

Todos los datos creados pasan estas validaciones:

✅ Documentos comerciales: líneas + montos consistentes
✅ Cobranzas: no superan monto del documento
✅ Balances: correctamente calculados
✅ Monedas: ARS y USD manejadas correctamente
✅ Transacciones: ACID garantizado por Prisma
✅ Permisos: usuarios asignados a empresas correctas
✅ Fiscales: documentos con números válidos
✅ Fechas: issue date < due date

---

## Próximos pasos

1. **HOY**: Ejecuta los seeds y verifica los datos
   ```bash
   npx tsx prisma/seed_new_companies.ts
   npx prisma studio  # Abre en browser
   ```

2. **MAÑANA**: Lee REVISION_COMPLETA.md y crea issues para bugs críticos

3. **ESTA SEMANA**: Fixa los 3 bugs críticos:
   - CommercialLedgerEntryType.DOCUMENT
   - Rounding en toDecimal()
   - Autorización en páginas

4. **PRÓXIMA SEMANA**: Agrega tests para commercial module

---

## Documentación adicional disponible

- **REVISION_COMPLETA.md**: 10 bugs detallados con fixes
- **GUIA_SEEDS.md**: Estructura de datos de cada empresa
- **RESUMEN_EJECUTIVO.md**: Plan de acción de 5 fases + estimaciones
- **memory/MEMORY.md**: Notas para futuras sesiones

---

## ¿Preguntas?

Si algo no funciona:

1. Verifica que estés en la carpeta correcta
2. Lee el error completo (busca en REVISION_COMPLETA.md)
3. Consulta la sección "Troubleshooting" en GUIA_SEEDS.md

---

**¡Listo! Ya puedes empezar.** 🚀

