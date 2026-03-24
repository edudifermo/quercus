-- Enums
ALTER TYPE "ItemType" ADD VALUE IF NOT EXISTS 'SERVICE';
ALTER TYPE "AccountingModule" ADD VALUE IF NOT EXISTS 'SALES';

CREATE TYPE "ClientType" AS ENUM ('INDIVIDUAL', 'COMPANY', 'OTHER');
CREATE TYPE "CommercialDocumentType" AS ENUM ('QUOTATION', 'SALES_ORDER', 'DELIVERY_NOTE', 'INVOICE', 'DEBIT_NOTE', 'CREDIT_NOTE', 'INTERNAL_NOTE');
CREATE TYPE "CommercialDocumentStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
CREATE TYPE "CommercialReceiptStatus" AS ENUM ('POSTED', 'PARTIALLY_APPLIED', 'APPLIED', 'VOID');
CREATE TYPE "CommercialLedgerEntryType" AS ENUM ('DOCUMENT', 'RECEIPT', 'ADJUSTMENT');
CREATE TYPE "CommercialItemType" AS ENUM ('PRODUCT', 'SERVICE', 'SELLABLE', 'NON_COMMERCIAL');

-- Item extensions for commercial catalog
ALTER TABLE "Item"
  ADD COLUMN "salesAccountId" TEXT,
  ADD COLUMN "commercialItemType" "CommercialItemType" NOT NULL DEFAULT 'NON_COMMERCIAL',
  ADD COLUMN "isCommercialSellable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "defaultSalePrice" DECIMAL(14,2);

-- Clients
CREATE TABLE "Client" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "code" TEXT,
  "legalName" TEXT NOT NULL,
  "tradeName" TEXT,
  "clientType" "ClientType" NOT NULL DEFAULT 'COMPANY',
  "taxId" TEXT,
  "ivaCondition" "FiscalIvaCondition",
  "email" TEXT,
  "phone" TEXT,
  "commercialAddress" TEXT,
  "fiscalAddress" TEXT,
  "primaryContactName" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "defaultCurrency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
  "creditLimit" DECIMAL(14,2),
  "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "receivableAccountId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialDocument" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "createdById" TEXT,
  "fiscalDocumentId" TEXT,
  "accountingRuleId" TEXT,
  "accountingEntryId" TEXT,
  "documentType" "CommercialDocumentType" NOT NULL,
  "documentNumber" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "currency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
  "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
  "subtotalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "openAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "status" "CommercialDocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "isFiscalizable" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "accountingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialDocumentLine" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "commercialDocumentId" TEXT NOT NULL,
  "itemId" TEXT,
  "lineNumber" INTEGER NOT NULL DEFAULT 1,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1,
  "unit" TEXT,
  "unitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "subtotalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialDocumentLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialReceipt" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "createdById" TEXT,
  "accountingRuleId" TEXT,
  "accountingEntryId" TEXT,
  "receiptNumber" TEXT NOT NULL,
  "receiptDate" TIMESTAMP(3) NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
  "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "unappliedAmount" DECIMAL(14,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "status" "CommercialReceiptStatus" NOT NULL DEFAULT 'POSTED',
  "accountingStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialReceiptApplication" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "commercialReceiptId" TEXT NOT NULL,
  "commercialDocumentId" TEXT NOT NULL,
  "appliedAmount" DECIMAL(14,2) NOT NULL,
  "resultingOpenAmount" DECIMAL(14,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialReceiptApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialLedgerEntry" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "commercialDocumentId" TEXT,
  "commercialReceiptId" TEXT,
  "entryType" "CommercialLedgerEntryType" NOT NULL,
  "currency" "CurrencyCode" NOT NULL DEFAULT 'ARS',
  "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
  "debitAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "creditAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "balanceAfter" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- Indexes and unique constraints
CREATE UNIQUE INDEX "Client_companyId_code_key" ON "Client"("companyId", "code");
CREATE INDEX "Client_companyId_legalName_idx" ON "Client"("companyId", "legalName");
CREATE INDEX "Client_companyId_isActive_idx" ON "Client"("companyId", "isActive");

CREATE UNIQUE INDEX "CommercialDocument_companyId_documentNumber_key" ON "CommercialDocument"("companyId", "documentNumber");
CREATE INDEX "CommercialDocument_companyId_clientId_issueDate_idx" ON "CommercialDocument"("companyId", "clientId", "issueDate");
CREATE INDEX "CommercialDocument_companyId_status_idx" ON "CommercialDocument"("companyId", "status");

CREATE UNIQUE INDEX "CommercialDocumentLine_commercialDocumentId_lineNumber_key" ON "CommercialDocumentLine"("commercialDocumentId", "lineNumber");
CREATE INDEX "CommercialDocumentLine_companyId_itemId_idx" ON "CommercialDocumentLine"("companyId", "itemId");

CREATE UNIQUE INDEX "CommercialReceipt_companyId_receiptNumber_key" ON "CommercialReceipt"("companyId", "receiptNumber");
CREATE INDEX "CommercialReceipt_companyId_clientId_receiptDate_idx" ON "CommercialReceipt"("companyId", "clientId", "receiptDate");

CREATE INDEX "CommercialReceiptApplication_companyId_commercialReceiptId_idx" ON "CommercialReceiptApplication"("companyId", "commercialReceiptId");
CREATE INDEX "CommercialReceiptApplication_companyId_commercialDocumentId_idx" ON "CommercialReceiptApplication"("companyId", "commercialDocumentId");

CREATE INDEX "CommercialLedgerEntry_companyId_clientId_occurredAt_idx" ON "CommercialLedgerEntry"("companyId", "clientId", "occurredAt");
CREATE INDEX "CommercialLedgerEntry_referenceType_referenceId_idx" ON "CommercialLedgerEntry"("referenceType", "referenceId");

-- Foreign keys
ALTER TABLE "Item"
  ADD CONSTRAINT "Item_salesAccountId_fkey" FOREIGN KEY ("salesAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Client"
  ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Client_receivableAccountId_fkey" FOREIGN KEY ("receivableAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialDocument"
  ADD CONSTRAINT "CommercialDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialDocument_fiscalDocumentId_fkey" FOREIGN KEY ("fiscalDocumentId") REFERENCES "FiscalDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialDocument_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialDocument_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialDocumentLine"
  ADD CONSTRAINT "CommercialDocumentLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialDocumentLine_commercialDocumentId_fkey" FOREIGN KEY ("commercialDocumentId") REFERENCES "CommercialDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialDocumentLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialReceipt"
  ADD CONSTRAINT "CommercialReceipt_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialReceipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialReceipt_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialReceipt_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialReceiptApplication"
  ADD CONSTRAINT "CommercialReceiptApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialReceiptApplication_commercialReceiptId_fkey" FOREIGN KEY ("commercialReceiptId") REFERENCES "CommercialReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialReceiptApplication_commercialDocumentId_fkey" FOREIGN KEY ("commercialDocumentId") REFERENCES "CommercialDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CommercialLedgerEntry"
  ADD CONSTRAINT "CommercialLedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialLedgerEntry_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialLedgerEntry_commercialDocumentId_fkey" FOREIGN KEY ("commercialDocumentId") REFERENCES "CommercialDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CommercialLedgerEntry_commercialReceiptId_fkey" FOREIGN KEY ("commercialReceiptId") REFERENCES "CommercialReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
