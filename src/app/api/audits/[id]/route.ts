import { NextResponse } from "next/server";
import { getAuditCaseById } from "@/lib/audit-service";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const audit = await getAuditCaseById(id);
    if (!audit) {
      return NextResponse.json(
        { error: "해당 점검 건을 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    return NextResponse.json({ audit });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "점검 상세 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.auditCase.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "점검 건 삭제에 실패했습니다." },
      { status: 500 }
    );
  }
}
