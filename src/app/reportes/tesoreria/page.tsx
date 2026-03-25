import { AppShell } from "@/components/app-shell/app-shell";
import { getConsolidationGroupsForUser } from "@/modules/consolidation/service";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";
import { getTreasuryReports } from "@/modules/treasury/data";
import type { TreasuryReportsData } from "@/modules/treasury/data";
import { formatDate, formatMoney } from "@/modules/treasury/utils";

export default async function TreasuryReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; user?: string; group?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const [contextOptions, reports, consolidationGroups] = await Promise.all([
    listAvailableContexts(),
    getTreasuryReports(context.company.id),
    getConsolidationGroupsForUser(context.user.id),
  ]);

  const currentAccounts = Object.entries(reports.currentAccount) as Array<
    [string, TreasuryReportsData["currentAccount"][string]]
  >;
  const dailyCash = Object.entries(reports.dailyCash) as Array<
    [string, TreasuryReportsData["dailyCash"][string]]
  >;

  return (
    <AppShell
      context={context}
      contextOptions={contextOptions}
      consolidationGroups={consolidationGroups}
      activeGroupId={resolvedSearchParams?.group}
      activeModule="reportes"
      title="Reporte de Tesorería"
      subtitle="Cuenta corriente de proveedores, conciliación y flujo diario"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Reportes", href: "/reportes" }, { label: "Tesorería" }]}
    >
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Cuenta corriente proveedor</h2>
          <div className="mt-4 space-y-4">
            {currentAccounts.map(([supplierId, account]) => (
              <div key={supplierId} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{account.supplierName}</p>
                    <p className="text-sm text-slate-600">Saldo actual {formatMoney(account.balance)}</p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">{account.lines.length} movimientos</span>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  {account.lines.slice(-4).map((line) => (
                    <div key={line.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                      <div>
                        <p className="font-medium text-slate-900">{line.description}</p>
                        <p className="text-xs text-slate-500">{formatDate(line.occurredAt)} · {line.referenceType}</p>
                      </div>
                      <strong>{formatMoney(line.balanceAfter, line.currency)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Caja diaria</h2>
          <div className="mt-4 space-y-3">
            {dailyCash.map(([dayBox, summary]) => (
              <div key={dayBox} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div>
                  <strong className="text-slate-900">{dayBox}</strong>
                  <p className="text-slate-500">Ingresos {formatMoney(summary.inflow)} · Egresos {formatMoney(summary.outflow)}</p>
                </div>
                <span className={`font-semibold ${summary.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{formatMoney(summary.net)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Movimientos bancarios</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2">Fecha</th>
                  <th className="pb-2">Cuenta</th>
                  <th className="pb-2">Detalle</th>
                  <th className="pb-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reports.bankMovements.map((movement) => (
                  <tr key={movement.id} className="border-t border-slate-100">
                    <td className="py-3">{formatDate(movement.movementDate)}</td>
                    <td className="py-3">{movement.bankAccount.bankName} · {movement.bankAccount.accountName}</td>
                    <td className="py-3">
                      <div className="font-semibold text-slate-900">{movement.description}</div>
                      <div className="text-xs text-slate-500">{formatMoney(movement.amount, movement.currency)}</div>
                    </td>
                    <td className="py-3">{movement.isReconciled ? "Conciliado" : "Pendiente"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pagos por período</h2>
          <div className="mt-4 space-y-3">
            {reports.payments.map((payment) => (
              <div key={payment.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-slate-900">{payment.paymentNumber}</strong> · {payment.supplier.name}
                    <p className="text-slate-500">{formatDate(payment.paymentDate)} · {payment.paymentMethod}</p>
                  </div>
                  <strong>{formatMoney(payment.totalAmount, payment.currency)}</strong>
                </div>
                <p className="mt-2 text-xs text-slate-500">{payment.items.map((item) => item.supplierInvoice?.documentNumber ?? item.description ?? "Sin detalle").join(" · ")}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Conciliación base preparada</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Cuenta</th>
                <th className="pb-2">Referencia</th>
                <th className="pb-2">Importe firmado</th>
                <th className="pb-2">Conciliado</th>
              </tr>
            </thead>
            <tbody>
              {reports.reconciliationBase.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="py-3">{formatDate(item.date)}</td>
                  <td className="py-3">{item.bankAccount}</td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-900">{item.description}</div>
                    <div className="text-xs text-slate-500">{item.externalReference ?? item.reference}</div>
                  </td>
                  <td className="py-3">{formatMoney(item.amount)}</td>
                  <td className="py-3">{item.isReconciled ? "Sí" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
