import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  extractClaimsWithRuleParser,
  parseStructuredClaimByItemKey,
} from "@/lib/extractor";
import { anchorAuditOnChain } from "@/lib/onchain";
import {
  AUDIT_CHECK_ITEM_KEYS,
  AUDIT_CHECK_ITEM_METADATA,
  type AuditCaseDTO,
  type AuditCheckItemDTO,
  type AuditCheckItemKey,
  type AuditComparisonStatus,
  type AuditSeverity,
  type AuditStage,
  type CounterfactualBreachSimulation,
  type CreateAuditCaseInput,
  type CreWorkflowExecutionTrace,
  type GeminiCallMetadata,
  type OnchainAnchorVerification,
  type UpdateExtractedItemInput,
  type UpdateReviewItemInput,
} from "@/types/audit";

export function computeSha256Hex(content: string): string {
  const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
  return `0x${hash}`;
}

export function serializeAuditCase(record: any): AuditCaseDTO {
  let anchorVerification: OnchainAnchorVerification | null = null;
  let creWorkflowTrace: CreWorkflowExecutionTrace | null = null;
  let breachSimulations: CounterfactualBreachSimulation[] | undefined =
    undefined;
  let geminiTelemetry: {
    extract?: GeminiCallMetadata;
    compare?: GeminiCallMetadata;
    review?: GeminiCallMetadata;
  } | null = null;
  let aiCureNoticeText: string | null = null;

  if (record.onchainSnapshotJson) {
    try {
      const parsed = JSON.parse(record.onchainSnapshotJson);
      if (parsed && parsed.anchorVerification) {
        anchorVerification = parsed.anchorVerification;
      }
      if (parsed && parsed.creWorkflowTrace) {
        creWorkflowTrace = parsed.creWorkflowTrace;
      }
      if (parsed && Array.isArray(parsed.breachSimulations)) {
        breachSimulations = parsed.breachSimulations;
      } else if (
        parsed?.creWorkflowTrace &&
        Array.isArray(parsed.creWorkflowTrace.breachSimulations)
      ) {
        breachSimulations = parsed.creWorkflowTrace.breachSimulations;
      }
      if (parsed && parsed.geminiTelemetry) {
        geminiTelemetry = parsed.geminiTelemetry;
      }
      if (parsed && typeof parsed.aiCureNoticeText === "string") {
        aiCureNoticeText = parsed.aiCureNoticeText;
      }
    } catch {
      // ignore malformed json
    }
  }

  return {
    id: record.id,
    title: record.title,
    projectName: record.projectName,
    tokenSymbol: record.tokenSymbol,
    whitepaperFileName: record.whitepaperFileName,
    whitepaperText: record.whitepaperText,
    documentHash: record.documentHash,
    tokenAddress: record.tokenAddress,
    chainId: record.chainId,
    chainName: record.chainName,
    stage: record.stage as AuditStage,
    snapshotBlockNumber: record.snapshotBlockNumber,
    onchainSnapshotJson: record.onchainSnapshotJson,
    creWorkflowRunId: record.creWorkflowRunId,
    creWorkflowTrace,
    breachSimulations,
    geminiTelemetry,
    aiCureNoticeText,
    mismatchCount: record.mismatchCount,
    needsReviewCount: record.needsReviewCount,
    matchCount: record.matchCount,
    overallStatus: record.overallStatus as AuditComparisonStatus,
    overallSummary: record.overallSummary,
    reviewerName: record.reviewerName,
    reportHash: record.reportHash,
    auditRegistryAddress: record.auditRegistryAddress,
    anchorTxHash: record.anchorTxHash,
    anchoredAt: record.anchoredAt ? record.anchoredAt.toISOString() : null,
    anchorVerification,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    checkItems: record.checkItems
      ? record.checkItems
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
          .map(serializeAuditCheckItem)
      : undefined,
  };
}

export function serializeAuditCheckItem(item: any): AuditCheckItemDTO {
  return {
    id: item.id,
    auditCaseId: item.auditCaseId,
    itemKey: item.itemKey as AuditCheckItemKey,
    displayOrder: item.displayOrder,
    titleKo: item.titleKo,
    titleEn: item.titleEn,
    disclosedClaim: item.disclosedClaim,
    sourceQuote: item.sourceQuote,
    sectionRef: item.sectionRef,
    disclosedDataJson: item.disclosedDataJson,
    onchainState: item.onchainState,
    evidenceFunctionOrSlot: item.evidenceFunctionOrSlot,
    onchainDataJson: item.onchainDataJson,
    status: item.status as AuditComparisonStatus,
    severity: item.severity as AuditSeverity,
    rationale: item.rationale,
    reviewerNote: item.reviewerNote,
    reviewedBy: item.reviewedBy,
    reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export async function listAuditCases(): Promise<AuditCaseDTO[]> {
  const cases = await prisma.auditCase.findMany({
    include: {
      checkItems: {
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  return cases.map(serializeAuditCase);
}

export async function getAuditCaseById(id: string): Promise<AuditCaseDTO | null> {
  const record = await prisma.auditCase.findUnique({
    where: { id },
    include: {
      checkItems: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });
  if (!record) return null;
  return serializeAuditCase(record);
}

export async function createAuditCase(
  input: CreateAuditCaseInput
): Promise<AuditCaseDTO> {
  const documentHash = computeSha256Hex(input.whitepaperText);
  const preExtracted = extractClaimsWithRuleParser(input.whitepaperText);
  const preExtractedMap = new Map(
    preExtracted.map((item) => [item.itemKey, item])
  );

  const created = await prisma.auditCase.create({
    data: {
      title: input.title.trim(),
      projectName: input.projectName.trim(),
      tokenSymbol: (input.tokenSymbol || "TOKEN").trim().toUpperCase(),
      whitepaperFileName: input.whitepaperFileName.trim(),
      whitepaperText: input.whitepaperText,
      documentHash,
      tokenAddress: input.tokenAddress.trim(),
      chainId: Number(input.chainId) || 11155111,
      chainName: input.chainName || "Ethereum Sepolia",
      stage: "CREATED",
      overallStatus: "PENDING",
      checkItems: {
        create: AUDIT_CHECK_ITEM_KEYS.map((key) => {
          const meta = AUDIT_CHECK_ITEM_METADATA[key];
          const extracted = preExtractedMap.get(key);
          return {
            itemKey: key,
            displayOrder: meta.order,
            titleKo: meta.titleKo,
            titleEn: meta.titleEn,
            disclosedClaim: extracted?.disclosedClaim || "",
            sourceQuote: extracted?.sourceQuote || "",
            sectionRef: extracted?.sectionRef || "",
            disclosedDataJson: extracted?.disclosedDataJson || null,
            evidenceFunctionOrSlot: meta.defaultEvidenceFunctions,
            status: "PENDING",
            severity: "INFO",
          };
        }),
      },
    },
    include: {
      checkItems: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  return serializeAuditCase(created);
}

/**
 * Extracts or updates the 5 core disclosed claims from the whitepaper text and persists to SQLite.
 */
export async function saveExtractedClaims(
  auditCaseId: string,
  items: UpdateExtractedItemInput[],
  extractTelemetry?: GeminiCallMetadata
): Promise<AuditCaseDTO | null> {
  const existing = await prisma.auditCase.findUnique({
    where: { id: auditCaseId },
  });
  if (!existing) return null;

  await prisma.$transaction(
    items.map((item) => {
      const computedStructured = parseStructuredClaimByItemKey(
        item.itemKey,
        `${item.disclosedClaim}\n${item.sourceQuote}`,
        existing.whitepaperText
      );
      const finalDisclosedDataJson =
        item.disclosedDataJson !== undefined && item.disclosedDataJson !== null
          ? item.disclosedDataJson
          : JSON.stringify(computedStructured);

      return prisma.auditCheckItem.update({
        where: {
          auditCaseId_itemKey: {
            auditCaseId,
            itemKey: item.itemKey,
          },
        },
        data: {
          disclosedClaim: item.disclosedClaim,
          sourceQuote: item.sourceQuote,
          sectionRef: item.sectionRef,
          disclosedDataJson: finalDisclosedDataJson,
        },
      });
    })
  );

  const nextStage =
    existing.stage === "CREATED" ? "EXTRACTED" : existing.stage;

  let snapshotObj: Record<string, any> = {};
  if (existing.onchainSnapshotJson) {
    try {
      snapshotObj = JSON.parse(existing.onchainSnapshotJson);
    } catch {
      snapshotObj = {};
    }
  }
  if (extractTelemetry) {
    snapshotObj.geminiTelemetry = {
      ...(snapshotObj.geminiTelemetry || {}),
      extract: extractTelemetry,
    };
  }

  await prisma.auditCase.update({
    where: { id: auditCaseId },
    data: {
      stage: nextStage,
      ...(extractTelemetry
        ? { onchainSnapshotJson: JSON.stringify(snapshotObj, null, 2) }
        : {}),
    },
  });

  return getAuditCaseById(auditCaseId);
}

/**
 * Updates reviewer notes, item statuses, and executes real AuditRegistry.recordAudit + verifyAnchor on-chain when anchorAction is true.
 */
export async function saveAuditReview(
  auditCaseId: string,
  payload: {
    reviewerName: string;
    overallSummary: string;
    items: UpdateReviewItemInput[];
    anchorAction?: boolean;
  }
): Promise<AuditCaseDTO | null> {
  const existing = await prisma.auditCase.findUnique({
    where: { id: auditCaseId },
    include: { checkItems: true },
  });
  if (!existing) return null;

  const now = new Date();
  await prisma.$transaction(
    payload.items.map((item) =>
      prisma.auditCheckItem.update({
        where: {
          auditCaseId_itemKey: {
            auditCaseId,
            itemKey: item.itemKey,
          },
        },
        data: {
          status: item.status,
          reviewerNote: item.reviewerNote,
          reviewedBy: payload.reviewerName,
          reviewedAt: now,
        },
      })
    )
  );

  const updatedItems = await prisma.auditCheckItem.findMany({
    where: { auditCaseId },
    orderBy: { displayOrder: "asc" },
  });

  const mismatchCount = updatedItems.filter(
    (i) => i.status === "MISMATCH"
  ).length;
  const needsReviewCount = updatedItems.filter(
    (i) => i.status === "NEEDS_HUMAN_REVIEW"
  ).length;
  const matchCount = updatedItems.filter((i) => i.status === "MATCH").length;

  let overallStatus: AuditComparisonStatus = "MATCH";
  if (mismatchCount > 0) {
    overallStatus = "MISMATCH";
  } else if (needsReviewCount > 0) {
    overallStatus = "NEEDS_HUMAN_REVIEW";
  } else if (matchCount === 0) {
    overallStatus = "PENDING";
  }

  const blockNumber = existing.snapshotBlockNumber ?? 1;

  const reportPayload = {
    caseId: existing.id,
    documentHash: existing.documentHash,
    tokenAddress: existing.tokenAddress,
    chainId: existing.chainId,
    blockNumber,
    mismatchCount,
    needsReviewCount,
    matchCount,
    reviewerName: payload.reviewerName,
    overallSummary: payload.overallSummary,
    items: updatedItems.map((i) => ({
      itemKey: i.itemKey,
      status: i.status,
      reviewerNote: i.reviewerNote,
    })),
    // Include timestamp when anchoring so repeated anchor clicks generate a fresh unique reportHash
    ...(payload.anchorAction ? { anchoredIso: now.toISOString() } : {}),
  };

  const reportHash = computeSha256Hex(JSON.stringify(reportPayload));

  let anchorData: Record<string, any> = {
    stage: existing.stage === "ANCHORED" ? "ANCHORED" : "REVIEWED",
  };

  if (payload.anchorAction) {
    const onchainAnchor = await anchorAuditOnChain({
      documentHash: existing.documentHash,
      tokenAddress: existing.tokenAddress,
      chainId: existing.chainId,
      blockNumber,
      mismatchCount,
      reportHash,
    });

    let snapshotObj: Record<string, any> = {};
    if (existing.onchainSnapshotJson) {
      try {
        snapshotObj = JSON.parse(existing.onchainSnapshotJson);
      } catch {
        snapshotObj = {};
      }
    }

    const anchorVerification: OnchainAnchorVerification = {
      verified: onchainAnchor.verification.verified,
      auditRegistryAddress: onchainAnchor.auditRegistryAddress,
      anchorTxHash: onchainAnchor.anchorTxHash,
      blockNumber: onchainAnchor.blockNumber,
      anchoredAtTimestamp: onchainAnchor.anchoredAtTimestamp,
      auditor: onchainAnchor.verification.record.auditor,
      documentHash: onchainAnchor.verification.record.documentHash,
      tokenAddress: onchainAnchor.verification.record.tokenAddress,
      chainId: onchainAnchor.verification.record.chainId,
      mismatchCount: onchainAnchor.verification.record.mismatchCount,
      reportHash: onchainAnchor.verification.record.reportHash,
      recordAuditCalldata: onchainAnchor.recordAuditCalldata,
      verifyAnchorCalldata: onchainAnchor.verifyAnchorCalldata,
      verifyAnchorRawResult: onchainAnchor.verifyAnchorRawResult,
    };

    snapshotObj.anchorVerification = anchorVerification;

    anchorData = {
      stage: "ANCHORED",
      reportHash: onchainAnchor.verification.record.reportHash,
      auditRegistryAddress: onchainAnchor.auditRegistryAddress,
      anchorTxHash: onchainAnchor.anchorTxHash,
      anchoredAt: new Date(onchainAnchor.anchoredAtTimestamp * 1000),
      onchainSnapshotJson: JSON.stringify(snapshotObj, null, 2),
    };
  }

  await prisma.auditCase.update({
    where: { id: auditCaseId },
    data: {
      reviewerName: payload.reviewerName,
      overallSummary: payload.overallSummary,
      mismatchCount,
      needsReviewCount,
      matchCount,
      overallStatus,
      reportHash,
      ...anchorData,
    },
  });

  return getAuditCaseById(auditCaseId);
}
