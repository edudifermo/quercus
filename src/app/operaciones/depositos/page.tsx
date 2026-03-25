import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Operaciones · Depósitos"><PlaceholderModule title="Operaciones · Depósitos" description="Configuración de depósitos y circuitos de almacenamiento." /></ErpShell>;
}
