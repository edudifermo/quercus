//src/app/tesoreria/page.tsx
import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell } from "@/modules/erp/shell";
import { getTreasuryDashboard } from "@/modules/treasury/data";
import {
  RegisterInvoiceCard,
  RegisterSupplierPaymentCard,
  TreasuryMovementCards,
  TreasurySummaryCards,
  TreasuryTables,
} from "@/modules/treasury/components";

export default async function TreasuryPage({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  const dashboard = await getTreasuryDashboard(context.company.id);

  return (
    <ErpShell context={context} title="Tesorería" subtitle="Tesorería registra cobranzas/pagos e imputaciones; la deuda nace en Comercial y Compras.">
      <div className="space-y-6">
        <TreasurySummaryCards summary={dashboard.summaries} />
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <RegisterInvoiceCard context={{ user: context.user, company: context.company, membership: context.membership }} suppliers={dashboard.suppliers} />
          <RegisterSupplierPaymentCard
            context={{ user: context.user, company: context.company, membership: context.membership }}
            suppliers={dashboard.suppliers}
            cashBoxes={dashboard.cashBoxes}
            bankAccounts={dashboard.bankAccounts}
            openInvoices={dashboard.openInvoices}
          />
        </div>
        <TreasuryMovementCards context={{ user: context.user, company: context.company, membership: context.membership }} suppliers={dashboard.suppliers} cashBoxes={dashboard.cashBoxes} bankAccounts={dashboard.bankAccounts} />
        <TreasuryTables cashMovements={dashboard.cashMovements} bankMovements={dashboard.bankMovements} recentPayments={dashboard.recentPayments} attachments={dashboard.attachments} />
      </div>
    </ErpShell>
  );
}
