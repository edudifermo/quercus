import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Comercial · Facturación"><PlaceholderModule title="Comercial · Facturación" description="Emisión de comprobantes comerciales (FC/NC/ND/RT) con trazabilidad fiscal y contable." /></ErpShell>;
}
