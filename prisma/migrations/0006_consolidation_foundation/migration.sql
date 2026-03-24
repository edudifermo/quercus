-- CreateEnum
CREATE TYPE "ConsolidationAccessRole" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');

-- CreateTable
CREATE TABLE "ConsolidationGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidationGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidationGroupCompany" (
    "id" TEXT NOT NULL,
    "consolidationGroupId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidationGroupCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidationGroupMembership" (
    "id" TEXT NOT NULL,
    "consolidationGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ConsolidationAccessRole" NOT NULL DEFAULT 'VIEWER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsolidationGroupMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidationGroup_code_key" ON "ConsolidationGroup"("code");

-- CreateIndex
CREATE INDEX "ConsolidationGroup_isActive_idx" ON "ConsolidationGroup"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidationGroupCompany_consolidationGroupId_companyId_key" ON "ConsolidationGroupCompany"("consolidationGroupId", "companyId");

-- CreateIndex
CREATE INDEX "ConsolidationGroupCompany_companyId_isActive_idx" ON "ConsolidationGroupCompany"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidationGroupMembership_consolidationGroupId_userId_key" ON "ConsolidationGroupMembership"("consolidationGroupId", "userId");

-- CreateIndex
CREATE INDEX "ConsolidationGroupMembership_userId_isActive_idx" ON "ConsolidationGroupMembership"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "ConsolidationGroup" ADD CONSTRAINT "ConsolidationGroup_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationGroupCompany" ADD CONSTRAINT "ConsolidationGroupCompany_consolidationGroupId_fkey" FOREIGN KEY ("consolidationGroupId") REFERENCES "ConsolidationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationGroupCompany" ADD CONSTRAINT "ConsolidationGroupCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationGroupMembership" ADD CONSTRAINT "ConsolidationGroupMembership_consolidationGroupId_fkey" FOREIGN KEY ("consolidationGroupId") REFERENCES "ConsolidationGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidationGroupMembership" ADD CONSTRAINT "ConsolidationGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
