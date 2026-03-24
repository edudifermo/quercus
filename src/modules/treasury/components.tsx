import Link from "next/link";
import { PaymentMethod } from "@prisma/client";
import type { AppContext } from "@/modules/production/auth";
import { createBankMovement, createCashMovement, createSupplierInvoice, createSupplierPayment } from "@/modules/treasury/actions";
import { formatDate, formatMoney, toNumber } from "@/modules/treasury/utils";

export function TreasuryTopBar({ context }: { context: AppContext }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Tesorería</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">Caja, bancos, pagos y cuenta corriente</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tenant activo: <strong>{context.company.name}</strong> · Usuario: <strong>{context.user.name}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/?company=${context.company.slug}&user=${context.user.email}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
            Producción
          </Link>
          <Link href={`/reportes/consolidacion?company=${context.company.slug}&user=${context.user.email}`} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-violet-800">
            Consolidación
          </Link>
          <Link href={`/reportes/tesoreria?company=${context.company.slug}&user=${context.user.email}`} className="rounded-full border border-slate-900 bg-slate-900 px-3 py-2 text-white">
            Reportes de tesorería
          </Link>
        </div>
      </div>
    </section>
  );
}

export function TreasurySummaryCards({
  summary,
}: {
  summary: { supplierBalance: number; openInvoices: number; payments: number; unreconciledBankItems: number };
}) {
  const cards = [
    { label: "Saldo proveedores", value: formatMoney(summary.supplierBalance) },
    { label: "Compras abiertas", value: formatMoney(summary.openInvoices) },
    { label: "Pagos recientes", value: formatMoney(summary.payments) },
    { label: "Pendientes conciliación", value: summary.unreconciledBankItems },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
        </article>
      ))}
    </section>
  );
}

export function RegisterInvoiceCard({
  context,
  suppliers,
}: {
  context: AppContext;
  suppliers: Array<{ id: string; name: string; code: string }>;
}) {
  const canWrite = context.membership.permissions.includes("treasury.write");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Compra / cuenta corriente proveedor</h2>
      <p className="text-sm text-slate-600">Cada compra genera deuda, saldo abierto y trazabilidad documental.</p>
      <form action={createSupplierInvoice.bind(null, context)} className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span>Proveedor</span>
          <select name="supplierId" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.code} · {supplier.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Comprobante</span>
          <input name="documentNumber" disabled={!canWrite} defaultValue="FC-A-0001-00001234" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
          <span>Descripción</span>
          <input name="description" disabled={!canWrite} defaultValue="Compra de insumos y servicios" className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Fecha emisión</span>
          <input name="issueDate" type="date" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Vencimiento</span>
          <input name="dueDate" type="date" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Moneda</span>
          <select name="currency" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>TC</span>
          <input name="exchangeRate" type="number" step="0.000001" min="0.000001" defaultValue="1" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Importe total</span>
          <input name="totalAmount" type="number" step="0.01" min="0.01" defaultValue="185000" disabled={!canWrite} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
          <span>Adjuntos</span>
          <input name="attachments" type="file" multiple accept="application/pdf,image/*" disabled={!canWrite} className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2" />
        </label>
        <button disabled={!canWrite} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          Registrar compra y deuda
        </button>
      </form>
    </section>
  );
}

export function RegisterSupplierPaymentCard({
  context,
  suppliers,
  cashBoxes,
  bankAccounts,
  openInvoices,
}: {
  context: AppContext;
  suppliers: Array<{ id: string; name: string; code: string }>;
  cashBoxes: Array<{ id: string; name: string; currency: string; currentBalance: number }>;
  bankAccounts: Array<{ id: string; bankName: string; accountName: string; currency: string; currentBalance: number }>;
  openInvoices: Array<{
    id: string;
    supplierId: string;
    documentNumber: string;
    description: string;
    openAmount: unknown;
    currency: string;
    dueDate: Date | null;
    supplier: { name: string };
  }>;
}) {
  const canPay = context.membership.permissions.includes("treasury.pay");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Pago a proveedor</h2>
      <p className="text-sm text-slate-600">Se genera pago, egreso de caja/banco, imputación contra compras y baja en cuenta corriente.</p>
      <form action={createSupplierPayment.bind(null, context)} className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-700">
          <span>Proveedor</span>
          <select name="supplierId" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.code} · {supplier.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Fecha pago</span>
          <input name="paymentDate" type="date" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Importe total</span>
          <input name="totalAmount" type="number" step="0.01" min="0.01" defaultValue="150000" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Medio</span>
          <select name="paymentMethod" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            {Object.values(PaymentMethod).map((method) => (
              <option key={method} value={method}>{method}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Caja origen</span>
          <select name="cashBoxId" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Sin uso</option>
            {cashBoxes.map((cashBox) => (
              <option key={cashBox.id} value={cashBox.id}>{cashBox.name} · saldo {formatMoney(cashBox.currentBalance, cashBox.currency)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Banco origen</span>
          <select name="bankAccountId" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Sin uso</option>
            {bankAccounts.map((bank) => (
              <option key={bank.id} value={bank.id}>{bank.bankName} · {bank.accountName} · saldo {formatMoney(bank.currentBalance, bank.currency)}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>Moneda</span>
          <select name="currency" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-slate-700">
          <span>TC</span>
          <input name="exchangeRate" type="number" step="0.000001" min="0.000001" defaultValue="1" disabled={!canPay} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
          <span>Notas / referencia</span>
          <textarea name="notes" rows={3} disabled={!canPay} defaultValue="Transferencia bancaria con comprobante adjunto." className="w-full rounded-xl border border-slate-200 px-3 py-2" />
        </label>
        <div className="space-y-3 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-700">Imputación contra compras abiertas</p>
          <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-3 py-2">Proveedor</th>
                  <th className="px-3 py-2">Comprobante</th>
                  <th className="px-3 py-2">Vence</th>
                  <th className="px-3 py-2">Saldo</th>
                  <th className="px-3 py-2">Aplicar</th>
                </tr>
              </thead>
              <tbody>
                {openInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{invoice.supplier.name}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-900">{invoice.documentNumber}</div>
                      <div className="text-xs text-slate-500">{invoice.description}</div>
                    </td>
                    <td className="px-3 py-2">{invoice.dueDate ? formatDate(invoice.dueDate) : "-"}</td>
                    <td className="px-3 py-2">{formatMoney(invoice.openAmount, invoice.currency)}</td>
                    <td className="px-3 py-2">
                      <input name={`apply_${invoice.id}`} type="number" step="0.01" min="0" max={toNumber(invoice.openAmount)} defaultValue="0" disabled={!canPay} className="w-32 rounded-xl border border-slate-200 px-3 py-2" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
          <span>Adjuntos</span>
          <input name="attachments" type="file" multiple accept="application/pdf,image/*" disabled={!canPay} className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2" />
        </label>
        <button disabled={!canPay} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
          Registrar pago completo
        </button>
      </form>
    </section>
  );
}

export function TreasuryMovementCards({
  context,
  suppliers,
  cashBoxes,
  bankAccounts,
}: {
  context: AppContext;
  suppliers: Array<{ id: string; name: string; code: string }>;
  cashBoxes: Array<{ id: string; name: string }>;
  bankAccounts: Array<{ id: string; bankName: string; accountName: string }>;
}) {
  const canWrite = context.membership.permissions.includes("treasury.write");

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Movimiento de caja</h2>
        <form action={createCashMovement.bind(null, context)} className="mt-4 grid gap-4">
          <select name="cashBoxId" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
            {cashBoxes.map((cashBox) => (
              <option key={cashBox.id} value={cashBox.id}>{cashBox.name}</option>
            ))}
          </select>
          <div className="grid gap-4 md:grid-cols-2">
            <select name="direction" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="OUT">Salida</option>
              <option value="IN">Ingreso</option>
            </select>
            <select name="movementType" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="PAYMENT">Pago</option>
              <option value="COLLECTION">Cobranza</option>
              <option value="TRANSFER_IN">Transferencia entrada</option>
              <option value="TRANSFER_OUT">Transferencia salida</option>
            </select>
          </div>
          <select name="supplierId" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Sin proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.code} · {supplier.name}</option>
            ))}
          </select>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="amount" type="number" step="0.01" min="0.01" defaultValue="10000" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2" />
            <input name="movementDate" type="date" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <select name="currency" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <input name="exchangeRate" type="number" step="0.000001" min="0.000001" defaultValue="1" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2" />
          </div>
          <input name="description" disabled={!canWrite} defaultValue="Pago menor de tesorería" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input name="attachments" type="file" multiple accept="application/pdf,image/*" disabled={!canWrite} className="rounded-xl border border-dashed border-slate-300 px-3 py-2" />
          <button disabled={!canWrite} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Registrar caja</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Movimiento bancario</h2>
        <form action={createBankMovement.bind(null, context)} className="mt-4 grid gap-4">
          <select name="bankAccountId" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
            {bankAccounts.map((bankAccount) => (
              <option key={bankAccount.id} value={bankAccount.id}>{bankAccount.bankName} · {bankAccount.accountName}</option>
            ))}
          </select>
          <div className="grid gap-4 md:grid-cols-2">
            <select name="direction" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="OUT">Salida</option>
              <option value="IN">Ingreso</option>
            </select>
            <select name="movementType" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="PAYMENT">Pago</option>
              <option value="DEPOSIT">Depósito</option>
              <option value="FEE">Gasto bancario</option>
              <option value="TRANSFER_IN">Transferencia entrada</option>
              <option value="TRANSFER_OUT">Transferencia salida</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </div>
          <select name="supplierId" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Sin proveedor</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.code} · {supplier.name}</option>
            ))}
          </select>
          <div className="grid gap-4 md:grid-cols-2">
            <input name="amount" type="number" step="0.01" min="0.01" defaultValue="50000" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2" />
            <input name="movementDate" type="date" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <select name="currency" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2">
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <input name="exchangeRate" type="number" step="0.000001" min="0.000001" defaultValue="1" disabled={!canWrite} className="rounded-xl border border-slate-200 px-3 py-2" />
          </div>
          <input name="externalReference" disabled={!canWrite} defaultValue="TRX-20260319-001" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input name="description" disabled={!canWrite} defaultValue="Transferencia o gasto bancario" className="rounded-xl border border-slate-200 px-3 py-2" />
          <input name="attachments" type="file" multiple accept="application/pdf,image/*" disabled={!canWrite} className="rounded-xl border border-dashed border-slate-300 px-3 py-2" />
          <button disabled={!canWrite} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Registrar banco</button>
        </form>
      </section>
    </div>
  );
}

export function TreasuryTables({
  cashMovements,
  bankMovements,
  recentPayments,
  attachments,
}: {
  cashMovements: Array<{ id: string; movementDate: Date; description: string; amount: unknown; currency: string; direction: string; cashBox: { name: string }; supplier: { name: string } | null }>;
  bankMovements: Array<{ id: string; movementDate: Date; description: string; amount: unknown; currency: string; direction: string; isReconciled: boolean; bankAccount: { bankName: string; accountName: string }; supplier: { name: string } | null }>;
  recentPayments: Array<{ id: string; paymentNumber: string; paymentDate: Date; totalAmount: unknown; currency: string; paymentMethod: string; supplier: { name: string }; items: Array<{ id: string; description: string | null; amount: unknown; supplierInvoice: { documentNumber: string } | null }> }>;
  attachments: Array<{ id: string; fileName: string; ownerType: string; publicUrl: string; uploadedAt: Date }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Caja diaria</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Caja</th>
                <th className="pb-2">Detalle</th>
                <th className="pb-2">Importe</th>
              </tr>
            </thead>
            <tbody>
              {cashMovements.map((movement) => (
                <tr key={movement.id} className="border-t border-slate-100">
                  <td className="py-3">{formatDate(movement.movementDate)}</td>
                  <td className="py-3">{movement.cashBox.name}</td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-900">{movement.description}</div>
                    <div className="text-xs text-slate-500">{movement.supplier?.name ?? "Sin proveedor"}</div>
                  </td>
                  <td className={`py-3 font-semibold ${movement.direction === "IN" ? "text-emerald-700" : "text-rose-700"}`}>{movement.direction === "IN" ? "+" : "-"}{formatMoney(movement.amount, movement.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Movimientos bancarios</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Cuenta</th>
                <th className="pb-2">Detalle</th>
                <th className="pb-2">Conc.</th>
              </tr>
            </thead>
            <tbody>
              {bankMovements.map((movement) => (
                <tr key={movement.id} className="border-t border-slate-100">
                  <td className="py-3">{formatDate(movement.movementDate)}</td>
                  <td className="py-3">{movement.bankAccount.bankName} · {movement.bankAccount.accountName}</td>
                  <td className="py-3">
                    <div className="font-semibold text-slate-900">{movement.description}</div>
                    <div className="text-xs text-slate-500">{movement.direction === "IN" ? "+" : "-"}{formatMoney(movement.amount, movement.currency)}</div>
                  </td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${movement.isReconciled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {movement.isReconciled ? "Conciliado" : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pagos por período</h2>
        <div className="mt-4 space-y-3">
          {recentPayments.map((payment) => (
            <article key={payment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{payment.paymentNumber} · {payment.supplier.name}</p>
                  <p className="text-sm text-slate-600">{formatDate(payment.paymentDate)} · {payment.paymentMethod}</p>
                  <p className="mt-2 text-xs text-slate-500">{payment.items.map((item) => item.supplierInvoice?.documentNumber ?? item.description ?? "Sin detalle").join(" · ")}</p>
                </div>
                <strong className="text-lg text-slate-900">{formatMoney(payment.totalAmount, payment.currency)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Adjuntos</h2>
        <div className="mt-4 space-y-3">
          {attachments.map((attachment) => (
            <article key={attachment.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{attachment.fileName}</p>
                <p className="text-slate-500">{attachment.ownerType} · {formatDate(attachment.uploadedAt)}</p>
              </div>
              <a href={attachment.publicUrl} target="_blank" className="font-semibold text-slate-700 underline">Abrir</a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
