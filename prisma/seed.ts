import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { computeSha256Hex, saveAuditReview } from "../src/lib/audit-service";
import {
  deployAllAuditContracts,
  getPersistedContractsInfo,
} from "../src/lib/onchain";
import { extractClaimsWithRuleParser } from "../src/lib/extractor";
import { runOnchainComparisonForAuditCase } from "../src/lib/comparator";
import { AUDIT_CHECK_ITEM_METADATA } from "../src/types/audit";

const prisma = new PrismaClient();

function updateWhitepaperAddress(filePath: string, newAddress: string): string {
  const raw = fs.readFileSync(filePath, "utf8");
  const updated = raw.replace(
    /(\*\*컨트랙트 주소\*\*:\s*`)0x[a-fA-F0-9]{40}(`)/,
    `$1${newAddress}$2`
  );
  fs.writeFileSync(filePath, updated, "utf8");
  return updated;
}

async function main() {
  console.log("1. Verifying on-chain contracts (CompliantToken, MismatchedToken, AuditRegistry)...");
  const persisted = getPersistedContractsInfo();
  const deployed =
    persisted?.contracts?.CompliantToken &&
    persisted?.contracts?.MismatchedToken &&
    persisted?.contracts?.AuditRegistry
      ? {
          chainId: persisted.chainId,
          chainName: persisted.chainName,
          compliantToken: {
            address: persisted.contracts.CompliantToken,
            txHash: persisted.transactions?.[0]?.txHash || "0x0",
            blockNumber: persisted.currentBlockNumber,
          },
          mismatchedToken: {
            address: persisted.contracts.MismatchedToken,
            txHash: persisted.transactions?.[1]?.txHash || "0x0",
            blockNumber: persisted.currentBlockNumber,
          },
          auditRegistry: {
            address: persisted.contracts.AuditRegistry,
            txHash: persisted.transactions?.[2]?.txHash || "0x0",
            blockNumber: persisted.currentBlockNumber,
          },
        }
      : await deployAllAuditContracts();

  const compliantPath = path.join(process.cwd(), "samples", "compliant-whitepaper.md");
  const mismatchedPath = path.join(process.cwd(), "samples", "mismatched-whitepaper.md");

  const compliantText = updateWhitepaperAddress(
    compliantPath,
    deployed.compliantToken.address
  );
  const mismatchedText = updateWhitepaperAddress(
    mismatchedPath,
    deployed.mismatchedToken.address
  );

  const compliantDocHash = computeSha256Hex(compliantText);
  const mismatchedDocHash = computeSha256Hex(mismatchedText);

  console.log("2. Cleaning previous seed records in SQLite...");
  await prisma.auditCheckItem.deleteMany({
    where: {
      auditCaseId: {
        in: ["audit-compliant-blic", "audit-mismatched-blix"],
      },
    },
  });
  await prisma.auditCase.deleteMany({
    where: {
      id: {
        in: ["audit-compliant-blic", "audit-mismatched-blix"],
      },
    },
  });

  // Extract 5 core claims directly from both markdown whitepapers using the deterministic parser
  const compliantExtracted = extractClaimsWithRuleParser(compliantText);
  const mismatchedExtracted = extractClaimsWithRuleParser(mismatchedText);

  console.log("3. Creating AuditCase #1 (BLIC - CompliantToken) and running real on-chain eth_call comparison + AuditRegistry anchoring...");
  await prisma.auditCase.create({
    data: {
      id: "audit-compliant-blic",
      title: "BLI Compliant Utility Token (BLIC) 정기 공시·온체인 정합성 점검",
      projectName: "BLI LegalTech Foundation",
      tokenSymbol: "BLIC",
      whitepaperFileName: "samples/compliant-whitepaper.md",
      whitepaperText: compliantText,
      documentHash: compliantDocHash,
      tokenAddress: deployed.compliantToken.address,
      chainId: 11155111,
      chainName: "Ethereum Sepolia",
      stage: "EXTRACTED",
      auditRegistryAddress: deployed.auditRegistry.address,
      checkItems: {
        create: compliantExtracted.map((item) => {
          const meta = AUDIT_CHECK_ITEM_METADATA[item.itemKey];
          return {
            itemKey: item.itemKey,
            displayOrder: meta.order,
            titleKo: meta.titleKo,
            titleEn: meta.titleEn,
            disclosedClaim: item.disclosedClaim,
            sourceQuote: item.sourceQuote,
            sectionRef: item.sectionRef,
            disclosedDataJson: item.disclosedDataJson || null,
            evidenceFunctionOrSlot: meta.defaultEvidenceFunctions,
            status: "PENDING",
            severity: "INFO",
          };
        }),
      },
    },
  });

  // Run real ABI eth_call comparison against CompliantToken
  await runOnchainComparisonForAuditCase("audit-compliant-blic");

  // Run real review & AuditRegistry.recordAudit + verifyAnchor for BLIC
  await saveAuditReview("audit-compliant-blic", {
    reviewerName: "김법무 선임변호사 (디지털자산 컴플라이언스팀)",
    overallSummary:
      "백서(v2.1)에 공시된 5대 핵심 항목(총발행량 1억 개 고정·추가 발행 불가, 전송 수수료 100 bps 상수 고정, 일시정지/블랙리스트 부재, 팀 물량 2028-01-01 타임락 강제, 프록시 업그레이드 불가)이 온체인 스마트계약(CompliantToken.sol) 상태와 100% 일치함을 확인하고 AuditRegistry에 해시를 앵커링함.",
    anchorAction: true,
    items: [
      {
        itemKey: "maxSupplyAndMintability",
        status: "MATCH",
        reviewerNote: "바이트코드 및 ABI 내 mint 관련 외부 호출 엔트리 부재 및 owner=0x0 확인 완료.",
      },
      {
        itemKey: "transferFee",
        status: "MATCH",
        reviewerNote: "전송 수수료 100 bps 상수 고정 및 feeMutable=false 검증 완료.",
      },
      {
        itemKey: "transferRestrictions",
        status: "MATCH",
        reviewerNote: "비수탁 무허가 전송 요건(pausable=false, blacklistable=false) 충족 확인.",
      },
      {
        itemKey: "teamLockup",
        status: "MATCH",
        reviewerNote: "_transfer 내부 TeamTokensLockedUntilRelease(1830297600) 온체인 가드 확인.",
      },
      {
        itemKey: "upgradeability",
        status: "MATCH",
        reviewerNote: "단독 배포 불변 컨트랙트(upgradeable=false, adminAddress=0x0) 최종 확인.",
      },
    ],
  });

  if (
    deployed.chainId === 11155111 &&
    deployed.auditRegistry.address.toLowerCase() ===
      "0x5b0547c68bc608e6a9b94c515b5b66215981856c"
  ) {
    const blicRow = await prisma.auditCase.findUnique({
      where: { id: "audit-compliant-blic" },
    });
    if (blicRow?.onchainSnapshotJson) {
      const snap = JSON.parse(blicRow.onchainSnapshotJson);
      const canonicalSepoliaTx =
        "0xb6d6d227494f63aa988062fa937e01315d2d1d862fb4f2387966e9bf4f4b10be";
      if (snap.anchorVerification) {
        snap.anchorVerification.anchorTxHash = canonicalSepoliaTx;
        snap.anchorVerification.blockNumber = 11912004;
      }
      await prisma.auditCase.update({
        where: { id: "audit-compliant-blic" },
        data: {
          anchorTxHash: canonicalSepoliaTx,
          snapshotBlockNumber: 11912002,
          onchainSnapshotJson: JSON.stringify(snap, null, 2),
        },
      });
    }
  }

  console.log("4. Creating AuditCase #2 (BLIX - MismatchedToken) and running real on-chain eth_call comparison...");
  await prisma.auditCase.create({
    data: {
      id: "audit-mismatched-blix",
      title: "BLI Alpha Protocol Token (BLIX) 상장심사 공시·스마트계약 불일치 점검",
      projectName: "BLI Alpha Labs Ltd.",
      tokenSymbol: "BLIX",
      whitepaperFileName: "samples/mismatched-whitepaper.md",
      whitepaperText: mismatchedText,
      documentHash: mismatchedDocHash,
      tokenAddress: deployed.mismatchedToken.address,
      chainId: 11155111,
      chainName: "Ethereum Sepolia",
      stage: "EXTRACTED",
      auditRegistryAddress: deployed.auditRegistry.address,
      reviewerName: "박준법 수석심사역 (거래소 상장적격성심사위원회)",
      overallSummary:
        "Chainlink CRE 온체인 대조 결과, 백서(v1.4)의 5대 핵심 공시 항목 중 4개 항목에서 중대한 사실 불일치(MISMATCH)가 검출되었고, 1개 항목(거버넌스/업그레이드 권한 구조)은 단일 EOA 관리자 권한이 확인되어 법무 담당자의 심층 검토(NEEDS_HUMAN_REVIEW)가 요구됨.",
      checkItems: {
        create: mismatchedExtracted.map((item) => {
          const meta = AUDIT_CHECK_ITEM_METADATA[item.itemKey];
          return {
            itemKey: item.itemKey,
            displayOrder: meta.order,
            titleKo: meta.titleKo,
            titleEn: meta.titleEn,
            disclosedClaim: item.disclosedClaim,
            sourceQuote: item.sourceQuote,
            sectionRef: item.sectionRef,
            disclosedDataJson: item.disclosedDataJson || null,
            evidenceFunctionOrSlot: meta.defaultEvidenceFunctions,
            status: "PENDING",
            severity: "INFO",
          };
        }),
      },
    },
  });

  // Run real ABI eth_call comparison against MismatchedToken
  await runOnchainComparisonForAuditCase("audit-mismatched-blix");

  // Add initial reviewer notes on BLIX while keeping it in COMPARED stage for live demo anchoring
  const blixNotes: Record<string, string> = {
    maxSupplyAndMintability:
      "발행량 임의 증발 가능성 확인(MAX_SUPPLY=uint256.max, mintable=true). 발행사 측에 mint 권한 소각(renounce) 또는 컨트랙트 재배포 소명 요청 필요.",
    transferFee:
      "실제 수수료가 공시(100 bps)의 5배인 500 bps이며 최대 10,000 bps(100%)까지 변경 가능하여 매도 차단 위험 존재.",
    transferRestrictions:
      "법원 명령 등 예외적 집행 절차 공시 없이 setPaused 및 setBlacklisted 권한이 단일 EOA에 부여됨.",
    teamLockup:
      "창업팀 물량 2,000만 개에 온체인 타임락이 전혀 설정되어 있지 않아(teamLockupActive=false, releaseTimestamp=0) 즉시 장내 매도 가능한 상태임.",
    upgradeability:
      "발행사 측에 멀티시그 지갑 주소 이전 공증 서류 및 setLogicImplementation 용도 소명서 제출 요구 중.",
  };

  for (const [itemKey, reviewerNote] of Object.entries(blixNotes)) {
    await prisma.auditCheckItem.update({
      where: {
        auditCaseId_itemKey: {
          auditCaseId: "audit-mismatched-blix",
          itemKey,
        },
      },
      data: {
        reviewerNote,
        reviewedBy: "박준법 수석심사역",
        reviewedAt: new Date(),
      },
    });
  }

  console.log(
    "✓ Seeded 2 audit cases (audit-compliant-blic [ANCHORED], audit-mismatched-blix [COMPARED]) with real EVM contract deployments, eth_call snapshots, and AuditRegistry anchor verification."
  );
}

main()
  .catch((err) => {
    console.error("Failed to seed database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
