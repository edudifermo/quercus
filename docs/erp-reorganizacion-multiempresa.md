# Quercus ERP · Reorganización funcional multiempresa

## Estructura implementada
- Flujo de ingreso por `/acceso` con selección de usuario + empresa y, si existe, grupo de consolidación.
- Entrada por `/dashboard` luego de contexto activo.
- App shell ERP con sidebar jerárquico, topbar contextual y visibilidad de empresa, usuario, rol y grupo activo.
- Dashboard subordinado (resumen/alertas/KPI), con operación en módulos.
- Fiscal reubicado en `Contabilidad > Configuración fiscal / AFIP-ARCA`.

## Decisiones tomadas
- Se evita simular auth enterprise inexistente: el selector usa memberships reales desde base.
- Si no hay grupos para el usuario, no se muestra contexto de consolidación en el header.
- Se priorizó navegación ERP completa con placeholders honestos en secciones aún no terminadas.

## Cuenta corriente (modelo obligatorio)
- Se incorporó un servicio de cuenta corriente comercial en formato **comprobantes + imputaciones**.
- La salida devuelve registros con identidad de comprobante y referencia imputada en cada fila.
- El saldo se recalcula por suma natural de importes de comprobantes (sin tabla simplificada de saldo para consulta).
- La pantalla `Comercial > Cuenta corriente clientes` ya consume este modelo.

## Pendientes
- Extender el mismo formato de comprobantes+imputaciones a proveedores con UI operativa equivalente.
- Homologar numeración de tipo/letra/punto de venta para todos los comprobantes con catálogos parametrizables.
- Migrar progresivamente toda la lógica de ledger histórico al modelo uniforme de comprobantes referenciados.
