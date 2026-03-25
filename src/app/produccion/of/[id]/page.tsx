import { AppShell } from "@/components/app-shell/app-shell";
import { getConsolidationGroupsForUser } from "@/modules/consolidation/service";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";
import { getOrderDetail } from "@/modules/production/data";
import { OrderDetailCard } from "@/modules/production/components";

export default async function ProductionOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ company?: string; user?: string; group?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);

  const [contextOptions, detail, consolidationGroups] = await Promise.all([
    listAvailableContexts(),
    getOrderDetail(resolvedParams.id, context.company.id),
    getConsolidationGroupsForUser(context.user.id),
  ]);

  return (
    <AppShell
      context={context}
      contextOptions={contextOptions}
      consolidationGroups={consolidationGroups}
      activeGroupId={resolvedSearchParams?.group}
      activeModule="produccion"
      title={`Orden ${detail.order.code}`}
      subtitle="Detalle operativo de orden de fabricación"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Producción", href: "/produccion" }, { label: detail.order.code }]}
    >
      <OrderDetailCard context={context} detail={detail} />
    </AppShell>
  );
}
