import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import {
  type AccountingEntryDraft,
  type AccountingRuleContext,
  accountingEntryDraftSchema,
  accountingRuleContextSchema,
} from "@/modules/accounting/types";

export async function getAccessibleAccountingPlans(companyId: string) {
  return prisma.companyAccountingPlan.findMany({
    where: {
      companyId,
      isActive: true,
    },
    include: {
      plan: {
        include: {
          _count: {
            select: { accounts: true },
          },
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { assignedAt: "asc" }],
  });
}

export async function ensurePostingAccountIsAvailable(
  companyId: string,
  accountId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const account = await db.accountingAccount.findFirst({
    where: {
      id: accountId,
      isActive: true,
      allowsDirectPosting: true,
      OR: [
        { companyId },
        {
          plan: {
            companyLinks: {
              some: {
                companyId,
                isActive: true,
              },
            },
          },
        },
      ],
    },
    include: {
      plan: true,
    },
  });

  if (!account) {
    throw new Error("La cuenta contable indicada no está activa o no pertenece a un plan disponible para la empresa.");
  }

  return account;
}

export async function resolveAccountingPostingRule(
  input: AccountingRuleContext,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const context = accountingRuleContextSchema.parse(input);

  if (context.movementType) {
    const ruleWithMovementType = await db.accountingPostingRule.findFirst({
      where: {
        companyId: context.companyId,
        module: context.module,
        sourceEntityType: context.sourceEntityType,
        operationType: context.operationType,
        movementType: context.movementType,
        isActive: true,
      },
      include: {
        postingType: true,
        defaultDebitAccount: true,
        defaultCreditAccount: true,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    if (ruleWithMovementType) {
      return ruleWithMovementType;
    }
  }

  return db.accountingPostingRule.findFirst({
    where: {
      companyId: context.companyId,
      module: context.module,
      sourceEntityType: context.sourceEntityType,
      operationType: context.operationType,
      movementType: null,
      isActive: true,
    },
    include: {
      postingType: true,
      defaultDebitAccount: true,
      defaultCreditAccount: true,
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
}

export function validateDraftAccountingEntry(input: AccountingEntryDraft) {
  const draft = accountingEntryDraftSchema.parse(input);

  const totals = draft.lines.reduce(
    (acc, line) => {
      if (line.debitAmount > 0 && line.creditAmount > 0) {
        throw new Error("Cada línea contable debe informar débito o crédito, pero no ambos al mismo tiempo.");
      }

      if (line.debitAmount === 0 && line.creditAmount === 0) {
        throw new Error("Cada línea contable debe tener un importe distinto de cero.");
      }

      acc.debit += line.debitAmount;
      acc.credit += line.creditAmount;
      return acc;
    },
    { debit: 0, credit: 0 },
  );

  if (Number(totals.debit.toFixed(2)) !== Number(totals.credit.toFixed(2))) {
    throw new Error("El borrador del asiento no está balanceado entre débito y crédito.");
  }

  return {
    draft,
    totals,
  };
}
