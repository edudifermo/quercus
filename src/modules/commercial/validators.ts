import {
  CommercialDocumentStatus,
  CommercialReceiptStatus,
  type CommercialDocument,
  type CommercialReceipt,
  type CurrencyCode,
} from "@prisma/client";
import {
  type CreateCommercialDocumentInput,
  type CreateCommercialReceiptInput,
  createCommercialDocumentSchema,
  createCommercialReceiptSchema,
} from "@/modules/commercial/types";

function round2(value: number) {
  return Number(value.toFixed(2));
}

export function validateCommercialDocumentDraft(input: CreateCommercialDocumentInput) {
  const draft = createCommercialDocumentSchema.parse(input);

  const totals = draft.lines.reduce(
    (acc, line, index) => {
      const subtotal = round2(line.quantity * line.unitPrice - line.discountAmount);
      if (subtotal < 0) {
        throw new Error(`La línea ${index + 1} genera subtotal negativo.`);
      }

      acc.subtotalAmount += subtotal;
      acc.taxAmount += line.taxAmount;
      acc.totalAmount += round2(subtotal + line.taxAmount);
      return acc;
    },
    { subtotalAmount: 0, taxAmount: 0, totalAmount: 0 },
  );

  const expectedSubtotal = round2(totals.subtotalAmount);
  const expectedTaxes = round2(totals.taxAmount);
  const expectedTotal = round2(totals.totalAmount);

  if (draft.subtotalAmount !== undefined && round2(draft.subtotalAmount) !== expectedSubtotal) {
    throw new Error("El subtotal informado no coincide con las líneas del documento comercial.");
  }

  if (draft.taxAmount !== undefined && round2(draft.taxAmount) !== expectedTaxes) {
    throw new Error("El impuesto informado no coincide con las líneas del documento comercial.");
  }

  if (draft.totalAmount !== undefined && round2(draft.totalAmount) !== expectedTotal) {
    throw new Error("El total informado no coincide con las líneas del documento comercial.");
  }

  return {
    draft,
    totals: {
      subtotalAmount: expectedSubtotal,
      taxAmount: expectedTaxes,
      totalAmount: expectedTotal,
    },
  };
}

export function validateCommercialReceiptDraft(input: CreateCommercialReceiptInput) {
  const draft = createCommercialReceiptSchema.parse(input);
  const applied = round2(draft.applications.reduce((sum, row) => sum + row.appliedAmount, 0));

  if (applied > round2(draft.totalAmount)) {
    throw new Error("La cobranza no puede aplicarse por un importe mayor al total del recibo.");
  }

  return {
    draft,
    appliedAmount: applied,
    unappliedAmount: round2(draft.totalAmount - applied),
  };
}

export function ensureClientIsActive(client: { id: string; isActive: boolean; deletedAt: Date | null }) {
  if (!client.isActive || client.deletedAt) {
    throw new Error("El cliente está inactivo o eliminado y no permite nuevas operaciones comerciales.");
  }
}

export function ensureSameCurrency(
  baseCurrency: CurrencyCode,
  rows: Array<{ currency: CurrencyCode; label: string }>,
) {
  const mismatch = rows.find((row) => row.currency !== baseCurrency);
  if (mismatch) {
    throw new Error(`Moneda inconsistente: ${mismatch.label} utiliza ${mismatch.currency} y se esperaba ${baseCurrency}.`);
  }
}

export function resolveDocumentStatusByOpenAmount(openAmount: number, totalAmount: number): CommercialDocumentStatus {
  if (openAmount <= 0) {
    return CommercialDocumentStatus.PAID;
  }

  if (openAmount < totalAmount) {
    return CommercialDocumentStatus.PARTIALLY_PAID;
  }

  return CommercialDocumentStatus.ISSUED;
}

export function resolveReceiptStatusByUnapplied(unappliedAmount: number, totalAmount: number): CommercialReceiptStatus {
  if (unappliedAmount <= 0) {
    return CommercialReceiptStatus.APPLIED;
  }

  if (unappliedAmount < totalAmount) {
    return CommercialReceiptStatus.PARTIALLY_APPLIED;
  }

  return CommercialReceiptStatus.POSTED;
}

export function assertApplicationDoesNotExceedDocument(
  document: Pick<CommercialDocument, "id" | "openAmount">,
  appliedAmount: number,
) {
  const openAmount = Number(document.openAmount);
  if (appliedAmount > round2(openAmount)) {
    throw new Error("El importe aplicado excede el saldo pendiente del comprobante comercial.");
  }
}

export function assertReceiptApplicationStatus(receipt: Pick<CommercialReceipt, "status">) {
  if (receipt.status === CommercialReceiptStatus.VOID) {
    throw new Error("No se puede aplicar una cobranza anulada.");
  }
}
