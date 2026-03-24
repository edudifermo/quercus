import {
  ClientType,
  CommercialDocumentStatus,
  CommercialDocumentType,
  CommercialReceiptStatus,
  CurrencyCode,
  PaymentMethod,
} from "@prisma/client";
import { z } from "zod";

export const clientUpsertSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  code: z.string().trim().max(40).optional(),
  legalName: z.string().trim().min(2, "legalName is required").max(160),
  tradeName: z.string().trim().max(160).optional(),
  clientType: z.nativeEnum(ClientType).default(ClientType.COMPANY),
  taxId: z.string().trim().max(20).optional(),
  email: z.string().trim().email().max(160).optional(),
  phone: z.string().trim().max(80).optional(),
  commercialAddress: z.string().trim().max(240).optional(),
  fiscalAddress: z.string().trim().max(240).optional(),
  primaryContactName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
  defaultCurrency: z.nativeEnum(CurrencyCode).default(CurrencyCode.ARS),
  receivableAccountId: z.string().trim().optional(),
});

export const commercialDocumentLineInputSchema = z
  .object({
    itemId: z.string().trim().optional(),
    description: z.string().trim().min(2).max(240),
    quantity: z.number().positive(),
    unit: z.string().trim().max(40).optional(),
    unitPrice: z.number().min(0),
    discountAmount: z.number().min(0).default(0),
    taxAmount: z.number().min(0).default(0),
    totalAmount: z.number().min(0).optional(),
  })
  .superRefine((line, ctx) => {
    const netLine = Number((line.quantity * line.unitPrice - line.discountAmount + line.taxAmount).toFixed(2));
    if (line.totalAmount !== undefined && Number(line.totalAmount.toFixed(2)) !== netLine) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["totalAmount"],
        message: "La línea no es consistente con cantidad, precio, descuento e impuestos.",
      });
    }
  });

export const createCommercialDocumentSchema = z
  .object({
    companyId: z.string().min(1, "companyId is required"),
    clientId: z.string().min(1, "clientId is required"),
    createdById: z.string().trim().optional(),
    documentType: z.nativeEnum(CommercialDocumentType),
    documentNumber: z.string().trim().min(1).max(80),
    issueDate: z.date(),
    dueDate: z.date().optional(),
    currency: z.nativeEnum(CurrencyCode).default(CurrencyCode.ARS),
    exchangeRate: z.number().positive().default(1),
    status: z.nativeEnum(CommercialDocumentStatus).default(CommercialDocumentStatus.ISSUED),
    isFiscalizable: z.boolean().default(false),
    notes: z.string().trim().max(1000).optional(),
    fiscalDocumentId: z.string().trim().optional(),
    accountingRuleId: z.string().trim().optional(),
    lines: z.array(commercialDocumentLineInputSchema).min(1),
    subtotalAmount: z.number().min(0).optional(),
    taxAmount: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(),
  })
  .superRefine((document, ctx) => {
    if (document.dueDate && document.dueDate < document.issueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dueDate"],
        message: "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
      });
    }
  });

export const applyReceiptToDocumentSchema = z.object({
  documentId: z.string().min(1),
  appliedAmount: z.number().positive(),
});

export const createCommercialReceiptSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  clientId: z.string().min(1, "clientId is required"),
  createdById: z.string().trim().optional(),
  receiptNumber: z.string().trim().min(1).max(80),
  receiptDate: z.date(),
  currency: z.nativeEnum(CurrencyCode).default(CurrencyCode.ARS),
  exchangeRate: z.number().positive().default(1),
  totalAmount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  status: z.nativeEnum(CommercialReceiptStatus).default(CommercialReceiptStatus.POSTED),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  accountingRuleId: z.string().trim().optional(),
  applications: z.array(applyReceiptToDocumentSchema).default([]),
});

export type ClientUpsertInput = z.infer<typeof clientUpsertSchema>;
export type CommercialDocumentLineInput = z.infer<typeof commercialDocumentLineInputSchema>;
export type CreateCommercialDocumentInput = z.infer<typeof createCommercialDocumentSchema>;
export type ApplyReceiptToDocumentInput = z.infer<typeof applyReceiptToDocumentSchema>;
export type CreateCommercialReceiptInput = z.infer<typeof createCommercialReceiptSchema>;
