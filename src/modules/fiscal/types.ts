import {
  FiscalDocumentStatus,
  FiscalDocumentType,
  FiscalEnvironment,
  FiscalIvaCondition,
  FiscalOperationType,
  FiscalPointOfSaleUse,
  FiscalProcessingStatus,
  GrossIncomeCondition,
  Prisma,
} from "@prisma/client";
import { z } from "zod";

export const CUIT_LENGTH = 11;
export const FISCAL_POINT_OF_SALE_MIN = 1;
export const FISCAL_POINT_OF_SALE_MAX = 99999;

export const fiscalConfigurationInputSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  cuit: z.string().min(1, "cuit is required"),
  legalName: z.string().trim().min(1, "legalName is required").max(160),
  ivaCondition: z.nativeEnum(FiscalIvaCondition),
  grossIncomeCondition: z.nativeEnum(GrossIncomeCondition).optional().nullable(),
  taxAddress: z.string().trim().max(240).optional().nullable(),
  fiscalEnvironment: z.nativeEnum(FiscalEnvironment).default(FiscalEnvironment.TESTING),
  integrationEnabled: z.boolean().default(false),
  isActive: z.boolean().default(true),
  certificateReference: z.string().trim().max(240).optional().nullable(),
  privateKeyReference: z.string().trim().max(240).optional().nullable(),
  technicalReference: z.string().trim().max(240).optional().nullable(),
  taxpayerReference: z.string().trim().max(240).optional().nullable(),
  integrationParameters: z.custom<Prisma.JsonValue>().optional(),
});

export const fiscalPointOfSaleLookupSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  pointOfSaleNumber: z.number().int().min(FISCAL_POINT_OF_SALE_MIN).max(FISCAL_POINT_OF_SALE_MAX).optional(),
  use: z.nativeEnum(FiscalPointOfSaleUse).optional(),
  onlyActive: z.boolean().default(true),
});

export const fiscalDocumentConsistencySchema = z.object({
  fiscalDocumentType: z.nativeEnum(FiscalDocumentType),
  fiscalStatus: z.nativeEnum(FiscalDocumentStatus).default(FiscalDocumentStatus.DRAFT),
  pointOfSaleNumber: z.number().int().min(FISCAL_POINT_OF_SALE_MIN).max(FISCAL_POINT_OF_SALE_MAX),
  pointOfSaleActive: z.boolean(),
  integrationEnabled: z.boolean(),
  fiscalConfigActive: z.boolean(),
});

export const buildFiscalRequestDraftSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  sourceEntityType: z.string().trim().min(1, "sourceEntityType is required").max(80),
  sourceEntityId: z.string().trim().min(1, "sourceEntityId is required").max(80),
  fiscalDocumentType: z.nativeEnum(FiscalDocumentType),
  pointOfSaleNumber: z.number().int().min(FISCAL_POINT_OF_SALE_MIN).max(FISCAL_POINT_OF_SALE_MAX),
  fiscalStatus: z.nativeEnum(FiscalDocumentStatus).default(FiscalDocumentStatus.READY),
  payload: z.custom<Prisma.JsonValue>().optional(),
  userId: z.string().trim().optional(),
});

export const registerFiscalProcessingLogSchema = z.object({
  companyId: z.string().min(1, "companyId is required"),
  fiscalConfigId: z.string().trim().optional(),
  fiscalDocumentId: z.string().trim().optional(),
  fiscalPointOfSaleId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  sourceEntityType: z.string().trim().optional(),
  sourceEntityId: z.string().trim().optional(),
  operationType: z.nativeEnum(FiscalOperationType),
  status: z.nativeEnum(FiscalProcessingStatus).default(FiscalProcessingStatus.PENDING),
  requestPayload: z.custom<Prisma.JsonValue>().optional(),
  responsePayload: z.custom<Prisma.JsonValue>().optional(),
  errorCode: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().max(500).optional(),
  processedAt: z.date().optional(),
});

export type FiscalConfigurationInput = z.infer<typeof fiscalConfigurationInputSchema>;
export type FiscalPointOfSaleLookup = z.infer<typeof fiscalPointOfSaleLookupSchema>;
export type FiscalDocumentConsistencyInput = z.infer<typeof fiscalDocumentConsistencySchema>;
export type BuildFiscalRequestDraftInput = z.infer<typeof buildFiscalRequestDraftSchema>;
export type RegisterFiscalProcessingLogInput = z.infer<typeof registerFiscalProcessingLogSchema>;

export type FiscalValidationResult<T> = {
  value: T;
  warnings: string[];
};

export type FiscalRequestDraft = {
  companyId: string;
  fiscalConfigId: string;
  environment: FiscalEnvironment;
  sourceEntityType: string;
  sourceEntityId: string;
  fiscalDocumentType: FiscalDocumentType;
  fiscalStatus: FiscalDocumentStatus;
  pointOfSaleNumber: number;
  taxpayer: {
    cuit: string;
    legalName: string;
    ivaCondition: FiscalIvaCondition;
  };
  integration: {
    enabled: boolean;
    certificateReference?: string | null;
    technicalReference?: string | null;
  };
  payload?: Prisma.JsonValue;
  generatedAt: Date;
};
