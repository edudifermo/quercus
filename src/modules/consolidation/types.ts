import {
  CommercialDocumentStatus,
  CommercialReceiptStatus,
  ConsolidationAccessRole,
  CurrencyCode,
  PaymentStatus,
  SupplierDocumentStatus,
} from "@prisma/client";
import { z } from "zod";

export const consolidatedQuerySchema = z.object({
  userId: z.string().min(1),
  consolidationGroupId: z.string().min(1),
  companyId: z.string().trim().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  currency: z.nativeEnum(CurrencyCode).optional(),
  supplierInvoiceStatus: z.array(z.nativeEnum(SupplierDocumentStatus)).optional(),
  paymentStatus: z.array(z.nativeEnum(PaymentStatus)).optional(),
  documentStatus: z.array(z.nativeEnum(CommercialDocumentStatus)).optional(),
  receiptStatus: z.array(z.nativeEnum(CommercialReceiptStatus)).optional(),
});

export type ConsolidatedQueryInput = z.infer<typeof consolidatedQuerySchema>;

export type ConsolidationGroupForUser = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  isActive: boolean;
  role: ConsolidationAccessRole;
  companies: Array<{
    companyId: string;
    companyName: string;
    companySlug: string;
    sortOrder: number | null;
  }>;
};

export type ConsolidatedTreasurySummary = {
  companyRows: Array<{
    companyId: string;
    companyName: string;
    cashBalance: number;
    bankBalance: number;
    totalLiquidity: number;
  }>;
  consolidated: {
    cashBalance: number;
    bankBalance: number;
    totalLiquidity: number;
  };
};

export type ConsolidatedPayablesSummary = {
  companyRows: Array<{
    companyId: string;
    companyName: string;
    pendingInvoices: number;
    paymentsInPeriod: number;
    supplierDebt: number;
  }>;
  consolidated: {
    pendingInvoices: number;
    paymentsInPeriod: number;
    supplierDebt: number;
  };
};

export type ConsolidatedReceivablesSummary = {
  companyRows: Array<{
    companyId: string;
    companyName: string;
    clientCurrentAccount: number;
    collectionsInPeriod: number;
    clients: Array<{
      clientId: string;
      clientName: string;
      openAmount: number;
    }>;
  }>;
  consolidated: {
    clientCurrentAccount: number;
    collectionsInPeriod: number;
  };
};

export type ConsolidatedCommercialSummary = {
  companyRows: Array<{
    companyId: string;
    companyName: string;
    documentsIssued: number;
    salesTotal: number;
    collectionsInPeriod: number;
  }>;
  consolidated: {
    documentsIssued: number;
    salesTotal: number;
    collectionsInPeriod: number;
  };
};

export type ConsolidatedCompanyBreakdown = Array<{
  companyId: string;
  companyName: string;
  liquidity: number;
  payablesDebt: number;
  receivablesBalance: number;
  salesInPeriod: number;
  collectionsInPeriod: number;
  liquidityParticipationPct: number;
  salesParticipationPct: number;
}>;
