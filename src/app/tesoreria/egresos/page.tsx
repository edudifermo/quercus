import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Tesorería · Egresos / Órdenes de pago"><PlaceholderModule title="Tesorería · Egresos / Órdenes de pago" description="Registro de pagos sin generación de deuda." /></ErpShell>;
}
