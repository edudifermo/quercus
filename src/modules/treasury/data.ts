import { prisma } from "@/infrastructure/database/prisma";
import { formatDate, signByDirection, toNumber } from "@/modules/treasury/utils";

export type TreasuryCurrentAccountItem = {
  supplierName: string;
  balance: number;
  lines: Array<{
    id: string;
    description: string;
    occurredAt: Date;
    referenceType: string;
    balanceAfter: unknown;
    currency: string;
  }>;
};

export type TreasuryReportsData = {
  currentAccount: Record<string, TreasuryCurrentAccountItem>;
  dailyCash: Record<string, { inflow: number; outflow: number; net: number }>;
  bankMovements: Array<{
    id: string;
    movementDate: Date;
    description: string;
    amount: unknown;
    currency: string;
    isReconciled: boolean;
    bankAccount: { bankName: string; accountName: string };
  }>;
  payments: Array<{
    id: string;
    paymentNumber: string;
    paymentDate: Date;
    totalAmount: unknown;
    currency: string;
    paymentMethod: string;
    supplier: { name: string };
    items: Array<{ supplierInvoice: { documentNumber: string } | null; description: string | null }>;
  }>;
  reconciliationBase: Array<{
    id: string;
    bankAccount: string;
    date: Date;
    description: string;
    amount: number;
    externalReference: string | null;
    isReconciled: boolean;
    reference: string;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    ownerType: string;
    publicUrl: string;
    uploadedAt: Date;
  }>;
};

export async function getTreasuryDashboard(companyId: string) {
  const [suppliers, cashBoxes, bankAccounts, openInvoices, recentPayments, cashMovements, bankMovements, attachments] =
    await Promise.all([
      prisma.supplier.findMany({
        where: { companyId },
        orderBy: { name: "asc" },
      }),
      prisma.cashBox.findMany({
        where: { companyId, isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.bankAccount.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ bankName: "asc" }, { accountName: "asc" }],
      }),
      prisma.supplierInvoice.findMany({
        where: { companyId, openAmount: { gt: 0 } },
        include: { supplier: true },
        orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
      }),
      prisma.supplierPayment.findMany({
        where: { companyId },
        include: {
          supplier: true,
          cashBox: true,
          bankAccount: true,
          items: { include: { supplierInvoice: true } },
        },
        orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        take: 8,
      }),
      prisma.cashMovement.findMany({
        where: { companyId },
        include: { cashBox: true, supplier: true },
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
        take: 10,
      }),
      prisma.bankMovement.findMany({
        where: { companyId },
        include: { bankAccount: true, supplier: true },
        orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
        take: 10,
      }),
      prisma.fileAttachment.findMany({
        where: { companyId },
        orderBy: { uploadedAt: "desc" },
        take: 20,
      }),
    ]);

  const cashByBox = cashBoxes.map((cashBox) => ({
    ...cashBox,
    currentBalance:
      toNumber(cashBox.openingBalance) +
      cashMovements
        .filter((movement) => movement.cashBoxId === cashBox.id)
        .reduce<number>(
          (sum, movement) => sum + signByDirection(movement.direction, toNumber(movement.amount)),
          0,
        ),
  }));

  const bankByAccount = bankAccounts.map((bankAccount) => ({
    ...bankAccount,
    currentBalance:
      toNumber(bankAccount.openingBalance) +
      bankMovements
        .filter((movement) => movement.bankAccountId === bankAccount.id)
        .reduce<number>(
          (sum, movement) => sum + signByDirection(movement.direction, toNumber(movement.amount)),
          0,
        ),
  }));

  const paymentsSummary = recentPayments.reduce(
    (acc: { total: number }, payment) => {
      acc.total += toNumber(payment.totalAmount);
      return acc;
    },
    { total: 0 },
  );

  return {
    suppliers,
    cashBoxes: cashByBox,
    bankAccounts: bankByAccount,
    openInvoices,
    recentPayments,
    cashMovements,
    bankMovements,
    attachments,
    summaries: {
      supplierBalance: suppliers.reduce<number>(
        (sum, supplier) => sum + toNumber(supplier.currentBalance),
        0,
      ),
      openInvoices: openInvoices.reduce<number>(
        (sum, invoice) => sum + toNumber(invoice.openAmount),
        0,
      ),
      payments: paymentsSummary.total,
      unreconciledBankItems: bankMovements.filter((movement) => !movement.isReconciled).length,
    },
  };
}

export async function getTreasuryReports(companyId: string) {
  const [ledgerEntries, cashMovements, bankMovements, payments, attachments] = await Promise.all([
    prisma.supplierLedgerEntry.findMany({
      where: { companyId },
      include: { supplier: true },
      orderBy: [{ supplier: { name: "asc" } }, { occurredAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.cashMovement.findMany({
      where: { companyId },
      include: { cashBox: true, supplier: true },
      orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.bankMovement.findMany({
      where: { companyId },
      include: { bankAccount: true, supplier: true },
      orderBy: [{ movementDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.supplierPayment.findMany({
      where: { companyId },
      include: { supplier: true, items: { include: { supplierInvoice: true } } },
      orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.fileAttachment.findMany({
      where: { companyId },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);

  const currentAccount = ledgerEntries.reduce<Record<string, TreasuryCurrentAccountItem>>((acc, entry) => {
    const existing = acc[entry.supplierId] ?? {
      supplierName: entry.supplier.name,
      balance: 0,
      lines: [],
    };

    existing.balance = toNumber(entry.balanceAfter);
    existing.lines.push(entry);
    acc[entry.supplierId] = existing;
    return acc;
  }, {});

  const dailyCash = cashMovements.reduce<Record<string, { inflow: number; outflow: number; net: number }>>(
    (acc, movement) => {
      const key = `${formatDate(movement.movementDate)} · ${movement.cashBox.name}`;
      const existing = acc[key] ?? { inflow: 0, outflow: 0, net: 0 };
      const amount = toNumber(movement.amount);
      if (movement.direction === "IN") {
        existing.inflow += amount;
        existing.net += amount;
      } else {
        existing.outflow += amount;
        existing.net -= amount;
      }
      acc[key] = existing;
      return acc;
    },
    {},
  );

  const reconciliationBase = bankMovements.map((movement) => ({
    id: movement.id,
    bankAccount: `${movement.bankAccount.bankName} · ${movement.bankAccount.accountName}`,
    date: movement.movementDate,
    description: movement.description,
    amount: signByDirection(movement.direction, toNumber(movement.amount)),
    externalReference: movement.externalReference,
    isReconciled: movement.isReconciled,
    reference: `${movement.referenceType}:${movement.referenceId}`,
  }));

  return {
    currentAccount,
    dailyCash,
    bankMovements,
    payments,
    reconciliationBase,
    attachments,
  };
}
