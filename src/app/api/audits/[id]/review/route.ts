import { NextResponse } from "next/server";
import { saveAuditReview } from "@/lib/audit-service";
import type {
  AuditCheckItemKey,
  AuditComparisonStatus,
  UpdateReviewItemInput,
} from "@/types/audit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const items: UpdateReviewItemInput[] = Array.isArray(body.items)
      ? body.items.map((raw: any) => ({
          itemKey: raw.itemKey as AuditCheckItemKey,
          status: raw.status as AuditComparisonStatus,
          reviewerNote: String(raw.reviewerNote ?? ""),
        }))
      : [];

    const updated = await saveAuditReview(id, {
      reviewerName: String(body.reviewerName || "담당 법무·컴플라이언스 심사역"),
      overallSummary: String(body.overallSummary || ""),
      items,
      anchorAction: Boolean(body.anchorAction),
    });

    if (!updated) {
      return NextResponse.json(
        { error: "해당 점검 건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ audit: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "법무 검토 결과 저장에 실패했습니다." },
      { status: 500 }
    );
  }
}
