"use server";

import { revalidatePath } from "next/cache";
import {
  AttachmentOwnerType,
  BankMovementType,
  CashMovementType,
  PaymentMethod,
  Prisma,
  SupplierLedgerEntryType,
  TreasuryMovementDirection,
} from "@prisma/client";
import type { AppContext } from "@/modules/production/auth";
import { requirePermission } from "@/modules/production/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { persistAttachments } from "@/modules/treasury/storage";
import { decimalAmount, decimalRate, supplierInvoiceStatus, toNumber } from "@/modules/treasury/utils";

function getFiles(formData: FormData) {
  return formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function getNextSequence(tx: Prisma.TransactionClient, model: "payment" | "cash" | "bank") {
  if (model === "payment") {
    const latest = await tx.supplierPayment.findFirst({
      orderBy: { createdAt: "desc" },
      select: { paymentNumber: true },
    });
    return `PAG-${String((Number(latest?.paymentNumber.split("-").at(-1)) || 0) + 1).padStart(4, "0")}`;
  }

  if (model === "cash") {
    const latest = await tx.cashMovement.findFirst({
      orderBy: { createdAt: "desc" },
      select: { traceCode: true },
    });
    return `CAJA-${String((Number(latest?.traceCode.split("-").at(-1)) || 0) + 1).padStart(4, "0")}`;
  }

  const latest = await tx.bankMovement.findFirst({
    orderBy: { createdAt: "desc" },
    select: { traceCode: true },
  });
  return `BANCO-${String((Number(latest?.traceCode.split("-").at(-1)) || 0) + 1).padStart(4, "0")}`;
}

async function appendLedgerEntry(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    supplierId: string;
    entryType: SupplierLedgerEntryType;
    currency: "ARS" | "USD" | "EUR";
    exchangeRate: number;
    debitAmount?: number;
    creditAmount?: number;
    description: string;
    referenceType: string;
    referenceId: string;
    occurredAt: Date;
    dueDate?: Date | null;
  },
) {
  const lastEntry = await tx.supplierLedgerEntry.findFirst({
    where: { companyId: input.companyId, supplierId: input.supplierId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    select: { balanceAfter: true },
  });

  const balanceBefore = toNumber(lastEntry?.balanceAfter);
  const debitAmount = input.debitAmount ?? 0;
  const creditAmount = input.creditAmount ?? 0;
  const balanceAfter = balanceBefore + debitAmount - creditAmount;

  await tx.supplierLedgerEntry.create({
    data: {
      companyId: input.companyId,
      supplierId: input.supplierId,
      entryType: input.entryType,
      currency: input.currency,
      exchangeRate: decimalRate(input.exchangeRate),
      debitAmount: decimalAmount(debitAmount),
      creditAmount: decimalAmount(creditAmount),
      balanceAfter: decimalAmount(balanceAfter),
      description: input.description,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      occurredAt: input.occurredAt,
      dueDate: input.dueDate ?? null,
    },
  });

  await tx.supplier.update({
    where: { id: input.supplierId },
    data: { currentBalance: decimalAmount(balanceAfter) },
  });
}

async function createAttachmentRecords(
  tx: Prisma.TransactionClient,
  input: {
    companyId: string;
    ownerType: AttachmentOwnerType;
    ownerId: string;
    files: File[];
    ownerSegment: string;
  },
) {
  const stored = await persistAttachments({
    companyId: input.companyId,
    ownerSegment: input.ownerSegment,
    files: input.files,
  });

  if (stored.length === 0) {
    return;
  }

  await tx.fileAttachment.createMany({
    data: stored.map((file) => ({
      companyId: input.companyId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      fileName: file.fileName,
      contentType: file.contentType,
      sizeBytes: file.sizeBytes,
      storageProvider: file.storageProvider,
      storageBucket: file.storageBucket,
      storageKey: file.storageKey,
      publicUrl: file.publicUrl,
    })),
  });
}

export async function createSupplierInvoice(context: AppContext, formData: FormData) {
  requirePermission(context, "treasury.write");

  const supplierId = String(formData.get("supplierId") ?? "");
  const documentNumber = String(formData.get("documentNumber") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const issueDate = new Date(String(formData.get("issueDate") ?? new Date().toISOString()));
  const dueDateValue = String(formData.get("dueDate") ?? "").trim();
  const currency = String(formData.get("currency") ?? "ARS") as "ARS" | "USD" | "EUR";
  const exchangeRate = Number(formData.get("exchangeRate") ?? 1);
  const totalAmount = Number(formData.get("totalAmount") ?? 0);
  const files = getFiles(formData);

  if (!supplierId || !documentNumber || !description || totalAmount <= 0) {
    throw new Error("Completá proveedor, número, descripción e importe para registrar la compra.");
  }

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.supplierInvoice.create({
      data: {
        companyId: context.company.id,
        supplierId,
        documentNumber,
        issueDate,
        dueDate: dueDateValue ? new Date(dueDateValue) : null,
        description,
        currency,
        exchangeRate: decimalRate(exchangeRate),
        totalAmount: decimalAmount(totalAmount),
        openAmount: decimalAmount(totalAmount),
      },
    });

    await appendLedgerEntry(tx, {
      companyId: context.company.id,
      supplierId,
      entryType: SupplierLedgerEntryType.INVOICE,
      currency,
      exchangeRate,
      debitAmount: totalAmount,
      description: `Compra ${documentNumber} · ${description}`,
      referenceType: "SUPPLIER_INVOICE",
      referenceId: invoice.id,
      occurredAt: issueDate,
      dueDate: dueDateValue ? new Date(dueDateValue) : null,
    });

    await createAttachmentRecords(tx, {
      companyId: context.company.id,
      ownerType: AttachmentOwnerType.SUPPLIER_INVOICE,
      ownerId: invoice.id,
      files,
      ownerSegment: `supplier-invoices/${invoice.id}`,
    });
  });

  revalidatePath("/tesoreria");
  revalidatePath("/reportes/tesoreria");
}

export async function createCashMovement(context: AppContext, formData: FormData) {
  requirePermission(context, "treasury.write");

  const cashBoxId = String(formData.get("cashBoxId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "").trim() || null;
  const direction = String(formData.get("direction") ?? "OUT") as TreasuryMovementDirection;
  const movementType = String(formData.get("movementType") ?? "ADJUSTMENT") as CashMovementType;
  const amount = Number(formData.get("amount") ?? 0);
  const currency = String(formData.get("currency") ?? "ARS") as "ARS" | "USD" | "EUR";
  const exchangeRate = Number(formData.get("exchangeRate") ?? 1);
  const movementDate = new Date(String(formData.get("movementDate") ?? new Date().toISOString()));
  const description = String(formData.get("description") ?? "").trim();
  const files = getFiles(formData);

  if (!cashBoxId || !description || amount <= 0) {
    throw new Error("Completá caja, descripción e importe para registrar el movimiento.");
  }

  await prisma.$transaction(async (tx) => {
    const traceCode = await getNextSequence(tx, "cash");
    const movement = await tx.cashMovement.create({
      data: {
        companyId: context.company.id,
        cashBoxId,
        supplierId,
        direction,
        movementType,
        amount: decimalAmount(amount),
        currency,
        exchangeRate: decimalRate(exchangeRate),
        movementDate,
        description,
        referenceType: "MANUAL_CASH",
        referenceId: traceCode,
        traceCode,
      },
    });

    await createAttachmentRecords(tx, {
      companyId: context.company.id,
      ownerType: AttachmentOwnerType.CASH_MOVEMENT,
      ownerId: movement.id,
      files,
      ownerSegment: `cash-movements/${movement.id}`,
    });
  });

  revalidatePath("/tesoreria");
  revalidatePath("/reportes/tesoreria");
}

export async function createBankMovement(context: AppContext, formData: FormData) {
  requirePermission(context, "treasury.write");

  const bankAccountId = String(formData.get("bankAccountId") ?? "");
  const supplierId = String(formData.get("supplierId") ?? "").trim() || null;
  const direction = String(formData.get("direction") ?? "OUT") as TreasuryMovementDirection;
  const movementType = String(formData.get("movementType") ?? "ADJUSTMENT") as BankMovementType;
  const amount = Number(formData.get("amount") ?? 0);
  const currency = String(formData.get("currency") ?? "ARS") as "ARS" | "USD" | "EUR";
  const exchangeRate = Number(formData.get("exchangeRate") ?? 1);
  const movementDate = new Date(String(formData.get("movementDate") ?? new Date().toISOString()));
  const description = String(formData.get("description") ?? "").trim();
  const externalReference = String(formData.get("externalReference") ?? "").trim() || null;
  const files = getFiles(formData);

  if (!bankAccountId || !description || amount <= 0) {
    throw new Error("Completá banco, descripción e importe para registrar el movimiento bancario.");
  }

  await prisma.$transaction(async (tx) => {
    const traceCode = await getNextSequence(tx, "bank");
    const movement = await tx.bankMovement.create({
      data: {
        companyId: context.company.id,
        bankAccountId,
        supplierId,
        direction,
        movementType,
        amount: decimalAmount(amount),
        currency,
        exchangeRate: decimalRate(exchangeRate),
        movementDate,
        description,
        referenceType: "MANUAL_BANK",
        referenceId: traceCode,
        traceCode,
        externalReference,
      },
    });

    await createAttachmentRecords(tx, {
      companyId: context.company.id,
      ownerType: AttachmentOwnerType.BANK_MOVEMENT,
      ownerId: movement.id,
      files,
      ownerSegment: `bank-movements/${movement.id}`,
    });
  });

  revalidatePath("/tesoreria");
  revalidatePath("/reportes/tesoreria");
}

export async function createSupplierPayment(context: AppContext, formData: FormData) {
  requirePermission(context, "treasury.pay");

  const supplierId = String(formData.get("supplierId") ?? "");
  const paymentDate = new Date(String(formData.get("paymentDate") ?? new Date().toISOString()));
  const totalAmount = Number(formData.get("totalAmount") ?? 0);
  const currency = String(formData.get("currency") ?? "ARS") as "ARS" | "USD" | "EUR";
  const exchangeRate = Number(formData.get("exchangeRate") ?? 1);
  const paymentMethod = String(formData.get("paymentMethod") ?? "BANK_TRANSFER") as PaymentMethod;
  const cashBoxId = String(formData.get("cashBoxId") ?? "").trim() || null;
  const bankAccountId = String(formData.get("bankAccountId") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const files = getFiles(formData);
  const allocations = Array.from(formData.entries())
    .filter(([key, value]) => key.startsWith("apply_") && Number(value) > 0)
    .map(([key, value]) => ({ invoiceId: key.replace("apply_", ""), amount: Number(value) }));

  if (!supplierId || totalAmount <= 0) {
    throw new Error("Indicá proveedor e importe total del pago.");
  }

  if (paymentMethod === "CASH" && !cashBoxId) {
    throw new Error("Los pagos en efectivo requieren una caja origen.");
  }

  if (paymentMethod !== "CASH" && !bankAccountId) {
    throw new Error("Los pagos no efectivo requieren una cuenta bancaria origen.");
  }

  await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.findFirst({
      where: { id: supplierId, companyId: context.company.id },
    });

    if (!supplier) {
      throw new Error("El proveedor no existe para la empresa activa.");
    }

    const paymentNumber = await getNextSequence(tx, "payment");
    const validInvoices = await tx.supplierInvoice.findMany({
      where: {
        id: { in: allocations.map((allocation) => allocation.invoiceId) },
        companyId: context.company.id,
        supplierId,
      },
    });

    const allocationsTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    if (allocationsTotal - totalAmount > 0.0001) {
      throw new Error("La imputación supera el importe total del pago.");
    }

    const payment = await tx.supplierPayment.create({
      data: {
        companyId: context.company.id,
        supplierId,
        paymentNumber,
        paymentDate,
        currency,
        exchangeRate: decimalRate(exchangeRate),
        totalAmount: decimalAmount(totalAmount),
        paymentMethod,
        cashBoxId,
        bankAccountId,
        sourceReferenceType: paymentMethod === "CASH" ? "CASH_BOX" : "BANK_ACCOUNT",
        sourceReferenceId: cashBoxId ?? bankAccountId,
        notes,
      },
    });

    for (const allocation of allocations) {
      const invoice = validInvoices.find((candidate) => candidate.id === allocation.invoiceId);
      if (!invoice) {
        continue;
      }

      const appliedAmount = Math.min(allocation.amount, toNumber(invoice.openAmount));
      const nextOpenAmount = Math.max(toNumber(invoice.openAmount) - appliedAmount, 0);

      await tx.supplierPaymentItem.create({
        data: {
          paymentId: payment.id,
          supplierInvoiceId: invoice.id,
          amount: decimalAmount(appliedAmount),
          description: `Imputación ${invoice.documentNumber}`,
        },
      });

      await tx.supplierInvoice.update({
        where: { id: invoice.id },
        data: {
          openAmount: decimalAmount(nextOpenAmount),
          status: supplierInvoiceStatus(nextOpenAmount, toNumber(invoice.totalAmount)),
        },
      });
    }

    const advanceAmount = Math.max(totalAmount - allocationsTotal, 0);
    if (advanceAmount > 0) {
      await tx.supplierPaymentItem.create({
        data: {
          paymentId: payment.id,
          amount: decimalAmount(advanceAmount),
          description: "Anticipo no imputado",
        },
      });
    }

    await appendLedgerEntry(tx, {
      companyId: context.company.id,
      supplierId,
      entryType: SupplierLedgerEntryType.PAYMENT,
      currency,
      exchangeRate,
      creditAmount: totalAmount,
      description: `Pago ${payment.paymentNumber}${notes ? ` · ${notes}` : ""}`,
      referenceType: "SUPPLIER_PAYMENT",
      referenceId: payment.id,
      occurredAt: paymentDate,
    });

    if (cashBoxId) {
      await tx.cashMovement.create({
        data: {
          companyId: context.company.id,
          cashBoxId,
          supplierId,
          paymentId: payment.id,
          direction: TreasuryMovementDirection.OUT,
          movementType: CashMovementType.PAYMENT,
          amount: decimalAmount(totalAmount),
          currency,
          exchangeRate: decimalRate(exchangeRate),
          movementDate: paymentDate,
          description: `Pago proveedor ${payment.paymentNumber}`,
          referenceType: "SUPPLIER_PAYMENT",
          referenceId: payment.id,
          traceCode: `PAGO-CAJA-${payment.paymentNumber}`,
        },
      });
    }

    if (bankAccountId) {
      await tx.bankMovement.create({
        data: {
          companyId: context.company.id,
          bankAccountId,
          supplierId,
          paymentId: payment.id,
          direction: TreasuryMovementDirection.OUT,
          movementType: BankMovementType.PAYMENT,
          amount: decimalAmount(totalAmount),
          currency,
          exchangeRate: decimalRate(exchangeRate),
          movementDate: paymentDate,
          description: `Pago proveedor ${payment.paymentNumber}`,
          referenceType: "SUPPLIER_PAYMENT",
          referenceId: payment.id,
          traceCode: `PAGO-BANCO-${payment.paymentNumber}`,
          externalReference: notes,
        },
      });
    }

    await createAttachmentRecords(tx, {
      companyId: context.company.id,
      ownerType: AttachmentOwnerType.SUPPLIER_PAYMENT,
      ownerId: payment.id,
      files,
      ownerSegment: `supplier-payments/${payment.id}`,
    });
  });

  revalidatePath("/tesoreria");
  revalidatePath("/reportes/tesoreria");
}
