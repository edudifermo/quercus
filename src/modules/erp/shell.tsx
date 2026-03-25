import Link from "next/link";
import type { ReactNode } from "react";
import type { ActiveContext } from "@/modules/app-context/service";

type MenuSection = { label: string; href?: string; items?: Array<{ label: string; href: string }> };

export const ERP_MENU: MenuSection[] = [
  { label: "Dashboard", items: [{ label: "Resumen general", href: "/dashboard" }, { label: "Alertas", href: "/dashboard#alertas" }, { label: "Indicadores clave", href: "/dashboard#kpis" }] },
  { label: "Comercial", items: [{ label: "Clientes", href: "/comercial/clientes" }, { label: "Facturación", href: "/comercial/facturacion" }, { label: "Cuenta corriente clientes", href: "/comercial/cta-cte-clientes" }, { label: "Cobranzas", href: "/tesoreria/ingresos" }] },
  { label: "Operaciones", items: [{ label: "Proveedores", href: "/operaciones/proveedores" }, { label: "Compras", href: "/operaciones/compras" }, { label: "Cuenta corriente proveedores", href: "/operaciones/cta-cte-proveedores" }, { label: "Productos / Servicios", href: "/operaciones/productos" }, { label: "Composiciones", href: "/operaciones/composiciones" }, { label: "Depósitos", href: "/operaciones/depositos" }, { label: "Stock", href: "/operaciones/stock" }, { label: "Órdenes de fabricación", href: "/operaciones/of" }, { label: "Procesos", href: "/operaciones/procesos" }, { label: "Logística", href: "/operaciones/logistica" }] },
  { label: "Tesorería", items: [{ label: "Ingresos / cobranzas", href: "/tesoreria/ingresos" }, { label: "Egresos / órdenes de pago", href: "/tesoreria/egresos" }, { label: "Caja", href: "/tesoreria/caja" }, { label: "Bancos", href: "/tesoreria/bancos" }, { label: "Cash flow histórico", href: "/reportes/tesoreria" }, { label: "Cash flow proyectado", href: "/tesoreria/proyeccion" }] },
  { label: "Contabilidad", items: [{ label: "Plan de cuentas", href: "/contabilidad/plan" }, { label: "Asientos", href: "/contabilidad/asientos" }, { label: "Libro mayor", href: "/contabilidad/mayor" }, { label: "Consultas contables", href: "/contabilidad/consultas" }, { label: "Configuración fiscal / AFIP-ARCA", href: "/contabilidad/fiscal" }] },
  { label: "Reportes", items: [{ label: "Reportes estándar", href: "/reportes" }, { label: "Reportes personalizados / configurables", href: "/reportes/personalizados" }, { label: "Consolidación multiempresa", href: "/reportes/consolidacion" }] },
  { label: "Configuración", items: [{ label: "Empresas", href: "/configuracion/empresas" }, { label: "Usuarios", href: "/configuracion/usuarios" }, { label: "Roles", href: "/configuracion/roles" }, { label: "Parámetros", href: "/configuracion/parametros" }, { label: "Monedas", href: "/configuracion/monedas" }, { label: "Impuestos", href: "/configuracion/impuestos" }, { label: "Holdings / grupos", href: "/configuracion/holdings" }] },
];

function withContext(href: string, context: ActiveContext) {
  const query = new URLSearchParams({ company: context.company.slug, user: context.user.email });
  if (context.consolidation) query.set("group", context.consolidation.id);
  return `${href}?${query.toString()}`;
}

export function ErpShell({ context, title, subtitle, children }: { context: ActiveContext; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[300px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-4 xl:p-5">
          <h1 className="text-xl font-semibold">Quercus ERP</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">Multiempresa</p>
          <nav className="mt-6 space-y-4">
            {ERP_MENU.map((section) => (
              <section key={section.label}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</h2>
                <ul className="space-y-1">
                  {section.items?.map((item) => (
                    <li key={item.href}>
                      <Link href={withContext(item.href, context)} className="block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </aside>

        <section className="flex flex-col">
          <header className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Empresa activa</p>
                <p className="text-sm font-semibold">{context.company.name}</p>
                {context.consolidation ? <p className="text-xs text-violet-700">Grupo consolidado: {context.consolidation.name}</p> : null}
              </div>
              <div className="text-right text-sm">
                <p><strong>{context.user.name}</strong> ({context.user.email})</p>
                <p>Rol: <strong>{context.membership.role}</strong></p>
                {context.availableCompanies > 1 ? (
                  <Link className="text-xs text-slate-600 underline" href="/acceso">Cambiar empresa/contexto</Link>
                ) : null}
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-semibold">{title}</h2>
              {subtitle ? <p className="text-sm text-slate-600">{subtitle}</p> : null}
            </div>
          </header>
          <div className="p-5">{children}</div>
        </section>
      </div>
    </main>
  );
}

export function PlaceholderModule({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <p className="mt-3 text-xs text-amber-700">Pendiente de implementación operativa completa. Placeholder honesto para navegación ERP.</p>
    </section>
  );
}
