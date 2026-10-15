import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuditCaseById } from "@/lib/audit-service";
import { generateLegalReviewDraftWithGemini } from "@/lib/llm";
import { AUDIT_CHECK_ITEM_KEYS } from "@/types/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await getAuditCaseById(id);
    if (!existing || !existing.checkItems) {
      return NextResponse.json(
        { error: "Audit case not found." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const lang: "en" | "ko" = body?.lang === "ko" ? "ko" : "en";
    const reviewerName =
      typeof body?.reviewerName === "string" && body.reviewerName.trim()
        ? body.reviewerName.trim()
        : existing.reviewerName ||
          "BLI Digital Asset Compliance & Legal Review Counsel";

    const breachSimulations = Array.isArray(existing.breachSimulations)
      ? existing.breachSimulations
      : [];

    const draft = await generateLegalReviewDraftWithGemini({
      auditCaseId: existing.id,
      projectName: existing.projectName,
      tokenSymbol: existing.tokenSymbol,
      tokenAddress: existing.tokenAddress,
      chainId: existing.chainId,
      chainName: existing.chainName,
      snapshotBlockNumber: existing.snapshotBlockNumber ?? 1,
      documentHash: existing.documentHash,
      reportHash:
        existing.reportHash ||
        existing.creWorkflowTrace?.consensus?.reportHash ||
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      overallStatus: existing.overallStatus,
      whitepaperText: existing.whitepaperText,
      checkItems: existing.checkItems,
      breachSimulations,
      lang,
    });

    const now = new Date();
    await prisma.$transaction(
      AUDIT_CHECK_ITEM_KEYS.map((key) => {
        const note = draft.itemReviewerNotes[key];
        return prisma.auditCheckItem.update({
          where: {
            auditCaseId_itemKey: {
              auditCaseId: id,
              itemKey: key,
            },
          },
          data: {
            reviewerNote: note,
            reviewedBy: reviewerName,
            reviewedAt: now,
          },
        });
      })
    );

    let snapshotObj: Record<string, any> = {};
    if (existing.onchainSnapshotJson) {
      try {
        snapshotObj = JSON.parse(existing.onchainSnapshotJson);
      } catch {
        snapshotObj = {};
      }
    }

    snapshotObj.aiCureNoticeText = draft.cureNoticeText;
    snapshotObj.geminiTelemetry = {
      ...(snapshotObj.geminiTelemetry || {}),
      review: draft.telemetry,
    };

    const nextStage =
      existing.stage === "ANCHORED" ? "ANCHORED" : "REVIEWED";

    await prisma.auditCase.update({
      where: { id },
      data: {
        stage: nextStage,
        reviewerName,
        overallSummary: draft.overallSummary,
        onchainSnapshotJson: JSON.stringify(snapshotObj, null, 2),
      },
    });

    const updated = await getAuditCaseById(id);

    return NextResponse.json({
      audit: updated,
      overallSummary: draft.overallSummary,
      itemReviewerNotes: draft.itemReviewerNotes,
      cureNoticeText: draft.cureNoticeText,
      geminiTelemetry: draft.telemetry,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Failed to generate Legal Opinion & Cure Notice with Google Gemini AI.",
      },
      { status: 500 }
    );
  }
}
