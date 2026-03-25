import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell } from "@/modules/erp/shell";
import { getProductionDashboard } from "@/modules/production/data";
import { OrdersTable } from "@/modules/production/components";

export default async function WorkOrdersPage({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  const dashboard = await getProductionDashboard(context.company.id);

  return (
    <ErpShell context={context} title="Operaciones · Órdenes de fabricación" subtitle="Navegación operativa desde el menú principal, no desde un dashboard aislado.">
      <OrdersTable
        context={{ user: context.user, company: context.company, membership: context.membership }}
        orders={dashboard.orders}
      />
    </ErpShell>
  );
}
