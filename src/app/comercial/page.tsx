import { AppShell } from "@/components/app-shell/app-shell";
import { ModulePlaceholder } from "@/components/app-shell/module-placeholder";
import { getConsolidationGroupsForUser } from "@/modules/consolidation/service";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";

export default async function CommercialPage({
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
      activeModule="comercial"
      title="Comercial"
      subtitle="Clientes, documentos y cobranzas por empresa"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Comercial" }]}
    >
      <ModulePlaceholder
        moduleName="Módulo comercial"
        description="La base comercial ya existe en backend. Esta vista organiza el acceso ERP y prepara la navegación por clientes, documentos y cobranzas."
        nextSteps={[
          "Agregar tablero con KPIs de facturación y cobranzas.",
          "Publicar listado de documentos comerciales con filtros por estado.",
          "Conectar gestión de clientes y límites de crédito desde configuración.",
        ]}
        tenantQuery={tenantQuery}
        quickLinks={[{ label: "Ir a reportes", href: "/reportes" }]}
      />
    </AppShell>
  );
}
