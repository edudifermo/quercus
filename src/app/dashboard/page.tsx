//src/app/dashboard/page.tsx

import Link from "next/link";
import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell } from "@/modules/erp/shell";
import { getProductionDashboard } from "@/modules/production/data";

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  const production = await getProductionDashboard(context.company.id);

  return (
    <ErpShell context={context} title="Dashboard" subtitle="Resumen general, alertas e indicadores. El centro operativo está en los módulos.">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">OF activas</p><p className="text-2xl font-semibold">{(production.statusSummary.RELEASED ?? 0) + (production.statusSummary.IN_PROGRESS ?? 0)}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">Faltantes críticos</p><p className="text-2xl font-semibold">{production.shortages.length}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">OF cerradas</p><p className="text-2xl font-semibold">{production.statusSummary.CLOSED ?? 0}</p></article>
      </section>
      <section id="alertas" className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold">Alertas</h3>
        <ul className="mt-2 list-disc pl-4 text-sm text-slate-700">
          {production.shortages.slice(0, 5).map((row) => <li key={`${row.orderCode}-${row.itemName}`}>OF {row.orderCode} · {row.itemName} pendiente {Number(row.shortageQuantity).toFixed(3)}</li>)}
        </ul>
      </section>
      <section id="kpis" className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
        Operación disponible en módulos: <Link className="underline" href={`/operaciones/of?company=${context.company.slug}&user=${context.user.email}`}>Órdenes de fabricación</Link>, <Link className="underline" href={`/tesoreria?company=${context.company.slug}&user=${context.user.email}`}>Tesorería</Link>, <Link className="underline" href={`/comercial/cta-cte-clientes?company=${context.company.slug}&user=${context.user.email}`}>Cuenta corriente clientes</Link>.
      </section>
    </ErpShell>
  );
}
