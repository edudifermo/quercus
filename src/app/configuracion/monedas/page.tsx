import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Configuración · Monedas"><PlaceholderModule title="Configuración · Monedas" description="Definición de monedas y políticas de tipo de cambio." /></ErpShell>;
}
