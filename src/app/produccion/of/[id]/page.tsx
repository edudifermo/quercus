import Link from "next/link";
import { getAppContext } from "@/modules/production/auth";
import { getOrderDetail } from "@/modules/production/data";
import { OrderDetailCard } from "@/modules/production/components";

export default async function ProductionOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ company?: string; user?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const context = await getAppContext(resolvedSearchParams);
  const detail = await getOrderDetail(resolvedParams.id, context.company.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 bg-slate-100 px-6 py-8">
      <Link href={`/?company=${context.company.slug}&user=${context.user.email}`} className="text-sm font-semibold text-slate-700 underline">
        ← Volver al tablero de producción
      </Link>
      <OrderDetailCard context={context} detail={detail} />
    </main>
  );
}
