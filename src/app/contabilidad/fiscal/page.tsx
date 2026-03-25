import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Contabilidad · Configuración fiscal / AFIP-ARCA"><PlaceholderModule title="Contabilidad · Configuración fiscal / AFIP-ARCA" description="Fiscal integrado dentro de Contabilidad (no módulo principal independiente)." /></ErpShell>;
}
