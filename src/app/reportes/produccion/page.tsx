import Link from "next/link";
import { getAppContext } from "@/modules/production/auth";
import { getProductionDashboard } from "@/modules/production/data";
import { formatQty } from "@/modules/production/utils";

export default async function ProductionReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; user?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const dashboard = await getProductionDashboard(context.company.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 bg-slate-100 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Reportes mínimos</p>
          <h1 className="text-3xl font-semibold text-slate-900">Producción resumida</h1>
        </div>
        <Link href={`/?company=${context.company.slug}&user=${context.user.email}`} className="text-sm font-semibold text-slate-700 underline">
          Volver al tablero
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Órdenes por estado</h2>
          <div className="mt-4 space-y-3">
            {Object.entries(dashboard.statusSummary).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <span>{status}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Materias primas faltantes</h2>
          <div className="mt-4 space-y-3">
            {dashboard.shortages.map((shortage) => (
              <div key={`${shortage.orderCode}-${shortage.itemName}`} className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm">
                <strong>{shortage.orderCode}</strong> · {shortage.itemName} · {formatQty(shortage.shortageQuantity)} {shortage.uom}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Consumos teóricos vs reales</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2">OF</th>
                  <th className="pb-2">Teórico</th>
                  <th className="pb-2">Real</th>
                  <th className="pb-2">Var.</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.consumptionVariance.map((row) => (
                  <tr key={row.orderId} className="border-t border-slate-100">
                    <td className="py-3">{row.code}</td>
                    <td className="py-3">{formatQty(row.theoretical)}</td>
                    <td className="py-3">{formatQty(row.actual)}</td>
                    <td className="py-3">{formatQty(row.variance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Producción resumida</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span>Plan total</span>
              <strong>{formatQty(dashboard.outputSummary.planned)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span>Producido total</span>
              <strong>{formatQty(dashboard.outputSummary.produced)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <span>Merma acumulada</span>
              <strong>{formatQty(dashboard.outputSummary.scrap)}</strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
