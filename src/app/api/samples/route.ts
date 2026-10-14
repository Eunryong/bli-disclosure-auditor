import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { computeSha256Hex } from "@/lib/audit-service";
import { getDeployedContractAddresses } from "@/lib/onchain";

export async function GET() {
  try {
    const compliantPath = path.join(
      process.cwd(),
      "samples",
      "compliant-whitepaper.md"
    );
    const mismatchedPath = path.join(
      process.cwd(),
      "samples",
      "mismatched-whitepaper.md"
    );

    const compliantText = fs.readFileSync(compliantPath, "utf8");
    const mismatchedText = fs.readFileSync(mismatchedPath, "utf8");
    const deployed = await getDeployedContractAddresses();

    return NextResponse.json({
      samples: [
        {
          presetKey: "compliant",
          title: "BLI Compliant Utility Token (BLIC) 공시 정합성 점검",
          projectName: "BLI LegalTech Foundation",
          tokenSymbol: "BLIC",
          whitepaperFileName: "samples/compliant-whitepaper.md",
          whitepaperText: compliantText,
          documentHash: computeSha256Hex(compliantText),
          tokenAddress: deployed.compliantTokenAddress,
          chainId: 11155111,
          chainName: "Ethereum Sepolia",
          contractFile: "contracts/CompliantToken.sol",
        },
        {
          presetKey: "mismatched",
          title: "BLI Alpha Protocol Token (BLIX) 상장심사 불일치 점검",
          projectName: "BLI Alpha Labs Ltd.",
          tokenSymbol: "BLIX",
          whitepaperFileName: "samples/mismatched-whitepaper.md",
          whitepaperText: mismatchedText,
          documentHash: computeSha256Hex(mismatchedText),
          tokenAddress: deployed.mismatchedTokenAddress,
          chainId: 11155111,
          chainName: "Ethereum Sepolia",
          contractFile: "contracts/MismatchedToken.sol",
        },
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "샘플 백서를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}
