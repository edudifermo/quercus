-- CreateEnum
CREATE TYPE "FiscalEnvironment" AS ENUM ('TESTING', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "FiscalIvaCondition" AS ENUM (
  'RESPONSABLE_INSCRIPTO',
  'MONOTRIBUTO',
  'EXENTO',
  'CONSUMIDOR_FINAL',
  'SUJETO_NO_CATEGORIZADO',
  'IVA_NO_ALCANZADO'
);

-- CreateEnum
CREATE TYPE "GrossIncomeCondition" AS ENUM ('LOCAL', 'MULTILATERAL', 'EXENTO', 'NO_INSCRIPTO');

-- CreateEnum
CREATE TYPE "FiscalPointOfSaleUse" AS ENUM ('SALES', 'CREDIT_NOTE', 'DEBIT_NOTE', 'INTERNAL');

-- CreateEnum
CREATE TYPE "FiscalDocumentType" AS ENUM (
  'FACTURA_A',
  'FACTURA_B',
  'FACTURA_C',
  'FACTURA_M',
  'NOTA_DE_CREDITO_A',
  'NOTA_DE_CREDITO_B',
  'NOTA_DE_CREDITO_C',
  'NOTA_DE_DEBITO_A',
  'NOTA_DE_DEBITO_B',
  'NOTA_DE_DEBITO_C',
  'RECIBO_X'
);

-- CreateEnum
CREATE TYPE "FiscalDocumentStatus" AS ENUM (
  'DRAFT',
  'READY',
  'PENDING',
  'SUBMITTED',
  'AUTHORIZED',
  'REJECTED',
  'ERROR',
  'CANCELLED'
);

-- CreateEnum
CREATE TYPE "FiscalOperationType" AS ENUM (
  'VALIDATE_CONFIGURATION',
  'BUILD_REQUEST',
  'AUTHORIZE_DOCUMENT',
  'QUERY_DOCUMENT',
  'SYNC_CATALOG',
  'CANCEL_DOCUMENT',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "FiscalProcessingStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "FiscalConfig" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "cuit" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "ivaCondition" "FiscalIvaCondition" NOT NULL,
  "grossIncomeCondition" "GrossIncomeCondition",
  "taxAddress" TEXT,
  "fiscalEnvironment" "FiscalEnvironment" NOT NULL DEFAULT 'TESTING',
  "integrationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "certificateReference" TEXT,
  "privateKeyReference" TEXT,
  "technicalReference" TEXT,
  "taxpayerReference" TEXT,
  "integrationParameters" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalPointOfSale" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "fiscalConfigId" TEXT NOT NULL,
  "pointOfSaleNumber" INTEGER NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "use" "FiscalPointOfSaleUse",
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalPointOfSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalDocument" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "fiscalConfigId" TEXT NOT NULL,
  "fiscalPointOfSaleId" TEXT,
  "createdById" TEXT,
  "sourceEntityType" TEXT NOT NULL,
  "sourceEntityId" TEXT NOT NULL,
  "fiscalDocumentType" "FiscalDocumentType" NOT NULL,
  "fiscalStatus" "FiscalDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "documentNumber" INTEGER,
  "externalReference" TEXT,
  "requestDraft" JSONB,
  "responseData" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "lastProcessedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FiscalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalProcessingLog" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "fiscalConfigId" TEXT,
  "fiscalDocumentId" TEXT,
  "fiscalPointOfSaleId" TEXT,
  "userId" TEXT,
  "sourceEntityType" TEXT,
  "sourceEntityId" TEXT,
  "operationType" "FiscalOperationType" NOT NULL,
  "status" "FiscalProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "FiscalProcessingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FiscalConfig_companyId_key" ON "FiscalConfig"("companyId");
CREATE UNIQUE INDEX "FiscalConfig_cuit_key" ON "FiscalConfig"("cuit");
CREATE INDEX "FiscalConfig_companyId_isActive_idx" ON "FiscalConfig"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalPointOfSale_companyId_pointOfSaleNumber_key" ON "FiscalPointOfSale"("companyId", "pointOfSaleNumber");
CREATE INDEX "FiscalPointOfSale_companyId_active_idx" ON "FiscalPointOfSale"("companyId", "active");
CREATE INDEX "FiscalPointOfSale_fiscalConfigId_use_idx" ON "FiscalPointOfSale"("fiscalConfigId", "use");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalDocument_companyId_sourceEntityType_sourceEntityId_fiscalDocumentType_key"
ON "FiscalDocument"("companyId", "sourceEntityType", "sourceEntityId", "fiscalDocumentType");
CREATE UNIQUE INDEX "FiscalDocument_companyId_fiscalPointOfSaleId_fiscalDocumentType_documentNumber_key"
ON "FiscalDocument"("companyId", "fiscalPointOfSaleId", "fiscalDocumentType", "documentNumber");
CREATE INDEX "FiscalDocument_companyId_fiscalStatus_fiscalDocumentType_idx"
ON "FiscalDocument"("companyId", "fiscalStatus", "fiscalDocumentType");
CREATE INDEX "FiscalDocument_sourceEntityType_sourceEntityId_idx"
ON "FiscalDocument"("sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "FiscalProcessingLog_companyId_createdAt_idx" ON "FiscalProcessingLog"("companyId", "createdAt");
CREATE INDEX "FiscalProcessingLog_companyId_status_operationType_idx" ON "FiscalProcessingLog"("companyId", "status", "operationType");
CREATE INDEX "FiscalProcessingLog_sourceEntityType_sourceEntityId_idx" ON "FiscalProcessingLog"("sourceEntityType", "sourceEntityId");

-- AddForeignKey
ALTER TABLE "FiscalConfig"
ADD CONSTRAINT "FiscalConfig_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalPointOfSale"
ADD CONSTRAINT "FiscalPointOfSale_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalPointOfSale"
ADD CONSTRAINT "FiscalPointOfSale_fiscalConfigId_fkey"
FOREIGN KEY ("fiscalConfigId") REFERENCES "FiscalConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalDocument"
ADD CONSTRAINT "FiscalDocument_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalDocument"
ADD CONSTRAINT "FiscalDocument_fiscalConfigId_fkey"
FOREIGN KEY ("fiscalConfigId") REFERENCES "FiscalConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FiscalDocument"
ADD CONSTRAINT "FiscalDocument_fiscalPointOfSaleId_fkey"
FOREIGN KEY ("fiscalPointOfSaleId") REFERENCES "FiscalPointOfSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalDocument"
ADD CONSTRAINT "FiscalDocument_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalProcessingLog"
ADD CONSTRAINT "FiscalProcessingLog_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiscalProcessingLog"
ADD CONSTRAINT "FiscalProcessingLog_fiscalConfigId_fkey"
FOREIGN KEY ("fiscalConfigId") REFERENCES "FiscalConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalProcessingLog"
ADD CONSTRAINT "FiscalProcessingLog_fiscalDocumentId_fkey"
FOREIGN KEY ("fiscalDocumentId") REFERENCES "FiscalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalProcessingLog"
ADD CONSTRAINT "FiscalProcessingLog_fiscalPointOfSaleId_fkey"
FOREIGN KEY ("fiscalPointOfSaleId") REFERENCES "FiscalPointOfSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalProcessingLog"
ADD CONSTRAINT "FiscalProcessingLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
