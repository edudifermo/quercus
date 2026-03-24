import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import {
  type BuildFiscalRequestDraftInput,
  type FiscalPointOfSaleLookup,
  type RegisterFiscalProcessingLogInput,
  buildFiscalRequestDraftSchema,
  fiscalPointOfSaleLookupSchema,
  registerFiscalProcessingLogSchema,
} from "@/modules/fiscal/types";
import {
  validateFiscalConfiguration,
  validateFiscalDocumentConsistency,
} from "@/modules/fiscal/validators";

export type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

function toNullableJsonInput(value: Prisma.JsonValue | undefined): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export async function getActiveFiscalConfigForCompany(companyId: string, db: PrismaExecutor = prisma) {
  return db.fiscalConfig.findFirst({
    where: {
      companyId,
      isActive: true,
    },
    include: {
      pointsOfSale: {
        orderBy: [{ active: "desc" }, { pointOfSaleNumber: "asc" }],
      },
    },
  });
}

export async function getAvailablePointOfSale(
  input: FiscalPointOfSaleLookup,
  db: PrismaExecutor = prisma,
) {
  const lookup = fiscalPointOfSaleLookupSchema.parse(input);

  return db.fiscalPointOfSale.findFirst({
    where: {
      companyId: lookup.companyId,
      ...(lookup.pointOfSaleNumber ? { pointOfSaleNumber: lookup.pointOfSaleNumber } : {}),
      ...(lookup.use ? { use: lookup.use } : {}),
      ...(lookup.onlyActive ? { active: true } : {}),
      fiscalConfig: {
        isActive: true,
      },
    },
    include: {
      fiscalConfig: true,
    },
    orderBy: [{ active: "desc" }, { pointOfSaleNumber: "asc" }],
  });
}

export async function buildFiscalRequestDraft(
  input: BuildFiscalRequestDraftInput,
  db: PrismaExecutor = prisma,
) {
  const parsed = buildFiscalRequestDraftSchema.parse(input);
  const fiscalConfig = await getActiveFiscalConfigForCompany(parsed.companyId, db);

  if (!fiscalConfig) {
    throw new Error("La empresa no tiene una configuración fiscal activa.");
  }

  const fiscalValidation = validateFiscalConfiguration({
    companyId: fiscalConfig.companyId,
    cuit: fiscalConfig.cuit,
    legalName: fiscalConfig.legalName,
    ivaCondition: fiscalConfig.ivaCondition,
    grossIncomeCondition: fiscalConfig.grossIncomeCondition,
    taxAddress: fiscalConfig.taxAddress,
    fiscalEnvironment: fiscalConfig.fiscalEnvironment,
    integrationEnabled: fiscalConfig.integrationEnabled,
    isActive: fiscalConfig.isActive,
    certificateReference: fiscalConfig.certificateReference,
    privateKeyReference: fiscalConfig.privateKeyReference,
    technicalReference: fiscalConfig.technicalReference,
    taxpayerReference: fiscalConfig.taxpayerReference,
    integrationParameters: fiscalConfig.integrationParameters ?? undefined,
  });

  const pointOfSale = await getAvailablePointOfSale(
    {
      companyId: parsed.companyId,
      pointOfSaleNumber: parsed.pointOfSaleNumber,
      onlyActive: false,
    },
    db,
  );

  if (!pointOfSale) {
    throw new Error("No existe un punto de venta fiscal para la empresa y el número indicado.");
  }

  const consistencyValidation = validateFiscalDocumentConsistency({
    fiscalDocumentType: parsed.fiscalDocumentType,
    fiscalStatus: parsed.fiscalStatus,
    pointOfSaleNumber: pointOfSale.pointOfSaleNumber,
    pointOfSaleActive: pointOfSale.active,
    integrationEnabled: fiscalConfig.integrationEnabled,
    fiscalConfigActive: fiscalConfig.isActive,
  });

  const draft = {
    companyId: parsed.companyId,
    fiscalConfigId: fiscalConfig.id,
    environment: fiscalConfig.fiscalEnvironment,
    sourceEntityType: parsed.sourceEntityType,
    sourceEntityId: parsed.sourceEntityId,
    fiscalDocumentType: parsed.fiscalDocumentType,
    fiscalStatus: parsed.fiscalStatus,
    pointOfSaleNumber: pointOfSale.pointOfSaleNumber,
    taxpayer: {
      cuit: fiscalValidation.value.cuit,
      legalName: fiscalConfig.legalName,
      ivaCondition: fiscalConfig.ivaCondition,
    },
    integration: {
      enabled: fiscalConfig.integrationEnabled,
      certificateReference: fiscalConfig.certificateReference,
      technicalReference: fiscalConfig.technicalReference,
    },
    payload: parsed.payload,
    generatedAt: new Date(),
  };

  return {
    draft,
    fiscalConfig,
    pointOfSale,
    warnings: [...fiscalValidation.warnings, ...consistencyValidation.warnings],
  };
}

export async function registerFiscalProcessingLog(
  input: RegisterFiscalProcessingLogInput,
  db: PrismaExecutor = prisma,
) {
  const parsed = registerFiscalProcessingLogSchema.parse(input);

  return db.fiscalProcessingLog.create({
    data: {
      companyId: parsed.companyId,
      fiscalConfigId: parsed.fiscalConfigId,
      fiscalDocumentId: parsed.fiscalDocumentId,
      fiscalPointOfSaleId: parsed.fiscalPointOfSaleId,
      userId: parsed.userId,
      sourceEntityType: parsed.sourceEntityType,
      sourceEntityId: parsed.sourceEntityId,
      operationType: parsed.operationType,
      status: parsed.status,
      requestPayload: toNullableJsonInput(parsed.requestPayload),
      responsePayload: toNullableJsonInput(parsed.responsePayload),
      errorCode: parsed.errorCode,
      errorMessage: parsed.errorMessage,
      processedAt: parsed.processedAt,
    },
  });
}
