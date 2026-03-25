import { AppShell } from "@/components/app-shell/app-shell";
import { getConsolidationGroupsForUser } from "@/modules/consolidation/service";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";
import { getProductionDashboard } from "@/modules/production/data";
import {
  ConsumptionVsTheoretical,
  CreateOrderCard,
  InventoryTable,
  OrdersTable,
  ShortagesCard,
  SummaryCards,
} from "@/modules/production/components";

export default async function ProductionPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; user?: string; group?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const [contextOptions, dashboard, consolidationGroups] = await Promise.all([
    listAvailableContexts(),
    getProductionDashboard(context.company.id),
    getConsolidationGroupsForUser(context.user.id),
  ]);

  return (
    <AppShell
      context={context}
      contextOptions={contextOptions}
      consolidationGroups={consolidationGroups}
      activeGroupId={resolvedSearchParams?.group}
      activeModule="produccion"
      title="Producción"
      subtitle="Órdenes de fabricación, faltantes y control de consumos"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Producción" }]}
    >
      <SummaryCards
        statusSummary={dashboard.statusSummary}
        outputSummary={dashboard.outputSummary}
        shortageCount={dashboard.shortages.length}
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <CreateOrderCard context={context} boms={dashboard.boms} warehouses={dashboard.warehouses} />
        <ShortagesCard shortages={dashboard.shortages} />
      </div>
      <div className="mt-6">
        <OrdersTable context={context} orders={dashboard.orders} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ConsumptionVsTheoretical rows={dashboard.consumptionVariance} />
        <InventoryTable inventory={dashboard.inventory} />
      </div>
    </AppShell>
  );
}
