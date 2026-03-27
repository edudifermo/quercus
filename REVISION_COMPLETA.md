# Revisión Completa del Proyecto Quercus ERP

## Fecha: 26/03/2026
## Estado: Validación Funcional Post-Codex

---

## 1. ANÁLISIS DE ARQUITECTURA ✅

### Fortalezas
✅ **Domain-Driven Design**: Estructura modular con bounded contexts bien definidos
✅ **Type Safety**: Zod + TypeScript para validación exhaustiva
✅ **Type-Safe ORM**: Prisma con tipos generados automáticamente
✅ **Transaccionalidad**: Uso correcto de `prisma.$transaction` para consistencia
✅ **Multi-empresa**: Sistema de contexto y permisos implementado
✅ **Validación de Negocios**: Separación clara entre validaciones de modelo y de lógica

### Mejoras Necesarias
⚠️ **Falta de capas**: No hay middleware de autorización en páginas
⚠️ **Error Handling**: Excepciones genéricas, sin diferenciación de tipos
⚠️ **Logging**: No hay trazabilidad de operaciones críticas
⚠️ **Testing**: No hay cobertura de tests visible

---

## 2. BUGS IDENTIFICADOS 🐛

### Críticos
1. **Commercial Service - Line 152**: Uso erróneo de `CommercialLedgerEntryType.DOCUMENT`
   ```typescript
   // Problema: El enum no tiene "DOCUMENT", debería ser otro valor
   entryType: CommercialLedgerEntryType.DOCUMENT,  // ❌ No existe este valor
   ```
   **Fix**: Verificar qué valores válidos tiene el enum y usar el correcto

2. **Decimal Rounding Issues** (commercial/service.ts líneas 22-24)
   ```typescript
   function toDecimal(value: number) {
     return new Prisma.Decimal(value.toFixed(2));  // ⚠️ Riesgo de pérdida de precisión
   }
   ```
   **Riesgo**: `toFixed(2)` puede perder precisión en operaciones
   **Fix**: Usar operaciones en enteros (centavos) y convertir solo al persistir

3. **Cálculo de Línea** (commercial/service.ts línea 126)
   ```typescript
   const subtotalAmount = line.quantity * line.unitPrice - line.discountAmount;  // ❌ Sin redondeo
   ```
   **Riesgo**: Errores acumulativos de punto flotante
   **Fix**: Usar `round2()` antes de asignar

4. **Validación Incompleta de Moneda** (commercial/service.ts línea 341-343)
   ```typescript
   if (document.currency !== receipt.currency) {
     throw new Error("No se pueden mezclar monedas...");
   }
   ```
   **Problema**: No valida exchange rates inconsistentes
   **Fix**: Agregar validación de tasas de cambio

### Altos
5. **Falta de Soft Delete Verification** (commercial/service.ts línea 94)
   ```typescript
   select: { id: true, isActive: true, deletedAt: true }
   ```
   **Problema**: Las queries no filtran `deletedAt` implícitamente
   **Fix**: Agregar scope global o validar explícitamente en cada query

6. **Consulta SQL O(n)** (commercial/service.ts línea 336)
   ```typescript
   const document = documents.find((candidate) => candidate.id === row.documentId);  // O(n)
   ```
   **Mejor**: Ya existe `documentById` map en línea 209, reutilizar
   **Fix**: Cambiar a `documentById.get(row.documentId)`

7. **Query N+1 Potencial** (commercial/service.ts línea 444-450)
   ```typescript
   include: { receipt: true, document: true }  // ❌ Innecesarios si solo se usan IDs
   ```
   **Fix**: Usar `select` en lugar de `include` para reducir payload

### Medios
8. **Falta de Validación de Cantidades Negativas** (commercial/types.ts línea 33)
   ```typescript
   quantity: z.number().positive(),  // ✅ Bueno
   // Pero no hay validación en línea 35:
   discountAmount: z.number().min(0).default(0),  // ⚠️ ¿Mayor que subtotal?
   ```
   **Fix**: Agregar validación que descuento no supere subtotal

9. **Errores Genéricos** (Múltiples archivos)
   ```typescript
   throw new Error("No existe el cliente indicado...");  // ❌ Sin categoría
   ```
   **Fix**: Crear enums de errores o custom error classes

10. **Falta de Auditoría** (commercial/service.ts)
    **Problema**: No se registra quién/cuándo hizo cambios en accounts receivable
    **Fix**: Agregar `createdById` y `updatedById` con timestamp en entradas

---

## 3. PROBLEMAS DE SEGURIDAD 🔐

### Críticos
1. **Falta de Autorización en Páginas**
   - Las páginas usan `ActiveContext` pero no validan permisos
   - Problema: Un usuario VIEWER podría forzar URL a /comercial/facturacion
   - **Fix**: Implementar middleware de autorización en `resolveActiveContext`

2. **Inyección de IDs** (commercial/validators.ts)
   ```typescript
   const client = await tx.client.findFirst({
     where: { id: draft.clientId, companyId: draft.companyId }
   });
   // ✅ Correcto: valida companyId + clientId
   ```
   - ✅ Bien implementado, pero no es consistente en todo el código

### Altos
3. **Information Disclosure** (commercial/service.ts línea 206-207)
   ```typescript
   throw new Error("Alguno de los comprobantes aplicados no existe o no pertenece...");
   ```
   - Problema: Reveal si comprobante existe pero no pertenece
   - **Fix**: Mensaje genérico sin detallar

4. **Falta de Rate Limiting**
   - Las operaciones de creación/modificación no tienen throttling
   - **Fix**: Implementar rate limit en API layer

5. **Configuración Fiscal con Credenciales Fake en Seed**
   ```typescript
   privateKeyReference: "vault://quercus/demo-key",
   ```
   - ✅ Bien: No hardcodear, pero verificar en producción

### Medios
6. **Validación de Email Débil** (commercial/types.ts línea 18)
   ```typescript
   email: z.string().trim().email().max(160).optional(),
   ```
   - ✅ Zod email es razonable, pero no hay verificación de duplicados
   - **Fix**: Agregar unique constraint en Prisma schema

7. **XSS en Campos de Texto**
   - Los campos `notes`, `description` podrían contener HTML
   - **Fix**: Sanitizar en frontend o usar content-security-policy

---

## 4. PROBLEMAS DE PERFORMANCE 📊

### Críticos
1. **Queries sin Índices**
   ```prisma
   // En schema.prisma - Faltan índices frecuentes:
   @@index([companyId, clientId, occurredAt])  // commercialLedgerEntry
   @@index([companyId, status])                // commercialDocument
   @@index([companyId, createdAt])             // cualquier modelo
   ```

2. **Cartesian Product** (commercial/service.ts línea 442-451)
   ```typescript
   const [client, documents, receipts, applications] = await Promise.all([...])
   // applications.findMany({ include: { receipt, document } })
   // ❌ Si hay 100 receipts x 100 documents, cartesian product en memoria
   ```
   **Fix**: Usar queries separadas o agregación

### Altos
3. **N+1 Pattern** en actualización de documentos (línea 254-260)
   ```typescript
   for (const application of draft.applications) {
     await tx.commercialDocument.update({...})  // O(n) queries
   }
   ```
   **Fix**: Usar `updateMany` cuando sea posible

4. **Falta de Paginación**
   - Las queries de `findMany` sin límite
   - **Fix**: Default limit en queries públicas

### Medios
5. **Balance Recalculado en Cada Operación** (línea 45-49)
   ```typescript
   const lastEntry = await tx.commercialLedgerEntry.findFirst({
     orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }]
   });
   ```
   - ⚠️ Ineficiente si hay 10k+ movimientos
   - **Fix**: Desnormalizar `currentBalance` en Client (ya existe, ✅)

---

## 5. SUGERENCIAS DE MEJORA 💡

### Arquitectura
1. **Middleware de Autorización**
   ```typescript
   // Crear middleware que valide permisos antes de resolver contexto
   export async function validateUserPermission(
     user: AuthUser,
     company: string,
     resource: string,
     action: string
   ): Promise<boolean>
   ```

2. **Error Hierarchy**
   ```typescript
   class ApplicationError extends Error {
     constructor(message: string, public code: string, public status: number) {}
   }
   class ValidationError extends ApplicationError {...}
   class AuthorizationError extends ApplicationError {...}
   ```

3. **Audit Trail**
   ```typescript
   // Agregar a cada transacción
   await tx.auditLog.create({
     userId, action, resourceType, resourceId, changes, timestamp
   });
   ```

### Base de Datos
4. **Índices Faltantes**
   ```prisma
   model CommercialDocument {
     @@index([companyId, status, issueDate])
     @@index([clientId, issueDate])
     @@index([createdAt]) // Para auditoría
   }
   ```

5. **Constraints Mejorados**
   ```prisma
   model Client {
     email String? @db.VarChar(160)  // Agregar unique con isActive filter
     @@unique([companyId, taxId], where: { isActive: true })
   }
   ```

6. **Vistas Materializadas** (para cálculos)
   ```sql
   CREATE MATERIALIZED VIEW client_balance AS
   SELECT companyId, clientId, SUM(debitAmount) - SUM(creditAmount) as balance
   FROM ComercialLedgerEntry
   GROUP BY companyId, clientId;
   ```

### Código
7. **Consolidar Funciones de Redondeo**
   ```typescript
   // Crear lib/decimal.ts
   export function round(value: number, decimals = 2) {
     return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
   }
   ```

8. **Validadores Reutilizables**
   ```typescript
   // Crear validators/commercial.ts
   export const clientCodeSchema = z.string().regex(/^[A-Z0-9]{3,8}$/);
   export const documentNumberSchema = z.string().regex(/^[A-Z0-9-]{5,20}$/);
   ```

9. **Testing Structure**
   ```typescript
   // Agregar tests/modules/commercial/service.test.ts
   describe('createCommercialDocument', () => {
     it('should reject negative subtotals')
     it('should enforce currency consistency')
     // ... 20+ test cases
   });
   ```

### DevOps
10. **Environment Validation**
    ```typescript
    // Al startup, verificar que todas las variables críticas existen
    validateEnvVariables(['DATABASE_URL', 'JWT_SECRET', 'NEXT_PUBLIC_API_URL'])
    ```

---

## 6. ANÁLISIS DE MÓDULOS

### ✅ COMMERCIAL (Bien Implementado)
- Validación exhaustiva de documentos
- Transacciones ACID correctas
- Cálculos de balances bien diseñados
- **Mejora**: Agregar soporte para retenciones/percepciones fiscales

### ⚠️ PRODUCTION (Parcialmente Implementado)
- Solo tiene `actions.ts`, `data.ts`, `utils.ts`
- Falta `service.ts` con lógica de negocio
- No hay validadores
- **Crítico**: Implementar orden de fabricación con validaciones

### ⚠️ TREASURY (Parcialmente Implementado)
- Solo tiene `actions.ts`, `data.ts`, `storage.ts`, `utils.ts`
- Falta `service.ts` con lógica transaccional
- No hay manejo de reconciliación
- **Crítico**: Implementar movimientos de caja/banco con auditoría

### ✅ ACCOUNTING (Bien Iniciado)
- Sistema de posting rules flexible
- Soporta múltiples planes de cuentas
- **Mejora**: Implementar cierre de período

### ✅ FISCAL (Bien Implementado)
- Configuración AFIP centralizada
- Point of sale con estados
- Log de procesamiento
- **Mejora**: Integración real con WSFE para producción

---

## 7. SUMMARY DE ACCIÓN

| Severidad | Cantidad | Categoría |
|-----------|----------|-----------|
| 🔴 Crítico | 4 | Bugs de lógica + Autorización |
| 🟠 Alto | 6 | Security + Performance |
| 🟡 Medio | 8 | Code quality + Features |

**Próximos Pasos**:
1. ✅ Crear seeds para ambas empresas
2. 🔴 Fijar bugs críticos (EntryType enum, rounding)
3. 🟠 Implementar autorización middleware
4. 🟡 Agregar índices a la BD
5. 📝 Crear suite de test para módulos core

---

## 8. NOTAS IMPORTANTES

- El proyecto está bien estructurado para escala
- DDD + TypeScript es una decisión sólida
- La mayor parte de issues son **agregables** (no requieren rewrite)
- Seed actual es demostración básica, necesita ejemplos realistas
- Base fiscal y tesorería necesitan más desarrollo

