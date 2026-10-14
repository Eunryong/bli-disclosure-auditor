import { NextResponse } from "next/server";
import { createAuditCase, listAuditCases } from "@/lib/audit-service";
import type { CreateAuditCaseInput } from "@/types/audit";

export async function GET() {
  try {
    const cases = await listAuditCases();
    return NextResponse.json({ audits: cases });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "점검 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CreateAuditCaseInput>;

    if (
      !body.title ||
      !body.projectName ||
      !body.whitepaperText ||
      !body.tokenAddress
    ) {
      return NextResponse.json(
        {
          error:
            "점검 제목, 프로젝트명, 백서 원문, 스마트계약 주소는 필수 입력 항목입니다.",
        },
        { status: 400 }
      );
    }

    const created = await createAuditCase({
      title: body.title,
      projectName: body.projectName,
      tokenSymbol: body.tokenSymbol || "TOKEN",
      whitepaperFileName: body.whitepaperFileName || "uploaded-whitepaper.md",
      whitepaperText: body.whitepaperText,
      tokenAddress: body.tokenAddress,
      chainId: Number(body.chainId) || 11155111,
      chainName: body.chainName || "Ethereum Sepolia",
    });

    return NextResponse.json({ audit: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "점검 건 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
