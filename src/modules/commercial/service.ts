import {
  CommercialLedgerEntryType,
  Prisma,
  type CommercialDocumentStatus,
  type CurrencyCode,
} from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import {
  type CreateCommercialDocumentInput,
  type CreateCommercialReceiptInput,
} from "@/modules/commercial/types";
import {
  assertApplicationDoesNotExceedDocument,
  assertReceiptApplicationStatus,
  ensureClientIsActive,
  resolveDocumentStatusByOpenAmount,
  resolveReceiptStatusByUnapplied,
  validateCommercialDocumentDraft,
  validateCommercialReceiptDraft,
} from "@/modules/commercial/validators";

function toDecimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

async function appendCommercialLedgerEntry(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    clientId: string;
    entryType: CommercialLedgerEntryType;
    currency: CurrencyCode;
    exchangeRate: number;
    debitAmount?: number;
    creditAmount?: number;
    description: string;
    referenceType: string;
    referenceId: string;
    occurredAt: Date;
    dueDate?: Date | null;
    commercialDocumentId?: string;
    commercialReceiptId?: string;
  },
) {
  const lastEntry = await tx.commercialLedgerEntry.findFirst({
    where: { companyId: input.companyId, clientId: input.clientId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    select: { balanceAfter: true },
  });

  const balanceBefore = Number(lastEntry?.balanceAfter ?? 0);
  const debitAmount = input.debitAmount ?? 0;
  const creditAmount = input.creditAmount ?? 0;
  const balanceAfter = balanceBefore + debitAmount - creditAmount;

  await tx.commercialLedgerEntry.create({
    data: {
      companyId: input.companyId,
      clientId: input.clientId,
      commercialDocumentId: input.commercialDocumentId,
      commercialReceiptId: input.commercialReceiptId,
      entryType: input.entryType,
      currency: input.currency,
      exchangeRate: toDecimal(input.exchangeRate),
      debitAmount: toDecimal(debitAmount),
      creditAmount: toDecimal(creditAmount),
      balanceAfter: toDecimal(balanceAfter),
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      occurredAt: input.occurredAt,
      dueDate: input.dueDate ?? null,
    },
  });

  await tx.client.update({
    where: { id: input.clientId },
    data: { currentBalance: toDecimal(balanceAfter) },
  });
}

export async function createCommercialDocument(input: CreateCommercialDocumentInput) {
  const { draft, totals } = validateCommercialDocumentDraft(input);

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findFirst({
      where: {
        id: draft.clientId,
        companyId: draft.companyId,
      },
      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!client) {
      throw new Error("No existe el cliente indicado para la empresa activa.");
    }

    ensureClientIsActive(client);

    const created = await tx.commercialDocument.create({
      data: {
        companyId: draft.companyId,
        clientId: draft.clientId,
        createdById: draft.createdById,
        fiscalDocumentId: draft.fiscalDocumentId,
        accountingRuleId: draft.accountingRuleId,
        documentType: draft.documentType,
        documentNumber: draft.documentNumber,
        issueDate: draft.issueDate,
        dueDate: draft.dueDate,
        currency: draft.currency,
        exchangeRate: toDecimal(draft.exchangeRate),
        subtotalAmount: toDecimal(totals.subtotalAmount),
        taxAmount: toDecimal(totals.taxAmount),
        totalAmount: toDecimal(totals.totalAmount),
        openAmount: toDecimal(totals.totalAmount),
        status: draft.status,
        isFiscalizable: draft.isFiscalizable,
        notes: draft.notes,
        lines: {
          create: draft.lines.map((line, index) => {
            const subtotalAmount = line.quantity * line.unitPrice - line.discountAmount;
            return {
              companyId: draft.companyId,
              itemId: line.itemId,
              lineNumber: index + 1,
              description: line.description,
              quantity: toDecimal(line.quantity),
              unit: line.unit,
              unitPrice: toDecimal(line.unitPrice),
              discountAmount: toDecimal(line.discountAmount),
              subtotalAmount: toDecimal(subtotalAmount),
              taxAmount: toDecimal(line.taxAmount),
              totalAmount: toDecimal(subtotalAmount + line.taxAmount),
            };
          }),
        },
      },
      include: {
        lines: true,
      },
    });

    await appendCommercialLedgerEntry(tx, {
      companyId: draft.companyId,
      clientId: draft.clientId,
      commercialDocumentId: created.id,
      entryType: CommercialLedgerEntryType.DOCUMENT,
      currency: draft.currency,
      exchangeRate: draft.exchangeRate,
      debitAmount: totals.totalAmount,
      description: `Comprobante ${created.documentNumber}`,
      referenceType: "COMMERCIAL_DOCUMENT",
      referenceId: created.id,
      occurredAt: created.issueDate,
      dueDate: created.dueDate,
    });

    return created;
  });
}

export async function createCommercialReceipt(input: CreateCommercialReceiptInput) {
  const { draft, appliedAmount, unappliedAmount } = validateCommercialReceiptDraft(input);

  return prisma.$transaction(async (tx) => {
    const client = await tx.client.findFirst({
      where: {
        id: draft.clientId,
        companyId: draft.companyId,
      },
      select: {
        id: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!client) {
      throw new Error("No existe el cliente indicado para la empresa activa.");
    }

    ensureClientIsActive(client);

    const documents = draft.applications.length
      ? await tx.commercialDocument.findMany({
          where: {
            id: { in: draft.applications.map((application) => application.documentId) },
            companyId: draft.companyId,
            clientId: draft.clientId,
          },
          select: {
            id: true,
            openAmount: true,
            currency: true,
            totalAmount: true,
          },
        })
      : [];

    if (documents.length !== draft.applications.length) {
      throw new Error("Alguno de los comprobantes aplicados no existe o no pertenece al cliente/empresa actual.");
    }

    const documentById = new Map(documents.map((document) => [document.id, document]));

    const created = await tx.commercialReceipt.create({
      data: {
        companyId: draft.companyId,
        clientId: draft.clientId,
        createdById: draft.createdById,
        accountingRuleId: draft.accountingRuleId,
        receiptNumber: draft.receiptNumber,
        receiptDate: draft.receiptDate,
        currency: draft.currency,
        exchangeRate: toDecimal(draft.exchangeRate),
        totalAmount: toDecimal(draft.totalAmount),
        unappliedAmount: toDecimal(unappliedAmount),
        paymentMethod: draft.paymentMethod,
        reference: draft.reference,
        notes: draft.notes,
        status: resolveReceiptStatusByUnapplied(unappliedAmount, draft.totalAmount),
      },
    });

    for (const application of draft.applications) {
      const document = documentById.get(application.documentId);
      if (!document) {
        throw new Error("No se encontró el comprobante a aplicar.");
      }

      assertApplicationDoesNotExceedDocument(document, application.appliedAmount);

      const resultingOpenAmount = Number(document.openAmount) - application.appliedAmount;
      const nextStatus: CommercialDocumentStatus = resolveDocumentStatusByOpenAmount(
        resultingOpenAmount,
        Number(document.totalAmount),
      );

      await tx.commercialReceiptApplication.create({
        data: {
          companyId: draft.companyId,
          commercialReceiptId: created.id,
          commercialDocumentId: document.id,
          appliedAmount: toDecimal(application.appliedAmount),
          resultingOpenAmount: toDecimal(resultingOpenAmount),
        },
      });

      await tx.commercialDocument.update({
        where: { id: document.id },
        data: {
          openAmount: toDecimal(resultingOpenAmount),
          status: nextStatus,
        },
      });
    }

    await appendCommercialLedgerEntry(tx, {
      companyId: draft.companyId,
      clientId: draft.clientId,
      commercialReceiptId: created.id,
      entryType: CommercialLedgerEntryType.RECEIPT,
      currency: draft.currency,
      exchangeRate: draft.exchangeRate,
      creditAmount: draft.totalAmount,
      description: `Cobranza ${created.receiptNumber}`,
      referenceType: "COMMERCIAL_RECEIPT",
      referenceId: created.id,
      occurredAt: created.receiptDate,
    });

    return created;
  });
}

export async function applyCommercialReceiptToDocuments(input: {
  companyId: string;
  receiptId: string;
  applications: Array<{ documentId: string; appliedAmount: number }>;
}) {
  if (input.applications.length === 0) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const receipt = await tx.commercialReceipt.findFirst({
      where: {
        id: input.receiptId,
        companyId: input.companyId,
      },
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        unappliedAmount: true,
        currency: true,
        status: true,
      },
    });

    if (!receipt) {
      throw new Error("No existe la cobranza para la empresa indicada.");
    }

    assertReceiptApplicationStatus(receipt);

    const amountToApply = input.applications.reduce((sum, row) => sum + row.appliedAmount, 0);
    if (amountToApply > Number(receipt.unappliedAmount)) {
      throw new Error("El importe total de aplicación excede el pendiente de la cobranza.");
    }

    const documents = await tx.commercialDocument.findMany({
      where: {
        id: { in: input.applications.map((row) => row.documentId) },
        companyId: input.companyId,
        clientId: receipt.clientId,
      },
      select: {
        id: true,
        openAmount: true,
        totalAmount: true,
        currency: true,
      },
    });

    if (documents.length !== input.applications.length) {
      throw new Error("Alguno de los comprobantes no pertenece al mismo cliente de la cobranza.");
    }

    for (const row of input.applications) {
      const document = documents.find((candidate) => candidate.id === row.documentId);
      if (!document) {
        throw new Error("No se encontró el comprobante a aplicar.");
      }

      if (document.currency !== receipt.currency) {
        throw new Error("No se pueden mezclar monedas al aplicar cobranzas y comprobantes.");
      }

      assertApplicationDoesNotExceedDocument(document, row.appliedAmount);

      const resultingOpenAmount = Number(document.openAmount) - row.appliedAmount;
      const nextStatus = resolveDocumentStatusByOpenAmount(resultingOpenAmount, Number(document.totalAmount));

      await tx.commercialReceiptApplication.create({
        data: {
          companyId: input.companyId,
          commercialReceiptId: receipt.id,
          commercialDocumentId: document.id,
          appliedAmount: toDecimal(row.appliedAmount),
          resultingOpenAmount: toDecimal(resultingOpenAmount),
        },
      });

      await tx.commercialDocument.update({
        where: { id: document.id },
        data: {
          openAmount: toDecimal(resultingOpenAmount),
          status: nextStatus,
        },
      });
    }

    const nextUnappliedAmount = Number(receipt.unappliedAmount) - amountToApply;

    await tx.commercialReceipt.update({
      where: { id: receipt.id },
      data: {
        unappliedAmount: toDecimal(nextUnappliedAmount),
        status: resolveReceiptStatusByUnapplied(nextUnappliedAmount, Number(receipt.totalAmount)),
      },
    });

    return {
      receiptId: receipt.id,
      appliedAmount: amountToApply,
      unappliedAmount: nextUnappliedAmount,
    };
  });
}

export async function getCommercialCurrentAccount(companyId: string, clientId: string) {
  const [client, entries] = await Promise.all([
    prisma.client.findFirst({
      where: { id: clientId, companyId },
      select: { id: true, legalName: true, currentBalance: true, defaultCurrency: true },
    }),
    prisma.commercialLedgerEntry.findMany({
      where: { companyId, clientId },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!client) {
    throw new Error("No se encontró el cliente para consultar la cuenta corriente.");
  }

  return {
    client,
    entries,
    balance: Number(client.currentBalance),
  };
}


type CtaCteVoucher = {
  idRegistro: string;
  companyId: string;
  clientId: string;
  fecha: Date;
  tipoCbte: "FC" | "NC" | "ND" | "RC" | "RT";
  letra: string;
  puntoVenta: string;
  nroCbte: string;
  importe: number;
  estado: "OPERATIVO" | "CERRADO";
  tipoCbteImput: string;
  letraImput: string;
  puntoVentaImput: string;
  nroCbteImput: string;
  referenciaContable?: string;
};

function parseVoucherIdentity(documentNumber: string, fallbackType: CtaCteVoucher["tipoCbte"]) {
  const [tipoCbte = fallbackType, letra = "X", puntoVenta = "0", nroCbte = documentNumber] = documentNumber.split("-");
  return { tipoCbte: tipoCbte as CtaCteVoucher["tipoCbte"], letra, puntoVenta, nroCbte };
}

function mapDocumentTypeToVoucherType(type: string): CtaCteVoucher["tipoCbte"] {
  if (type.includes("CREDIT")) return "NC";
  if (type.includes("DEBIT")) return "ND";
  if (type.includes("DELIVERY")) return "RT";
  return "FC";
}

export async function getCommercialCurrentAccountVoucherModel(companyId: string, clientId: string) {
  const [client, documents, receipts, applications] = await Promise.all([
    prisma.client.findFirst({ where: { id: clientId, companyId }, select: { id: true, legalName: true, defaultCurrency: true } }),
    prisma.commercialDocument.findMany({ where: { companyId, clientId }, orderBy: [{ issueDate: "asc" }, { createdAt: "asc" }] }),
    prisma.commercialReceipt.findMany({ where: { companyId, clientId }, orderBy: [{ receiptDate: "asc" }, { createdAt: "asc" }] }),
    prisma.commercialReceiptApplication.findMany({
      where: { companyId, receipt: { clientId }, document: { clientId } },
      include: { receipt: true, document: true },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  if (!client) throw new Error("No se encontró el cliente para consultar la cuenta corriente.");

  const rows: CtaCteVoucher[] = documents.map((doc) => {
    const identity = parseVoucherIdentity(doc.documentNumber, mapDocumentTypeToVoucherType(doc.documentType));
    return {
      idRegistro: doc.id,
      companyId,
      clientId,
      fecha: doc.issueDate,
      tipoCbte: identity.tipoCbte,
      letra: identity.letra,
      puntoVenta: identity.puntoVenta,
      nroCbte: identity.nroCbte,
      importe: Number(doc.totalAmount),
      estado: Number(doc.openAmount) === 0 ? "CERRADO" : "OPERATIVO",
      tipoCbteImput: identity.tipoCbte,
      letraImput: identity.letra,
      puntoVentaImput: identity.puntoVenta,
      nroCbteImput: identity.nroCbte,
      referenciaContable: doc.accountingEntryId ?? undefined,
    };
  });

  const docIdentityById = new Map(documents.map((doc) => [doc.id, parseVoucherIdentity(doc.documentNumber, mapDocumentTypeToVoucherType(doc.documentType))]));

  receipts.forEach((receipt) => {
    const identity = parseVoucherIdentity(receipt.receiptNumber, "RC");
    const appliedRows = applications.filter((app) => app.commercialReceiptId === receipt.id);

    if (!appliedRows.length) {
      rows.push({
        idRegistro: receipt.id,
        companyId,
        clientId,
        fecha: receipt.receiptDate,
        tipoCbte: "RC",
        letra: identity.letra,
        puntoVenta: identity.puntoVenta,
        nroCbte: identity.nroCbte,
        importe: -Number(receipt.totalAmount),
        estado: Number(receipt.unappliedAmount) === 0 ? "CERRADO" : "OPERATIVO",
        tipoCbteImput: "RC",
        letraImput: identity.letra,
        puntoVentaImput: identity.puntoVenta,
        nroCbteImput: identity.nroCbte,
        referenciaContable: receipt.accountingEntryId ?? undefined,
      });
      return;
    }

    appliedRows.forEach((app) => {
      const targetIdentity = docIdentityById.get(app.commercialDocumentId) ?? identity;
      rows.push({
        idRegistro: `${receipt.id}:${app.id}`,
        companyId,
        clientId,
        fecha: receipt.receiptDate,
        tipoCbte: "RC",
        letra: identity.letra,
        puntoVenta: identity.puntoVenta,
        nroCbte: identity.nroCbte,
        importe: -Number(app.appliedAmount),
        estado: Number(receipt.unappliedAmount) === 0 ? "CERRADO" : "OPERATIVO",
        tipoCbteImput: targetIdentity.tipoCbte,
        letraImput: targetIdentity.letra,
        puntoVentaImput: targetIdentity.puntoVenta,
        nroCbteImput: targetIdentity.nroCbte,
        referenciaContable: receipt.accountingEntryId ?? undefined,
      });
    });
  });

  const balance = rows.reduce((sum, row) => sum + row.importe, 0);

  return { client, rows, balance };
}
