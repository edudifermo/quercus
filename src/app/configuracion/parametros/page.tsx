import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Configuración · Parámetros"><PlaceholderModule title="Configuración · Parámetros" description="Parámetros generales ERP por tenant." /></ErpShell>;
}
