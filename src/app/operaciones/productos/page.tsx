import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Operaciones · Productos / Servicios"><PlaceholderModule title="Operaciones · Productos / Servicios" description="Catálogo de productos, servicios y parametrización operativa." /></ErpShell>;
}
