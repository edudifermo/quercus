import { AccountingModule } from "@prisma/client";
import { z } from "zod";

export const ACCOUNTING_SOURCE_ENTITY_TYPES = [
  "SUPPLIER",
  "SUPPLIER_INVOICE",
  "SUPPLIER_PAYMENT",
  "CLIENT",
  "COMMERCIAL_DOCUMENT",
  "COMMERCIAL_RECEIPT",
  "CASH_BOX",
  "CASH_MOVEMENT",
  "BANK_ACCOUNT",
  "BANK_MOVEMENT",
  "ITEM",
  "STOCK_MOVEMENT",
  "PRODUCTION_ORDER",
] as const;

export const ACCOUNTING_OPERATION_TYPES = [
  "OPENING",
  "PURCHASE_INVOICE",
  "SUPPLIER_PAYMENT",
  "SALES_DOCUMENT",
  "CUSTOMER_RECEIPT",
  "CASH_ADJUSTMENT",
  "BANK_ADJUSTMENT",
  "STOCK_OPENING",
  "PRODUCTION_CONSUMPTION",
  "PRODUCTION_OUTPUT",
  "MANUAL",
] as const;

export const accountingRuleContextSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  module: z.nativeEnum(AccountingModule),
  sourceEntityType: z.string().trim().min(1, "sourceEntityType is required"),
  operationType: z.string().trim().min(1, "operationType is required"),
  movementType: z.string().trim().min(1).optional(),
});

export const accountingEntryLineDraftSchema = z.object({
  accountId: z.string().min(1, "accountId is required"),
  lineNumber: z.number().int().positive().default(1),
  description: z.string().trim().max(240).optional(),
  debitAmount: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
  sourceEntityType: z.string().trim().optional(),
  sourceEntityId: z.string().trim().optional(),
});

export const accountingEntryDraftSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  sourceModule: z.nativeEnum(AccountingModule),
  sourceEntityType: z.string().trim().min(1, "sourceEntityType is required"),
  sourceEntityId: z.string().trim().min(1, "sourceEntityId is required"),
  operationType: z.string().trim().optional(),
  description: z.string().trim().min(1, "description is required"),
  lines: z.array(accountingEntryLineDraftSchema).min(1, "At least one line is required"),
});

export type AccountingRuleContext = z.infer<typeof accountingRuleContextSchema>;
export type AccountingEntryDraft = z.infer<typeof accountingEntryDraftSchema>;
export type AccountingEntryLineDraft = z.infer<typeof accountingEntryLineDraftSchema>;
