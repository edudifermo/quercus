import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Tesorería · Bancos"><PlaceholderModule title="Tesorería · Bancos" description="Movimientos bancarios, conciliación y consolidación." /></ErpShell>;
}
