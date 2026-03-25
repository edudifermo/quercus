import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Comercial · Clientes"><PlaceholderModule title="Comercial · Clientes" description="ABM y ficha navegable de clientes con acceso directo a comprobantes y cuenta corriente." /></ErpShell>;
}
