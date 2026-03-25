import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Operaciones · Cuenta corriente proveedores"><PlaceholderModule title="Operaciones · Cuenta corriente proveedores" description="Modelo obligatorio de comprobantes + imputaciones para proveedores." /></ErpShell>;
}
