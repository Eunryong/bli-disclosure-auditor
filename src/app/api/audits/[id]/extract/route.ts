import { NextResponse } from "next/server";
import { getAuditCaseById, saveExtractedClaims } from "@/lib/audit-service";
import { extractFiveCoreItemsFromWhitepaper } from "@/lib/extractor";
import type { AuditCheckItemKey, UpdateExtractedItemInput } from "@/types/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const existing = await getAuditCaseById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "해당 점검 건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();

    let items: UpdateExtractedItemInput[];
    let extractionEngine: string = "manual-edit";
    let geminiTelemetry = undefined;

    if (body.mode === "auto") {
      const result = await extractFiveCoreItemsFromWhitepaper(
        existing.whitepaperText
      );
      items = result.items;
      extractionEngine = result.engine;
      geminiTelemetry = result.geminiTelemetry;
    } else if (Array.isArray(body.items)) {
      items = body.items.map((raw: any) => ({
        itemKey: raw.itemKey as AuditCheckItemKey,
        disclosedClaim: String(raw.disclosedClaim ?? ""),
        sourceQuote: String(raw.sourceQuote ?? ""),
        sectionRef: String(raw.sectionRef ?? ""),
        disclosedDataJson: raw.disclosedDataJson ?? undefined,
      }));
    } else {
      return NextResponse.json(
        { error: "유효한 추출 항목 데이터가 전달되지 않았습니다." },
        { status: 400 }
      );
    }

    const updated = await saveExtractedClaims(id, items, geminiTelemetry);
    return NextResponse.json({
      audit: updated,
      extractionEngine,
      geminiTelemetry,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "추출 항목 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
