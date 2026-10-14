-- CreateTable
CREATE TABLE "AuditCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL DEFAULT '',
    "whitepaperFileName" TEXT NOT NULL,
    "whitepaperText" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "tokenAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "chainName" TEXT NOT NULL DEFAULT 'Ethereum Sepolia',
    "stage" TEXT NOT NULL DEFAULT 'CREATED',
    "snapshotBlockNumber" INTEGER,
    "onchainSnapshotJson" TEXT,
    "creWorkflowRunId" TEXT,
    "mismatchCount" INTEGER NOT NULL DEFAULT 0,
    "needsReviewCount" INTEGER NOT NULL DEFAULT 0,
    "matchCount" INTEGER NOT NULL DEFAULT 0,
    "overallStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "overallSummary" TEXT,
    "reviewerName" TEXT,
    "reportHash" TEXT,
    "auditRegistryAddress" TEXT,
    "anchorTxHash" TEXT,
    "anchoredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditCheckItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditCaseId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 1,
    "titleKo" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "disclosedClaim" TEXT NOT NULL DEFAULT '',
    "sourceQuote" TEXT NOT NULL DEFAULT '',
    "sectionRef" TEXT NOT NULL DEFAULT '',
    "disclosedDataJson" TEXT,
    "onchainState" TEXT NOT NULL DEFAULT '',
    "evidenceFunctionOrSlot" TEXT NOT NULL DEFAULT '',
    "onchainDataJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "rationale" TEXT NOT NULL DEFAULT '',
    "reviewerNote" TEXT NOT NULL DEFAULT '',
    "reviewedBy" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AuditCheckItem_auditCaseId_fkey" FOREIGN KEY ("auditCaseId") REFERENCES "AuditCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AuditCase_stage_idx" ON "AuditCase"("stage");

-- CreateIndex
CREATE INDEX "AuditCase_tokenAddress_idx" ON "AuditCase"("tokenAddress");

-- CreateIndex
CREATE INDEX "AuditCheckItem_auditCaseId_idx" ON "AuditCheckItem"("auditCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditCheckItem_auditCaseId_itemKey_key" ON "AuditCheckItem"("auditCaseId", "itemKey");
