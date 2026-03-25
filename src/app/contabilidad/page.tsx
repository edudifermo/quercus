import { AppShell } from "@/components/app-shell/app-shell";
import { ModulePlaceholder } from "@/components/app-shell/module-placeholder";
import { getConsolidationGroupsForUser } from "@/modules/consolidation/service";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams?: Promise<{ company?: string; user?: string; group?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const [contextOptions, consolidationGroups] = await Promise.all([
    listAvailableContexts(),
    getConsolidationGroupsForUser(context.user.id),
  ]);

  const tenantQuery = { company: context.company.slug, user: context.user.email, group: resolvedSearchParams?.group };

  return (
    <AppShell
      context={context}
      contextOptions={contextOptions}
      consolidationGroups={consolidationGroups}
      activeGroupId={resolvedSearchParams?.group}
      activeModule="contabilidad"
      title="Contabilidad"
      subtitle="Base contable multiempresa con proyección de escalamiento"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Contabilidad" }]}
    >
      <ModulePlaceholder
        moduleName="Módulo contable"
        description="Se habilita un entrypoint coherente dentro del shell ERP sin reescribir la lógica contable existente."
        nextSteps={[
          "Exponer plan de cuentas y diarios por empresa activa.",
          "Incorporar balance de sumas y saldos en reportes.",
          "Conectar asientos automáticos desde producción, comercial y tesorería.",
        ]}
        tenantQuery={tenantQuery}
        quickLinks={[{ label: "Ver dashboard", href: "/dashboard" }, { label: "Centro de reportes", href: "/reportes" }]}
      />
    </AppShell>
  );
}
