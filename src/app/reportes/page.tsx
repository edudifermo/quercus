//src/app/reportes/page.tsx

import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell, PlaceholderModule } from "@/modules/erp/shell";

export default async function Page({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string }> }) {
  const context = await resolveActiveContext(await searchParams);
  return <ErpShell context={context} title="Reportes · Estándar"><PlaceholderModule title="Reportes · Estándar" description="Panel de reportes estándar operativos, comerciales, financieros y contables." /></ErpShell>;
}
