import { getAppContext } from "@/modules/production/auth";
import { getTreasuryDashboard } from "@/modules/treasury/data";
import {
  RegisterInvoiceCard,
  RegisterSupplierPaymentCard,
  TreasuryMovementCards,
  TreasurySummaryCards,
  TreasuryTables,
  TreasuryTopBar,
} from "@/modules/treasury/components";

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; user?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const dashboard = await getTreasuryDashboard(context.company.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 bg-slate-100 px-6 py-8">
      <TreasuryTopBar context={context} />
      <TreasurySummaryCards summary={dashboard.summaries} />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <RegisterInvoiceCard context={context} suppliers={dashboard.suppliers} />
        <RegisterSupplierPaymentCard
          context={context}
          suppliers={dashboard.suppliers}
          cashBoxes={dashboard.cashBoxes}
          bankAccounts={dashboard.bankAccounts}
          openInvoices={dashboard.openInvoices}
        />
      </div>
      <TreasuryMovementCards
        context={context}
        suppliers={dashboard.suppliers}
        cashBoxes={dashboard.cashBoxes}
        bankAccounts={dashboard.bankAccounts}
      />
      <TreasuryTables
        cashMovements={dashboard.cashMovements}
        bankMovements={dashboard.bankMovements}
        recentPayments={dashboard.recentPayments}
        attachments={dashboard.attachments}
      />
    </main>
  );
}
