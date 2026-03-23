-- CreateEnum
CREATE TYPE "AccountingPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccountingAccountCategory" AS ENUM ('CURRENT_ASSET', 'NON_CURRENT_ASSET', 'CURRENT_LIABILITY', 'NON_CURRENT_LIABILITY', 'EQUITY', 'OPERATING_REVENUE', 'NON_OPERATING_REVENUE', 'OPERATING_EXPENSE', 'NON_OPERATING_EXPENSE', 'COST_OF_SALES', 'PRODUCTION_VARIANCE', 'MEMORANDUM', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountingAccountNature" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'RESULT', 'MEMORANDUM');

-- CreateEnum
CREATE TYPE "AccountingModule" AS ENUM ('SUPPLIERS', 'TREASURY', 'STOCK', 'PRODUCTION', 'ITEMS', 'GENERAL');

-- CreateEnum
CREATE TYPE "AccountingEntryStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "expenseAccountId" TEXT,
ADD COLUMN     "inventoryAccountId" TEXT;

-- AlterTable
ALTER TABLE "ProductionOrder" ADD COLUMN     "accountingEntryId" TEXT,
ADD COLUMN     "accountingRuleId" TEXT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "accountingEntryId" TEXT,
ADD COLUMN     "accountingRuleId" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "payableAccountId" TEXT;

-- AlterTable
ALTER TABLE "CashBox" ADD COLUMN     "accountingAccountId" TEXT;

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "accountingEntryId" TEXT,
ADD COLUMN     "accountingRuleId" TEXT;

-- AlterTable
ALTER TABLE "BankAccount" ADD COLUMN     "accountingAccountId" TEXT;

-- AlterTable
ALTER TABLE "BankMovement" ADD COLUMN     "accountingEntryId" TEXT,
ADD COLUMN     "accountingRuleId" TEXT;

-- AlterTable
ALTER TABLE "SupplierInvoice" ADD COLUMN     "accountingEntryId" TEXT,
ADD COLUMN     "accountingRuleId" TEXT;

-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN     "accountingEntryId" TEXT,
ADD COLUMN     "accountingRuleId" TEXT;

-- CreateTable
CREATE TABLE "AccountingPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "sourcePlanId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AccountingPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "versionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAccountingPlan" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAccountingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "planId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AccountingAccountCategory" NOT NULL,
    "nature" "AccountingAccountNature" NOT NULL,
    "allowsDirectPosting" BOOLEAN NOT NULL DEFAULT true,
    "parentAccountId" TEXT,
    "level" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPostingType" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "module" "AccountingModule" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPostingType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPostingRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postingTypeId" TEXT,
    "module" "AccountingModule" NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "movementType" TEXT,
    "description" TEXT,
    "defaultDebitAccountId" TEXT,
    "defaultCreditAccountId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingPostingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postingTypeId" TEXT,
    "postingRuleId" TEXT,
    "sourceModule" "AccountingModule" NOT NULL,
    "sourceEntityType" TEXT NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "operationType" TEXT,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "AccountingEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "externalReference" TEXT,
    "totalDebit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingEntryLine" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "debitAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "creditAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sourceEntityType" TEXT,
    "sourceEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingEntryLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountingPlan_status_isBase_idx" ON "AccountingPlan"("status", "isBase");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPlan_companyId_code_key" ON "AccountingPlan"("companyId", "code");

-- CreateIndex
CREATE INDEX "CompanyAccountingPlan_companyId_isDefault_isActive_idx" ON "CompanyAccountingPlan"("companyId", "isDefault", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAccountingPlan_companyId_planId_key" ON "CompanyAccountingPlan"("companyId", "planId");

-- CreateIndex
CREATE INDEX "AccountingAccount_companyId_isActive_idx" ON "AccountingAccount"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "AccountingAccount_parentAccountId_idx" ON "AccountingAccount"("parentAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingAccount_planId_code_key" ON "AccountingAccount"("planId", "code");

-- CreateIndex
CREATE INDEX "AccountingPostingType_module_isActive_idx" ON "AccountingPostingType"("module", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPostingType_companyId_module_code_key" ON "AccountingPostingType"("companyId", "module", "code");

-- CreateIndex
CREATE INDEX "AccountingPostingRule_companyId_module_sourceEntityType_ope_idx" ON "AccountingPostingRule"("companyId", "module", "sourceEntityType", "operationType", "priority");

-- CreateIndex
CREATE INDEX "AccountingPostingRule_companyId_isActive_idx" ON "AccountingPostingRule"("companyId", "isActive");

-- CreateIndex
CREATE INDEX "AccountingEntry_companyId_entryDate_idx" ON "AccountingEntry"("companyId", "entryDate");

-- CreateIndex
CREATE INDEX "AccountingEntry_companyId_sourceModule_sourceEntityType_sou_idx" ON "AccountingEntry"("companyId", "sourceModule", "sourceEntityType", "sourceEntityId");

-- CreateIndex
CREATE INDEX "AccountingEntry_status_idx" ON "AccountingEntry"("status");

-- CreateIndex
CREATE INDEX "AccountingEntryLine_entryId_lineNumber_idx" ON "AccountingEntryLine"("entryId", "lineNumber");

-- CreateIndex
CREATE INDEX "AccountingEntryLine_accountId_idx" ON "AccountingEntryLine"("accountId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_inventoryAccountId_fkey" FOREIGN KEY ("inventoryAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_payableAccountId_fkey" FOREIGN KEY ("payableAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBox" ADD CONSTRAINT "CashBox_accountingAccountId_fkey" FOREIGN KEY ("accountingAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_accountingAccountId_fkey" FOREIGN KEY ("accountingAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankMovement" ADD CONSTRAINT "BankMovement_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_accountingRuleId_fkey" FOREIGN KEY ("accountingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_accountingEntryId_fkey" FOREIGN KEY ("accountingEntryId") REFERENCES "AccountingEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPlan" ADD CONSTRAINT "AccountingPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPlan" ADD CONSTRAINT "AccountingPlan_sourcePlanId_fkey" FOREIGN KEY ("sourcePlanId") REFERENCES "AccountingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAccountingPlan" ADD CONSTRAINT "CompanyAccountingPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAccountingPlan" ADD CONSTRAINT "CompanyAccountingPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AccountingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAccount" ADD CONSTRAINT "AccountingAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAccount" ADD CONSTRAINT "AccountingAccount_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AccountingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAccount" ADD CONSTRAINT "AccountingAccount_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPostingType" ADD CONSTRAINT "AccountingPostingType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPostingRule" ADD CONSTRAINT "AccountingPostingRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPostingRule" ADD CONSTRAINT "AccountingPostingRule_postingTypeId_fkey" FOREIGN KEY ("postingTypeId") REFERENCES "AccountingPostingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPostingRule" ADD CONSTRAINT "AccountingPostingRule_defaultDebitAccountId_fkey" FOREIGN KEY ("defaultDebitAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingPostingRule" ADD CONSTRAINT "AccountingPostingRule_defaultCreditAccountId_fkey" FOREIGN KEY ("defaultCreditAccountId") REFERENCES "AccountingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_postingTypeId_fkey" FOREIGN KEY ("postingTypeId") REFERENCES "AccountingPostingType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_postingRuleId_fkey" FOREIGN KEY ("postingRuleId") REFERENCES "AccountingPostingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntryLine" ADD CONSTRAINT "AccountingEntryLine_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AccountingEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEntryLine" ADD CONSTRAINT "AccountingEntryLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AccountingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

