import { AppShell } from "@/components/app-shell/app-shell";
import { withTenantQuery } from "@/components/app-shell/query";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";
import {
  getConsolidatedCommercialSummary,
  getConsolidatedCompanyBreakdown,
  getConsolidatedPayablesSummary,
  getConsolidatedReceivablesSummary,
  getConsolidatedTreasurySummary,
  getConsolidationGroupsForUser,
} from "@/modules/consolidation/service";
import { consolidatedFiltersSchema } from "@/modules/consolidation/validators";
import { formatMoney } from "@/modules/treasury/utils";

export default async function ConsolidationReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; user?: string; group?: string; companyFilter?: string; from?: string; to?: string; currency?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const [contextOptions, groups] = await Promise.all([
    listAvailableContexts(),
    getConsolidationGroupsForUser(context.user.id),
  ]);

  if (groups.length === 0) {
    return (
      <AppShell
        context={context}
        contextOptions={contextOptions}
        activeModule="reportes"
        title="Reporte de consolidación"
        subtitle="Vista consolidada no disponible"
        breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Reportes", href: "/reportes" }, { label: "Consolidación" }]}
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">
            El usuario actual no tiene grupos de consolidación activos. Configurá miembros y empresas del grupo para habilitar esta vista.
          </p>
        </section>
      </AppShell>
    );
  }

  const defaultGroupId = resolvedSearchParams?.group ?? groups[0].id;
  const parsedFilters = consolidatedFiltersSchema.parse({
    consolidationGroupId: defaultGroupId,
    companyId: resolvedSearchParams?.companyFilter,
    dateFrom: resolvedSearchParams?.from,
    dateTo: resolvedSearchParams?.to,
    currency:
      resolvedSearchParams?.currency === "ARS" ||
      resolvedSearchParams?.currency === "USD" ||
      resolvedSearchParams?.currency === "EUR"
        ? resolvedSearchParams.currency
        : undefined,
  });

  const queryInput = {
    userId: context.user.id,
    consolidationGroupId: parsedFilters.consolidationGroupId,
    companyId: parsedFilters.companyId,
    dateFrom: parsedFilters.dateFrom,
    dateTo: parsedFilters.dateTo,
    currency: parsedFilters.currency,
  };

  const [treasury, payables, receivables, commercial, breakdown] = await Promise.all([
    getConsolidatedTreasurySummary(queryInput),
    getConsolidatedPayablesSummary(queryInput),
    getConsolidatedReceivablesSummary(queryInput),
    getConsolidatedCommercialSummary(queryInput),
    getConsolidatedCompanyBreakdown(queryInput),
  ]);

  return (
    <AppShell
      context={context}
      contextOptions={contextOptions}
      consolidationGroups={groups}
      activeGroupId={parsedFilters.consolidationGroupId}
      activeModule="reportes"
      title="Reporte de consolidación"
      subtitle="Liquidez, deuda, saldo clientes y ventas para mini holdings"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Reportes", href: "/reportes" }, { label: "Consolidación" }]}
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form method="get" className="grid gap-3 md:grid-cols-5">
          <input type="hidden" name="company" value={context.company.slug} />
          <input type="hidden" name="user" value={context.user.email} />
          <label className="space-y-1 text-sm text-slate-700">
            <span>Grupo</span>
            <select name="group" defaultValue={parsedFilters.consolidationGroupId} className="w-full rounded-xl border border-slate-200 px-3 py-2">
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Empresa</span>
            <select name="companyFilter" defaultValue={parsedFilters.companyId ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-2">
              <option value="">Todas</option>
              {groups
                .find((group) => group.id === parsedFilters.consolidationGroupId)
                ?.companies.map((entry) => (
                  <option key={entry.companyId} value={entry.companyId}>
                    {entry.companyName}
                  </option>
                ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Fecha desde</span>
            <input name="from" type="date" defaultValue={resolvedSearchParams?.from ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Fecha hasta</span>
            <input name="to" type="date" defaultValue={resolvedSearchParams?.to ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="space-y-1 text-sm text-slate-700">
            <span>Moneda</span>
            <select name="currency" defaultValue={parsedFilters.currency ?? ""} className="w-full rounded-xl border border-slate-200 px-3 py-2">
              <option value="">Todas</option>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <button className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white md:col-span-5">Aplicar filtros</button>
        </form>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Liquidez consolidada" value={formatMoney(treasury.consolidated.totalLiquidity, parsedFilters.currency ?? "ARS")} />
        <MetricCard label="Deuda proveedores" value={formatMoney(payables.consolidated.supplierDebt, parsedFilters.currency ?? "ARS")} />
        <MetricCard label="Saldo clientes" value={formatMoney(receivables.consolidated.clientCurrentAccount, parsedFilters.currency ?? "ARS")} />
        <MetricCard label="Ventas período" value={formatMoney(commercial.consolidated.salesTotal, parsedFilters.currency ?? "ARS")} />
        <MetricCard label="Cobranzas período" value={formatMoney(commercial.consolidated.collectionsInPeriod, parsedFilters.currency ?? "ARS")} />
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Resumen por empresa dentro del grupo</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Empresa</th>
                <th className="pb-2">Liquidez</th>
                <th className="pb-2">Deuda prov.</th>
                <th className="pb-2">Saldo clientes</th>
                <th className="pb-2">Ventas</th>
                <th className="pb-2">Cobranzas</th>
                <th className="pb-2">Part. liquidez</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.companyId} className="border-t border-slate-100">
                  <td className="py-3 font-semibold text-slate-900">{row.companyName}</td>
                  <td className="py-3">{formatMoney(row.liquidity, parsedFilters.currency ?? "ARS")}</td>
                  <td className="py-3">{formatMoney(row.payablesDebt, parsedFilters.currency ?? "ARS")}</td>
                  <td className="py-3">{formatMoney(row.receivablesBalance, parsedFilters.currency ?? "ARS")}</td>
                  <td className="py-3">{formatMoney(row.salesInPeriod, parsedFilters.currency ?? "ARS")}</td>
                  <td className="py-3">{formatMoney(row.collectionsInPeriod, parsedFilters.currency ?? "ARS")}</td>
                  <td className="py-3">{row.liquidityParticipationPct.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <a
          href={withTenantQuery("/reportes", { company: context.company.slug, user: context.user.email, group: parsedFilters.consolidationGroupId })}
          className="text-sm font-semibold text-slate-700 underline"
        >
          Volver al centro de reportes
        </a>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}
