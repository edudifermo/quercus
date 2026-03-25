import { AppShell } from "@/components/app-shell/app-shell";
import { ModulePlaceholder } from "@/components/app-shell/module-placeholder";
import { getConsolidationGroupsForUser } from "@/modules/consolidation/service";
import { getAppContext, listAvailableContexts } from "@/modules/production/auth";

export default async function FiscalPage({
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
      activeModule="fiscal"
      title="Fiscal"
      subtitle="Obligaciones fiscales y trazabilidad por empresa"
      breadcrumbs={[{ label: "Quercus", href: "/dashboard" }, { label: "Fiscal" }]}
    >
      <ModulePlaceholder
        moduleName="Módulo fiscal"
        description="Se incorpora un punto de acceso claro para la capa fiscal base ya modelada, dentro de una navegación ERP consistente."
        nextSteps={[
          "Publicar padrón impositivo por empresa.",
          "Agregar calendario fiscal y vencimientos en dashboard.",
          "Integrar reportes de impuestos en el centro de reportes.",
        ]}
        tenantQuery={tenantQuery}
        quickLinks={[{ label: "Configuración", href: "/configuracion" }]}
      />
    </AppShell>
  );
}
