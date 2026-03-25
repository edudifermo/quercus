import { AppShell } from "@/components/app-shell/app-shell";
import { ModulePlaceholder } from "@/components/app-shell/module-placeholder";
import { getConsolidationGroupsForUser } from "@/modules/consolidation/service";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";

export default async function ConfigurationPage({
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
      activeModule="configuracion"
      title="Configuración"
      subtitle="Empresas, usuarios, parámetros funcionales y gobierno ERP"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Configuración" }]}
    >
      <ModulePlaceholder
        moduleName="Centro de configuración"
        description="Concentrador para administración multiempresa y evolución de parámetros contables/fiscales sin navegación ambigua."
        nextSteps={[
          "Gestionar memberships y roles por empresa.",
          "Configurar grupos de consolidación y miembros habilitados.",
          "Definir parámetros contables/fiscales por tenant.",
        ]}
        tenantQuery={tenantQuery}
      />
    </AppShell>
  );
}
