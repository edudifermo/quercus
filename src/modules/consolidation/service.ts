import {
  PaymentStatus,
  Prisma,
  SupplierDocumentStatus,
  TreasuryMovementDirection,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/modules/treasury/utils";
import {
  consolidatedQuerySchema,
  type ConsolidatedCommercialSummary,
  type ConsolidatedCompanyBreakdown,
  type ConsolidatedPayablesSummary,
  type ConsolidatedQueryInput,
  type ConsolidatedReceivablesSummary,
  type ConsolidatedTreasurySummary,
  type ConsolidationGroupForUser,
} from "@/modules/consolidation/types";

type CompanyScope = Array<{ id: string; name: string; slug: string }>;

function ensureDateRange(input: ConsolidatedQueryInput) {
  const dateFrom = input.dateFrom;
  const dateTo = input.dateTo ?? new Date();

  if (dateFrom && dateFrom > dateTo) {
    throw new Error("El rango de fechas para consolidación es inválido.");
  }

  return { dateFrom, dateTo };
}

async function resolveCompanyScope(input: ConsolidatedQueryInput): Promise<CompanyScope> {
  const groupMembership = await prisma.consolidationGroupMembership.findFirst({
    where: {
      consolidationGroupId: input.consolidationGroupId,
      userId: input.userId,
      isActive: true,
      consolidationGroup: { isActive: true },
    },
    select: { id: true },
  });

  if (!groupMembership) {
    throw new Error("El usuario no tiene acceso al grupo de consolidación solicitado.");
  }

  const groupCompanies = await prisma.consolidationGroupCompany.findMany({
    where: {
      consolidationGroupId: input.consolidationGroupId,
      isActive: true,
      ...(input.companyId ? { companyId: input.companyId } : {}),
    },
    include: {
      company: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { company: { name: "asc" } }],
  });

  if (groupCompanies.length === 0) {
    throw new Error("El grupo de consolidación no tiene empresas activas con los filtros solicitados.");
  }

  const userMemberships = await prisma.membership.findMany({
    where: {
      userId: input.userId,
      companyId: { in: groupCompanies.map((entry) => entry.companyId) },
    },
    select: { companyId: true },
  });

  const allowedCompanyIds = new Set(userMemberships.map((membership) => membership.companyId));

  const companies = groupCompanies
    .map((entry) => entry.company)
    .filter((company) => allowedCompanyIds.has(company.id));

  if (companies.length === 0) {
    throw new Error("El usuario no tiene membresías tenant activas para las empresas del grupo.");
  }

  return companies;
}

function sumSignedMovements<T extends { direction: TreasuryMovementDirection; amount: Prisma.Decimal | number }>(
  rows: T[],
) {
  return rows.reduce((acc, row) => {
    const amount = toNumber(row.amount);
    return row.direction === "IN" ? acc + amount : acc - amount;
  }, 0);
}

function consolidationWhere(input: ConsolidatedQueryInput, companyIds: string[]) {
  return {
    companyId: { in: companyIds },
    ...(input.currency ? { currency: input.currency } : {}),
  };
}

export async function getConsolidationGroupsForUser(userId: string): Promise<ConsolidationGroupForUser[]> {
  const groups = await prisma.consolidationGroupMembership.findMany({
    where: {
      userId,
      isActive: true,
      consolidationGroup: { isActive: true },
    },
    include: {
      consolidationGroup: {
        include: {
          companies: {
            where: { isActive: true },
            include: { company: true },
            orderBy: [{ sortOrder: "asc" }, { company: { name: "asc" } }],
          },
        },
      },
    },
    orderBy: [{ consolidationGroup: { name: "asc" } }],
  });

  return groups.map((membership) => ({
    id: membership.consolidationGroup.id,
    name: membership.consolidationGroup.name,
    code: membership.consolidationGroup.code,
    description: membership.consolidationGroup.description,
    isActive: membership.consolidationGroup.isActive,
    role: membership.role,
    companies: membership.consolidationGroup.companies.map((entry) => ({
      companyId: entry.company.id,
      companyName: entry.company.name,
      companySlug: entry.company.slug,
      sortOrder: entry.sortOrder,
    })),
  }));
}

export async function getConsolidatedTreasurySummary(rawInput: ConsolidatedQueryInput): Promise<ConsolidatedTreasurySummary> {
  const input = consolidatedQuerySchema.parse(rawInput);
  const { dateTo } = ensureDateRange(input);
  const companies = await resolveCompanyScope(input);
  const companyIds = companies.map((company) => company.id);

  const [cashBoxes, bankAccounts, cashMovements, bankMovements] = await Promise.all([
    prisma.cashBox.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        isActive: true,
      },
      select: { companyId: true, openingBalance: true },
    }),
    prisma.bankAccount.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        isActive: true,
      },
      select: { companyId: true, openingBalance: true },
    }),
    prisma.cashMovement.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        movementDate: { lte: dateTo },
      },
      select: { companyId: true, direction: true, amount: true },
    }),
    prisma.bankMovement.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        movementDate: { lte: dateTo },
      },
      select: { companyId: true, direction: true, amount: true },
    }),
  ]);

  const companyRows = companies.map((company) => {
    const openingCash = cashBoxes
      .filter((cashBox) => cashBox.companyId === company.id)
      .reduce((acc, row) => acc + toNumber(row.openingBalance), 0);
    const openingBank = bankAccounts
      .filter((bankAccount) => bankAccount.companyId === company.id)
      .reduce((acc, row) => acc + toNumber(row.openingBalance), 0);

    const cashBalance =
      openingCash + sumSignedMovements(cashMovements.filter((movement) => movement.companyId === company.id));
    const bankBalance =
      openingBank + sumSignedMovements(bankMovements.filter((movement) => movement.companyId === company.id));

    return {
      companyId: company.id,
      companyName: company.name,
      cashBalance,
      bankBalance,
      totalLiquidity: cashBalance + bankBalance,
    };
  });

  return {
    companyRows,
    consolidated: {
      cashBalance: companyRows.reduce((acc, row) => acc + row.cashBalance, 0),
      bankBalance: companyRows.reduce((acc, row) => acc + row.bankBalance, 0),
      totalLiquidity: companyRows.reduce((acc, row) => acc + row.totalLiquidity, 0),
    },
  };
}

export async function getConsolidatedPayablesSummary(rawInput: ConsolidatedQueryInput): Promise<ConsolidatedPayablesSummary> {
  const input = consolidatedQuerySchema.parse(rawInput);
  const { dateFrom, dateTo } = ensureDateRange(input);
  const companies = await resolveCompanyScope(input);
  const companyIds = companies.map((company) => company.id);

  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      ...consolidationWhere(input, companyIds),
      issueDate: { lte: dateTo },
      status: { in: input.supplierInvoiceStatus ?? [SupplierDocumentStatus.OPEN, SupplierDocumentStatus.PARTIAL] },
    },
    select: { companyId: true, openAmount: true },
  });

  const payments = await prisma.supplierPayment.findMany({
    where: {
      ...consolidationWhere(input, companyIds),
      paymentDate: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        lte: dateTo,
      },
      status: { in: input.paymentStatus ?? [PaymentStatus.POSTED] },
    },
    select: { companyId: true, totalAmount: true },
  });

  const companyRows = companies.map((company) => {
    const pendingInvoices = invoices
      .filter((invoice) => invoice.companyId === company.id)
      .reduce((acc, invoice) => acc + toNumber(invoice.openAmount), 0);

    const paymentsInPeriod = payments
      .filter((payment) => payment.companyId === company.id)
      .reduce((acc, payment) => acc + toNumber(payment.totalAmount), 0);

    return {
      companyId: company.id,
      companyName: company.name,
      pendingInvoices,
      paymentsInPeriod,
      supplierDebt: pendingInvoices,
    };
  });

  return {
    companyRows,
    consolidated: {
      pendingInvoices: companyRows.reduce((acc, row) => acc + row.pendingInvoices, 0),
      paymentsInPeriod: companyRows.reduce((acc, row) => acc + row.paymentsInPeriod, 0),
      supplierDebt: companyRows.reduce((acc, row) => acc + row.supplierDebt, 0),
    },
  };
}

export async function getConsolidatedReceivablesSummary(
  rawInput: ConsolidatedQueryInput,
): Promise<ConsolidatedReceivablesSummary> {
  const input = consolidatedQuerySchema.parse(rawInput);
  const { dateFrom, dateTo } = ensureDateRange(input);
  const companies = await resolveCompanyScope(input);
  const companyIds = companies.map((company) => company.id);

  const [clientOpenDocuments, collections] = await Promise.all([
    prisma.commercialDocument.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        issueDate: { lte: dateTo },
        openAmount: { gt: 0 },
        ...(input.documentStatus?.length ? { status: { in: input.documentStatus } } : {}),
      },
      select: {
        companyId: true,
        clientId: true,
        openAmount: true,
        client: { select: { legalName: true } },
      },
    }),
    prisma.commercialReceipt.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        receiptDate: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          lte: dateTo,
        },
        ...(input.receiptStatus?.length ? { status: { in: input.receiptStatus } } : {}),
      },
      select: { companyId: true, totalAmount: true },
    }),
  ]);

  const companyRows = companies.map((company) => {
    const companyClientDocs = clientOpenDocuments.filter((doc) => doc.companyId === company.id);
    const byClient = new Map<string, { clientName: string; openAmount: number }>();

    for (const row of companyClientDocs) {
      const current = byClient.get(row.clientId) ?? { clientName: row.client.legalName, openAmount: 0 };
      current.openAmount += toNumber(row.openAmount);
      byClient.set(row.clientId, current);
    }

    const clients = Array.from(byClient.entries()).map(([clientId, value]) => ({
      clientId,
      clientName: value.clientName,
      openAmount: value.openAmount,
    }));

    const clientCurrentAccount = clients.reduce((acc, client) => acc + client.openAmount, 0);
    const collectionsInPeriod = collections
      .filter((receipt) => receipt.companyId === company.id)
      .reduce((acc, receipt) => acc + toNumber(receipt.totalAmount), 0);

    return {
      companyId: company.id,
      companyName: company.name,
      clientCurrentAccount,
      collectionsInPeriod,
      clients,
    };
  });

  return {
    companyRows,
    consolidated: {
      clientCurrentAccount: companyRows.reduce((acc, row) => acc + row.clientCurrentAccount, 0),
      collectionsInPeriod: companyRows.reduce((acc, row) => acc + row.collectionsInPeriod, 0),
    },
  };
}

export async function getConsolidatedCommercialSummary(
  rawInput: ConsolidatedQueryInput,
): Promise<ConsolidatedCommercialSummary> {
  const input = consolidatedQuerySchema.parse(rawInput);
  const { dateFrom, dateTo } = ensureDateRange(input);
  const companies = await resolveCompanyScope(input);
  const companyIds = companies.map((company) => company.id);

  const [documents, collections] = await Promise.all([
    prisma.commercialDocument.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        issueDate: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          lte: dateTo,
        },
        ...(input.documentStatus?.length ? { status: { in: input.documentStatus } } : {}),
      },
      select: { companyId: true, totalAmount: true },
    }),
    prisma.commercialReceipt.findMany({
      where: {
        ...consolidationWhere(input, companyIds),
        receiptDate: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          lte: dateTo,
        },
        ...(input.receiptStatus?.length ? { status: { in: input.receiptStatus } } : {}),
      },
      select: { companyId: true, totalAmount: true },
    }),
  ]);

  const companyRows = companies.map((company) => {
    const companyDocuments = documents.filter((document) => document.companyId === company.id);
    const companyCollections = collections.filter((receipt) => receipt.companyId === company.id);

    return {
      companyId: company.id,
      companyName: company.name,
      documentsIssued: companyDocuments.length,
      salesTotal: companyDocuments.reduce((acc, document) => acc + toNumber(document.totalAmount), 0),
      collectionsInPeriod: companyCollections.reduce((acc, row) => acc + toNumber(row.totalAmount), 0),
    };
  });

  return {
    companyRows,
    consolidated: {
      documentsIssued: companyRows.reduce((acc, row) => acc + row.documentsIssued, 0),
      salesTotal: companyRows.reduce((acc, row) => acc + row.salesTotal, 0),
      collectionsInPeriod: companyRows.reduce((acc, row) => acc + row.collectionsInPeriod, 0),
    },
  };
}

export async function getConsolidatedCompanyBreakdown(
  rawInput: ConsolidatedQueryInput,
): Promise<ConsolidatedCompanyBreakdown> {
  const input = consolidatedQuerySchema.parse(rawInput);

  const [treasury, payables, receivables, commercial] = await Promise.all([
    getConsolidatedTreasurySummary(input),
    getConsolidatedPayablesSummary(input),
    getConsolidatedReceivablesSummary(input),
    getConsolidatedCommercialSummary(input),
  ]);

  const totalLiquidity = treasury.consolidated.totalLiquidity;
  const totalSales = commercial.consolidated.salesTotal;

  return treasury.companyRows.map((treasuryRow) => {
    const payablesRow = payables.companyRows.find((row) => row.companyId === treasuryRow.companyId);
    const receivablesRow = receivables.companyRows.find((row) => row.companyId === treasuryRow.companyId);
    const commercialRow = commercial.companyRows.find((row) => row.companyId === treasuryRow.companyId);

    return {
      companyId: treasuryRow.companyId,
      companyName: treasuryRow.companyName,
      liquidity: treasuryRow.totalLiquidity,
      payablesDebt: payablesRow?.supplierDebt ?? 0,
      receivablesBalance: receivablesRow?.clientCurrentAccount ?? 0,
      salesInPeriod: commercialRow?.salesTotal ?? 0,
      collectionsInPeriod: commercialRow?.collectionsInPeriod ?? 0,
      liquidityParticipationPct: totalLiquidity > 0 ? (treasuryRow.totalLiquidity / totalLiquidity) * 100 : 0,
      salesParticipationPct: totalSales > 0 ? ((commercialRow?.salesTotal ?? 0) / totalSales) * 100 : 0,
    };
  });
}
