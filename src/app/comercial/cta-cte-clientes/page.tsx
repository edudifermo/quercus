import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveActiveContext } from "@/modules/app-context/service";
import { ErpShell } from "@/modules/erp/shell";
import { getCommercialCurrentAccountVoucherModel } from "@/modules/commercial/service";

export default async function CommercialCurrentAccountPage({ searchParams }: { searchParams?: Promise<{ company?: string; user?: string; group?: string; clientId?: string }> }) {
  const params = await searchParams;
  const context = await resolveActiveContext(params);

  const clients = await prisma.client.findMany({ where: { companyId: context.company.id, isActive: true }, orderBy: { legalName: "asc" }, select: { id: true, legalName: true } });
  if (!clients.length) {
    return <ErpShell context={context} title="Comercial · Cuenta corriente clientes"><p className="rounded-xl border border-slate-200 bg-white p-4 text-sm">No hay clientes activos para la empresa seleccionada.</p></ErpShell>;
  }

  const activeClientId = params?.clientId ?? clients[0].id;
  const account = await getCommercialCurrentAccountVoucherModel(context.company.id, activeClientId);

  return (
    <ErpShell context={context} title="Comercial · Cuenta corriente clientes" subtitle="Modelo obligatorio: comprobantes + referencias de imputación en registros trazables.">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <form className="flex items-end gap-3" method="get">
          <input type="hidden" name="company" value={context.company.slug} />
          <input type="hidden" name="user" value={context.user.email} />
          {context.consolidation ? <input type="hidden" name="group" value={context.consolidation.id} /> : null}
          <label className="text-sm">
            Cliente
            <select name="clientId" defaultValue={activeClientId} className="ml-2 rounded border border-slate-300 px-2 py-1">
              {clients.map((client) => <option key={client.id} value={client.id}>{client.legalName}</option>)}
            </select>
          </label>
          <button className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white">Ver cuenta</button>
        </form>
        <p className="mt-3 text-sm">Saldo recalculado desde comprobantes: <strong>{account.balance.toFixed(2)}</strong> {account.client.defaultCurrency}</p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-500"><tr><th>Fecha</th><th>Cbte</th><th>Imputa a</th><th>Importe</th><th>Estado</th><th>Navegación</th></tr></thead>
          <tbody>
            {account.rows.map((row) => (
              <tr className="border-t border-slate-100" key={row.idRegistro}>
                <td className="py-2">{new Date(row.fecha).toISOString().slice(0, 10)}</td>
                <td className="py-2">{row.tipoCbte} {row.letra} {row.puntoVenta}-{row.nroCbte}</td>
                <td className="py-2">{row.tipoCbteImput} {row.letraImput} {row.puntoVentaImput}-{row.nroCbteImput}</td>
                <td className={`py-2 font-semibold ${row.importe >= 0 ? "text-slate-800" : "text-emerald-700"}`}>{row.importe.toFixed(2)}</td>
                <td className="py-2">{row.estado}</td>
                <td className="py-2"><Link className="underline" href={`/comercial/facturacion?company=${context.company.slug}&user=${context.user.email}`}>Abrir comprobante</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ErpShell>
  );
}
