import Link from "next/link";
import { MembershipRole, ProductionOrderStatus } from "@prisma/client";
import type { AppContext } from "@/modules/production/auth";
import { closeProductionOrder, createProductionOrder, registerConsumption } from "@/modules/production/actions";
import { formatCost, formatQty, toNumber } from "@/modules/production/utils";

function badgeClass(status: ProductionOrderStatus) {
  switch (status) {
    case "CLOSED":
      return "bg-emerald-100 text-emerald-800";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800";
    case "RELEASED":
      return "bg-sky-100 text-sky-800";
    default:
      return "bg-rose-100 text-rose-800";
  }
}

export function TopBar({
  context,
  options,
}: {
  context: AppContext;
  options: Array<{
    userEmail: string;
    userName: string;
    companySlug: string;
    companyName: string;
    role: MembershipRole;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Producción base
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Composición + OF + consumos + faltantes
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Tenant activo: <strong>{context.company.name}</strong> · Usuario: <strong>{context.user.name}</strong> · Rol: <strong>{context.membership.role}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {options.map((option) => {
            const active =
              option.userEmail === context.user.email && option.companySlug === context.company.slug;
            return (
              <Link
                key={`${option.companySlug}-${option.userEmail}`}
                href={`/?company=${option.companySlug}&user=${option.userEmail}`}
                className={`rounded-full border px-3 py-2 ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {option.companyName} · {option.userName}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function SummaryCards({
  statusSummary,
  outputSummary,
  shortageCount,
}: {
  statusSummary: Record<string, number>;
  outputSummary: { planned: number; produced: number; scrap: number };
  shortageCount: number;
}) {
  const cards = [
    { label: "OF cerradas", value: statusSummary.CLOSED ?? 0 },
    { label: "OF en curso", value: (statusSummary.RELEASED ?? 0) + (statusSummary.IN_PROGRESS ?? 0) },
    { label: "Faltantes detectados", value: shortageCount },
    { label: "Producción neta", value: `${formatQty(outputSummary.produced)} u` },
    { label: "Merma acumulada", value: `${formatQty(outputSummary.scrap)} u` },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
        </article>
      ))}
    </section>
  );
}

export function CreateOrderCard({
  context,
  boms,
  warehouses,
}: {
  context: AppContext;
  boms: Array<{
    id: string;
    code: string;
    finishedItem: { name: string; uom: string };
    baseQuantity: unknown;
    lines: Array<{ componentItem: { name: string }; quantity: unknown; scrapRate: unknown }>;
  }>;
  warehouses: Array<{ id: string; name: string }>;
}) {
  const canWrite = context.membership.permissions.includes("production.write");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Nueva orden de fabricación</h2>
          <p className="text-sm text-slate-600">
            Al grabar la OF se calculan requerimientos teóricos, stock disponible y faltantes.
          </p>
        </div>
        {!canWrite ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Solo lectura para este rol
          </span>
        ) : null}
      </div>
      <form action={createProductionOrder.bind(null, context)} className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span>Composición</span>
          <select name="bomId" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            {boms.map((bom) => (
              <option key={bom.id} value={bom.id}>
                {bom.code} · {bom.finishedItem.name} · base {formatQty(bom.baseQuantity)} {bom.finishedItem.uom}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Depósito</span>
          <select name="warehouseId" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Cantidad planificada</span>
          <input name="plannedQuantity" type="number" min="0.001" step="0.001" defaultValue="120" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
          <span>Notas</span>
          <textarea name="notes" disabled={!canWrite} rows={3} defaultValue="OF generada desde el tablero operativo." className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <button disabled={!canWrite} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          Crear OF y calcular faltantes
        </button>
      </form>
    </section>
  );
}

export function OrdersTable({
  context,
  orders,
}: {
  context: AppContext;
  orders: Array<{
    id: string;
    code: string;
    status: ProductionOrderStatus;
    finishedItem: { name: string; uom: string };
    warehouse: { name: string };
    plannedQuantity: unknown;
    producedQuantity: unknown;
    scrapQuantity: unknown;
    requirements: Array<{ shortageQuantity: unknown }>;
  }>;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Órdenes por estado</h2>
          <p className="text-sm text-slate-600">Acceso detallado a requerimientos, consumos reales y cierre.</p>
        </div>
        <Link href={`/reportes/produccion?company=${context.company.slug}&user=${context.user.email}`} className="text-sm font-semibold text-slate-700 underline">
          Ver reportes mínimos
        </Link>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="pb-2">OF</th>
              <th className="pb-2">Producto</th>
              <th className="pb-2">Depósito</th>
              <th className="pb-2">Estado</th>
              <th className="pb-2">Plan</th>
              <th className="pb-2">Real</th>
              <th className="pb-2">Faltantes</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const shortage = order.requirements.reduce(
                (sum, requirement) => sum + toNumber(requirement.shortageQuantity),
                0,
              );
              return (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="py-3 font-semibold text-slate-900">
                    <Link href={`/produccion/of/${order.id}?company=${context.company.slug}&user=${context.user.email}`} className="underline">
                      {order.code}
                    </Link>
                  </td>
                  <td className="py-3">{order.finishedItem.name}</td>
                  <td className="py-3">{order.warehouse.name}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3">{formatQty(order.plannedQuantity)} {order.finishedItem.uom}</td>
                  <td className="py-3">{formatQty(order.producedQuantity)} {order.finishedItem.uom}</td>
                  <td className={`py-3 font-semibold ${shortage > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatQty(shortage)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function InventoryTable({ inventory }: { inventory: Array<{ id: string; sku: string; name: string; uom: string; itemType: string; onHand: number; standardCost: unknown }> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Stock actual y costo estándar</h2>
      <p className="text-sm text-slate-600">Base real usada para validar faltantes y valorizar consumo/cierre.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {inventory.map((item) => (
          <article key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.itemType}</p>
            <h3 className="mt-1 font-semibold text-slate-900">{item.sku} · {item.name}</h3>
            <p className="mt-2 text-sm text-slate-700">Stock: {formatQty(item.onHand)} {item.uom}</p>
            <p className="text-sm text-slate-700">Costo estándar: {formatCost(item.standardCost)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ShortagesCard({ shortages }: { shortages: Array<{ orderCode: string; itemName: string; shortageQuantity: number; uom: string }> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Materias primas faltantes</h2>
      <div className="mt-4 space-y-3">
        {shortages.length === 0 ? (
          <p className="text-sm text-emerald-700">Sin faltantes para el tenant activo.</p>
        ) : (
          shortages.map((shortage) => (
            <article key={`${shortage.orderCode}-${shortage.itemName}`} className="rounded-xl border border-rose-100 bg-rose-50 p-3">
              <p className="font-semibold text-rose-900">{shortage.orderCode} · {shortage.itemName}</p>
              <p className="text-sm text-rose-700">Faltan {formatQty(shortage.shortageQuantity)} {shortage.uom}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function ConsumptionVsTheoretical({ rows }: { rows: Array<{ orderId: string; code: string; finishedItem: string; theoretical: number; actual: number; variance: number }> }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Consumos teóricos vs reales</h2>
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <article key={row.orderId} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{row.code} · {row.finishedItem}</p>
                <p className="text-sm text-slate-600">Teórico {formatQty(row.theoretical)} · Real {formatQty(row.actual)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.variance > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                Variación {formatQty(row.variance)}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OrderDetailCard({
  context,
  detail,
}: {
  context: AppContext;
  detail: {
    order: {
      id: string;
      code: string;
      status: ProductionOrderStatus;
      notes: string | null;
      plannedQuantity: unknown;
      expectedOutputQty: unknown;
      producedQuantity: unknown;
      scrapQuantity: unknown;
      warehouseId: string;
      warehouse: { name: string };
      finishedItem: { name: string; uom: string };
      bom: { code: string; lines: Array<{ componentItem: { id: string; name: string; uom: string }; quantity: unknown; scrapRate: unknown }> };
      requirements: Array<{ id: string; componentItem: { id: string; name: string; uom: string }; theoreticalQuantity: unknown; availableQuantity: unknown; shortageQuantity: unknown }>;
      consumptions: Array<{ id: string; componentItem: { name: string; uom: string }; consumedQuantity: unknown; scrapQuantity: unknown; lotReference: string | null; notes: string | null; createdBy: { name: string }; createdAt: Date }>;
    };
    warehouseStock: Record<string, number>;
  };
}) {
  const canWrite = context.membership.permissions.includes("production.write");
  const canClose = context.membership.permissions.includes("production.close");

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">{detail.order.bom.code} · {detail.order.warehouse.name}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{detail.order.code}</h1>
          <p className="mt-2 text-sm text-slate-600">{detail.order.notes}</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-2 text-sm font-semibold ${badgeClass(detail.order.status)}`}>
          {detail.order.status}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Plan</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatQty(detail.order.plannedQuantity)} {detail.order.finishedItem.uom}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Salida esperada</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatQty(detail.order.expectedOutputQty)} {detail.order.finishedItem.uom}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Salida real</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatQty(detail.order.producedQuantity)} {detail.order.finishedItem.uom}</p>
        </article>
        <article className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Merma reportada</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{formatQty(detail.order.scrapQuantity)} {detail.order.finishedItem.uom}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Requerimientos y faltantes</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2">Materia prima</th>
                  <th className="pb-2">Teórico</th>
                  <th className="pb-2">Disponible OF</th>
                  <th className="pb-2">Faltante</th>
                  <th className="pb-2">Stock actual</th>
                </tr>
              </thead>
              <tbody>
                {detail.order.requirements.map((requirement) => (
                  <tr key={requirement.id} className="border-t border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{requirement.componentItem.name}</td>
                    <td className="py-3">{formatQty(requirement.theoreticalQuantity)} {requirement.componentItem.uom}</td>
                    <td className="py-3">{formatQty(requirement.availableQuantity)} {requirement.componentItem.uom}</td>
                    <td className={`py-3 font-semibold ${toNumber(requirement.shortageQuantity) > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                      {formatQty(requirement.shortageQuantity)} {requirement.componentItem.uom}
                    </td>
                    <td className="py-3">{formatQty(detail.warehouseStock[requirement.componentItem.id] ?? 0)} {requirement.componentItem.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Registrar consumo real</h2>
            <form action={registerConsumption.bind(null, context)} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={detail.order.id} />
              <input type="hidden" name="warehouseId" value={detail.order.warehouseId} />
              <select name="componentItemId" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {detail.order.requirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.componentItem.id}>
                    {requirement.componentItem.name}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 md:grid-cols-2">
                <input name="consumedQuantity" type="number" min="0.001" step="0.001" placeholder="Consumido" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input name="scrapQuantity" type="number" min="0" step="0.001" placeholder="Merma" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </div>
              <input name="lotReference" placeholder="Lote / trazabilidad" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <textarea name="notes" rows={3} placeholder="Observaciones del consumo" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button disabled={!canWrite} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                Agregar consumo
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <h2 className="text-lg font-semibold text-slate-900">Cerrar OF e impactar stock</h2>
            <form action={closeProductionOrder.bind(null, context)} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={detail.order.id} />
              <input name="producedQuantity" type="number" min="0.001" step="0.001" defaultValue={String(detail.order.expectedOutputQty)} disabled={!canClose || detail.order.status === "CLOSED"} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input name="scrapQuantity" type="number" min="0" step="0.001" defaultValue={String(detail.order.scrapQuantity)} disabled={!canClose || detail.order.status === "CLOSED"} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button disabled={!canClose || detail.order.status === "CLOSED"} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                Cerrar OF
              </button>
            </form>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-900">Trazabilidad de consumos reales</h2>
        <div className="mt-3 space-y-3">
          {detail.order.consumptions.length === 0 ? (
            <p className="text-sm text-slate-600">Sin consumos registrados todavía.</p>
          ) : (
            detail.order.consumptions.map((consumption) => (
              <article key={consumption.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{consumption.componentItem.name}</p>
                    <p className="text-sm text-slate-600">
                      Consumido {formatQty(consumption.consumedQuantity)} {consumption.componentItem.uom} · Merma {formatQty(consumption.scrapQuantity)} {consumption.componentItem.uom}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>Lote: {consumption.lotReference ?? "N/D"}</p>
                    <p>Usuario: {consumption.createdBy.name}</p>
                  </div>
                </div>
                {consumption.notes ? <p className="mt-2 text-sm text-slate-700">{consumption.notes}</p> : null}
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
