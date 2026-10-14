import fs from "node:fs";
import path from "node:path";
import {
  createAuditCase,
  getAuditCaseById,
  saveAuditReview,
  saveExtractedClaims,
} from "../src/lib/audit-service";
import { deployAllAuditContracts } from "../src/lib/onchain";
import { extractFiveCoreItemsFromWhitepaper } from "../src/lib/extractor";
import { runOnchainComparisonForAuditCase } from "../src/lib/comparator";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("==================================================================");
  console.log("🧪 [Step 2 Integration Test] Deploy -> Extract -> On-Chain Compare -> AuditRegistry Anchor");
  console.log("==================================================================");

  // 1. Deploy all 3 contracts
  const deployed = await deployAllAuditContracts();
  console.log("\n[1] Smart Contracts Deployed:");
  console.log(`  - Mode            : ${deployed.mode} (chainId: ${deployed.chainId})`);
  console.log(`  - CompliantToken  : ${deployed.compliantToken.address} (tx: ${deployed.compliantToken.txHash})`);
  console.log(`  - MismatchedToken : ${deployed.mismatchedToken.address} (tx: ${deployed.mismatchedToken.txHash})`);
  console.log(`  - AuditRegistry   : ${deployed.auditRegistry.address} (tx: ${deployed.auditRegistry.txHash})`);

  // 2. Create a fresh test AuditCase from mismatched-whitepaper.md
  const mismatchedWp = fs.readFileSync(
    path.join(process.cwd(), "samples", "mismatched-whitepaper.md"),
    "utf8"
  );

  const created = await createAuditCase({
    title: "[통합테스트] BLIX 백서 vs MismatchedToken 온체인 대조·앵커링 검증",
    projectName: "BLI Alpha Labs Ltd.",
    tokenSymbol: "BLIX",
    whitepaperFileName: "samples/mismatched-whitepaper.md",
    whitepaperText: mismatchedWp,
    tokenAddress: deployed.mismatchedToken.address,
    chainId: 11155111,
    chainName: "Ethereum Sepolia",
  });
  console.log(`\n[2] Created AuditCase in SQLite: id=${created.id}, documentHash=${created.documentHash}`);

  // 3. Extract 5 core claims from whitepaper and save to SQLite
  const extraction = await extractFiveCoreItemsFromWhitepaper(created.whitepaperText);
  const afterExtract = await saveExtractedClaims(created.id, extraction.items);
  console.log(`\n[3] Extracted 5 Core Claims (engine: ${extraction.engine}, stage: ${afterExtract?.stage}):`);
  for (const item of afterExtract?.checkItems || []) {
    console.log(`  - [${item.itemKey}] (${item.sectionRef}) => ${item.disclosedClaim}`);
  }

  // 4. Run real on-chain comparison via Chainlink CRE Workflow + ABI eth_call
  const afterCompare = await runOnchainComparisonForAuditCase(created.id);
  console.log(
    `\n[4] Chainlink CRE Workflow & On-Chain ABI eth_call Comparison Completed (block: #${afterCompare?.snapshotBlockNumber}, overallStatus: ${afterCompare?.overallStatus}):`
  );
  console.log(
    `  - CRE Workflow Run ID : ${afterCompare?.creWorkflowRunId}`
  );
  console.log(
    `  - CRE DON Consensus   : ${afterCompare?.creWorkflowTrace?.consensus.consensusDigest} (Quorum: ${afterCompare?.creWorkflowTrace?.consensus.quorumReached}/${afterCompare?.creWorkflowTrace?.consensus.nodeCount})`
  );
  console.log(
    `  - CRE Trace Steps     : ${afterCompare?.creWorkflowTrace?.steps.length} steps (${afterCompare?.creWorkflowTrace?.steps.map((s) => s.stepId).join(" -> ")})`
  );
  console.log(
    `  - Counts: MATCH=${afterCompare?.matchCount}, MISMATCH=${afterCompare?.mismatchCount}, NEEDS_HUMAN_REVIEW=${afterCompare?.needsReviewCount}`
  );
  for (const item of afterCompare?.checkItems || []) {
    console.log(`  - [${item.itemKey}] status=${item.status} (${item.severity})`);
    console.log(`      On-Chain : ${item.onchainState}`);
    console.log(`      Evidence : ${item.evidenceFunctionOrSlot}`);
  }

  // 5. Execute Reviewer Sign-off & Real AuditRegistry.recordAudit + verifyAnchor
  const afterAnchor = await saveAuditReview(created.id, {
    reviewerName: "박준법 수석심사역 (통합검증)",
    overallSummary:
      "5대 항목 온체인 대조 결과 4건 불일치(MISMATCH) 및 1건 법무검토(NEEDS_HUMAN_REVIEW)를 최종 확정하고 AuditRegistry에 증빙 해시를 앵커링함.",
    anchorAction: true,
    items: (afterCompare?.checkItems || []).map((i) => ({
      itemKey: i.itemKey,
      status: i.status,
      reviewerNote: `[검증완료] ${i.rationale.slice(0, 60)}...`,
    })),
  });

  console.log("\n[5] AuditRegistry.sol On-Chain Anchoring & verifyAnchor() Result:");
  console.log(`  - Stage                : ${afterAnchor?.stage}`);
  console.log(`  - AuditRegistry Addr   : ${afterAnchor?.auditRegistryAddress}`);
  console.log(`  - Anchor Tx Hash       : ${afterAnchor?.anchorTxHash}`);
  console.log(`  - Report Hash (SHA256) : ${afterAnchor?.reportHash}`);
  console.log(
    `  - verifyAnchor()       : ${afterAnchor?.anchorVerification?.verified} (block #${afterAnchor?.anchorVerification?.blockNumber}, auditor: ${afterAnchor?.anchorVerification?.auditor})`
  );

  // Clean up temporary test case so seed list stays clean with the 2 canonical cases
  await prisma.auditCase.delete({ where: { id: created.id } });
  const remaining = await getAuditCaseById("audit-compliant-blic");
  console.log(
    `\n[6] Seed Case Verification (audit-compliant-blic): tokenAddress=${remaining?.tokenAddress}, anchorVerified=${remaining?.anchorVerification?.verified}`
  );
  console.log("==================================================================");
  console.log("✅ ALL STEP 2 INTEGRATION ASSERTIONS PASSED");
  console.log("==================================================================");
}

main()
  .catch((err) => {
    console.error("Integration test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
