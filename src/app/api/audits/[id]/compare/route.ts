import { NextResponse } from "next/server";
import { runOnchainComparisonForAuditCase } from "@/lib/comparator";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const updated = await runOnchainComparisonForAuditCase(id);
    if (!updated) {
      return NextResponse.json(
        { error: "해당 점검 건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ audit: updated });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Chainlink CRE 온체인 대조 실행 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
