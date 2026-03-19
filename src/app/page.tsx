import { getAppContext, listAvailableContexts } from "@/modules/production/auth";
import { getProductionDashboard } from "@/modules/production/data";
import {
  ConsumptionVsTheoretical,
  CreateOrderCard,
  InventoryTable,
  OrdersTable,
  ShortagesCard,
  SummaryCards,
  TopBar,
} from "@/modules/production/components";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; user?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const options = await listAvailableContexts();
  const dashboard = await getProductionDashboard(context.company.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 bg-slate-100 px-6 py-8">
      <TopBar context={context} options={options} />
      <SummaryCards
        statusSummary={dashboard.statusSummary}
        outputSummary={dashboard.outputSummary}
        shortageCount={dashboard.shortages.length}
      />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <CreateOrderCard context={context} boms={dashboard.boms} warehouses={dashboard.warehouses} />
        <ShortagesCard shortages={dashboard.shortages} />
      </div>
      <OrdersTable context={context} orders={dashboard.orders} />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ConsumptionVsTheoretical rows={dashboard.consumptionVariance} />
        <InventoryTable inventory={dashboard.inventory} />
      </div>
    </main>
  );
}
