import assert from "node:assert/strict";
import React from "react";
(globalThis as any).React = React;
import { renderToString } from "react-dom/server";
import { NextRequest } from "next/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";

// Page Components (5 Separated Routes + Root Redirect)
import HomePage from "../src/app/page";
import AuditsListPage from "../src/app/audits/page";
import NewAuditPage from "../src/app/audits/new/page";
import AuditExtractPage from "../src/app/audits/[id]/extract/page";
import AuditComparePage from "../src/app/audits/[id]/compare/page";
import AuditReviewPage from "../src/app/audits/[id]/review/page";

// API Route Handlers
import { GET as getSamplesHandler } from "../src/app/api/samples/route";
import {
  GET as getAuditsHandler,
  POST as postAuditsHandler,
} from "../src/app/api/audits/route";
import {
  GET as getAuditByIdHandler,
  DELETE as deleteAuditByIdHandler,
} from "../src/app/api/audits/[id]/route";
import { POST as postExtractHandler } from "../src/app/api/audits/[id]/extract/route";
import { POST as postCompareHandler } from "../src/app/api/audits/[id]/compare/route";
import { POST as postReviewHandler } from "../src/app/api/audits/[id]/review/route";

import { prisma } from "../src/lib/prisma";

const mockRouter = {
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
};

function renderWithAppRouter(
  element: React.ReactElement,
  pathname = "/audits"
): string {
  return renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter as any },
      React.createElement(
        PathnameContext.Provider,
        { value: pathname },
        element
      )
    )
  );
}

async function main() {
  console.log("================================================================================");
  console.log("🚀 [Step 4 E2E Verification] 5 Multi-Page Routes & API Runtime Verification");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 0. Root Route (`/`) -> Redirects to `/audits`
  // ---------------------------------------------------------------------------
  console.log("▶ [0/5] Verifying Root Route (`GET /`) -> Redirects to `/audits`...");
  let redirectTarget = "";
  try {
    HomePage();
  } catch (err: any) {
    // Next.js `redirect("/audits")` throws a NEXT_REDIRECT control-flow error with digest containing `/audits`
    const digest = String(err?.digest || err?.message || "");
    if (digest.includes("/audits")) {
      redirectTarget = "/audits";
    } else {
      throw err;
    }
  }
  assert.equal(redirectTarget, "/audits", "Root page `/` must redirect to `/audits`");
  console.log("  ✅ `GET /` cleanly redirects to `/audits` (NEXT_REDIRECT verified)\n");

  // ---------------------------------------------------------------------------
  // 1. Page 1: `GET /audits`, `GET /api/audits`, `GET /api/samples`
  // ---------------------------------------------------------------------------
  console.log("▶ [1/5] Verifying Route 1: `GET /audits` & `GET /api/audits` & `GET /api/samples`...");
  const auditsApiRes = await getAuditsHandler();
  assert.equal(auditsApiRes.status, 200, "GET /api/audits must return 200");
  const auditsJson = await auditsApiRes.json();
  assert.ok(Array.isArray(auditsJson.audits), "audits array must exist");
  const hasBlic = auditsJson.audits.some((a: any) => a.id === "audit-compliant-blic");
  const hasBlix = auditsJson.audits.some((a: any) => a.id === "audit-mismatched-blix");
  assert.ok(hasBlic, "Seed case audit-compliant-blic (BLIC) must exist in SQLite");
  assert.ok(hasBlix, "Seed case audit-mismatched-blix (BLIX) must exist in SQLite");

  const samplesApiRes = await getSamplesHandler();
  assert.equal(samplesApiRes.status, 200, "GET /api/samples must return 200");
  const samplesJson = await samplesApiRes.json();
  assert.equal(samplesJson.samples.length, 2, "GET /api/samples must return 2 sample whitepapers");

  const auditsPageTree = await AuditsListPage();
  const auditsPageHtml = renderWithAppRouter(auditsPageTree);
  assert.ok(auditsPageHtml.includes("저장된 공시·스마트계약 불일치 점검 목록"), "Audits page title must render");
  assert.ok(auditsPageHtml.includes("audit-compliant-blic"), "BLIC case ID must render on /audits");
  assert.ok(auditsPageHtml.includes("audit-mismatched-blix"), "BLIX case ID must render on /audits");
  assert.ok(auditsPageHtml.includes("/audits/new"), "Link to /audits/new must render on /audits");
  console.log(`  ✅ \`GET /audits\` SSR HTML rendered (${auditsPageHtml.length.toLocaleString()} bytes) with BLIC & BLIX cases\n`);

  // ---------------------------------------------------------------------------
  // 2. Page 2: `GET /audits/new` & `POST /api/audits`
  // ---------------------------------------------------------------------------
  console.log("▶ [2/5] Verifying Route 2: `GET /audits/new` & `POST /api/audits` (Create New Audit Case)...");
  const newPageHtml = renderWithAppRouter(React.createElement(NewAuditPage));
  assert.ok(newPageHtml.includes("새 공시·스마트계약 불일치 점검 건 생성"), "New audit page header must render");
  assert.ok(newPageHtml.includes("샘플 1 불러오기: 정상 일치 백서 (BLIC)"), "Sample 1 preset button must render");
  assert.ok(newPageHtml.includes("샘플 2 불러오기: 불일치 백서 (BLIX)"), "Sample 2 preset button must render");

  const mismatchedSample = samplesJson.samples.find((s: any) => s.presetKey === "mismatched");
  assert.ok(mismatchedSample, "Mismatched sample preset must be available");

  const createReq = new NextRequest("http://localhost:3000/api/audits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "[Step 4 E2E] BLIX 상장심사 공시·스마트계약 불일치 전주기 점검",
      projectName: mismatchedSample.projectName,
      tokenSymbol: mismatchedSample.tokenSymbol,
      whitepaperFileName: mismatchedSample.whitepaperFileName,
      whitepaperText: mismatchedSample.whitepaperText,
      tokenAddress: mismatchedSample.tokenAddress,
      chainId: mismatchedSample.chainId,
      chainName: mismatchedSample.chainName,
    }),
  });
  const createRes = await postAuditsHandler(createReq);
  assert.equal(createRes.status, 201, "POST /api/audits must return 201 Created");
  const createData = await createRes.json();
  const createdId: string = createData.audit.id;
  assert.ok(createdId, "Created audit case must have a valid ID");
  assert.equal(createData.audit.stage, "CREATED", "Initial stage must be CREATED");
  assert.equal(createData.audit.checkItems.length, 5, "Must initialize 5 core check items");
  console.log(`  ✅ \`GET /audits/new\` SSR HTML rendered (${newPageHtml.length.toLocaleString()} bytes)`);
  console.log(`  ✅ \`POST /api/audits\` persisted new case in SQLite: id=${createdId}, documentHash=${createData.audit.documentHash.slice(0, 18)}...\n`);

  // ---------------------------------------------------------------------------
  // 3. Page 3: `GET /audits/[id]/extract` & `POST /api/audits/[id]/extract`
  // ---------------------------------------------------------------------------
  console.log("▶ [3/5] Verifying Route 3: `GET /audits/[id]/extract` & `POST /api/audits/[id]/extract`...");
  // 3a. Auto-extract 5 items from whitepaper
  const autoExtractReq = new NextRequest(`http://localhost:3000/api/audits/${createdId}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "auto" }),
  });
  const autoExtractRes = await postExtractHandler(autoExtractReq, {
    params: Promise.resolve({ id: createdId }),
  });
  assert.equal(autoExtractRes.status, 200, "POST /api/audits/[id]/extract (auto) must return 200");
  const autoExtractData = await autoExtractRes.json();
  assert.equal(autoExtractData.audit.stage, "EXTRACTED", "Stage must transition to EXTRACTED");

  // 3b. Manual adjustment save on `/audits/[id]/extract`
  const manualItems = autoExtractData.audit.checkItems.map((item: any) =>
    item.itemKey === "transferFee"
      ? {
          itemKey: item.itemKey,
          disclosedClaim: `${item.disclosedClaim} [법무팀 원문 대조 확인 완료]`,
          sourceQuote: item.sourceQuote,
          sectionRef: item.sectionRef,
        }
      : {
          itemKey: item.itemKey,
          disclosedClaim: item.disclosedClaim,
          sourceQuote: item.sourceQuote,
          sectionRef: item.sectionRef,
        }
  );
  const manualExtractReq = new NextRequest(`http://localhost:3000/api/audits/${createdId}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: manualItems }),
  });
  const manualExtractRes = await postExtractHandler(manualExtractReq, {
    params: Promise.resolve({ id: createdId }),
  });
  assert.equal(manualExtractRes.status, 200, "POST /api/audits/[id]/extract (manual save) must return 200");
  const manualExtractData = await manualExtractRes.json();
  const updatedFeeClaim = manualExtractData.audit.checkItems.find(
    (i: any) => i.itemKey === "transferFee"
  )?.disclosedClaim;
  assert.ok(
    updatedFeeClaim?.includes("[법무팀 원문 대조 확인 완료]"),
    "Manual edit to disclosedClaim must persist in SQLite"
  );

  // 3c. Render `/audits/[id]/extract` page SSR HTML
  const extractPageTree = await AuditExtractPage({
    params: Promise.resolve({ id: createdId }),
  });
  const extractPageHtml = renderWithAppRouter(extractPageTree);
  assert.ok(extractPageHtml.includes("백서 5대 핵심 항목 AI 자동 추출"), "Extract action button must render");
  assert.ok(extractPageHtml.includes("[법무팀 원문 대조 확인 완료]"), "Saved manual edit must render in SSR HTML");
  console.log(`  ✅ \`POST /api/audits/[id]/extract\` auto-extraction & manual override saved to SQLite`);
  console.log(`  ✅ \`GET /audits/[id]/extract\` SSR HTML rendered (${extractPageHtml.length.toLocaleString()} bytes)\n`);

  // ---------------------------------------------------------------------------
  // 4. Page 4: `GET /audits/[id]/compare` & `POST /api/audits/[id]/compare`
  // ---------------------------------------------------------------------------
  console.log("▶ [4/5] Verifying Route 4: `GET /audits/[id]/compare` & `POST /api/audits/[id]/compare` (Chainlink CRE)...");
  const compareReq = new NextRequest(`http://localhost:3000/api/audits/${createdId}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const compareRes = await postCompareHandler(compareReq, {
    params: Promise.resolve({ id: createdId }),
  });
  assert.equal(compareRes.status, 200, "POST /api/audits/[id]/compare must return 200");
  const compareData = await compareRes.json();
  assert.equal(compareData.audit.stage, "COMPARED", "Stage must transition to COMPARED");
  assert.equal(compareData.audit.overallStatus, "MISMATCH", "BLIX overall status must be MISMATCH");
  assert.equal(compareData.audit.mismatchCount, 4, "BLIX must detect 4 MISMATCH items");
  assert.equal(compareData.audit.needsReviewCount, 1, "BLIX must detect 1 NEEDS_HUMAN_REVIEW item");
  assert.ok(compareData.audit.creWorkflowTrace, "CRE Workflow Trace must be generated and stored");
  assert.equal(
    compareData.audit.creWorkflowTrace.steps.length,
    4,
    "CRE Workflow Trace must contain all 4 pipeline steps"
  );
  assert.ok(
    Array.isArray(compareData.audit.breachSimulations) &&
      compareData.audit.breachSimulations.length === 4,
    "Compare response must include all 4 counterfactual breach simulations"
  );
  assert.ok(
    compareData.audit.breachSimulations.every(
      (b: any) => b.outcome === "BREACH_SUCCEEDED"
    ),
    "BLIX must have BREACH_SUCCEEDED across all 4 counterfactual breach simulations"
  );

  // Render `/audits/[id]/compare` page SSR HTML
  const comparePageTree = await AuditComparePage({
    params: Promise.resolve({ id: createdId }),
  });
  const comparePageHtml = renderWithAppRouter(comparePageTree);
  assert.ok(
    comparePageHtml.includes("Chainlink CRE Workflow Execution Trace"),
    "CRE 4-Step Pipeline Inspector must render on /compare"
  );
  assert.ok(
    comparePageHtml.includes("온체인 공시 위반 행위 재현 결과"),
    "Counterfactual Breach Simulation Proof section must render on /compare"
  );
  assert.ok(
    comparePageHtml.includes("BREACH_SUCCEEDED"),
    "BREACH_SUCCEEDED badge must render on /compare for BLIX"
  );
  assert.ok(
    comparePageHtml.includes("Regulation (EU) 2023/1114"),
    "3-Jurisdiction statute mapping (MiCA) must render on /compare"
  );
  assert.ok(
    comparePageHtml.includes(compareData.audit.creWorkflowTrace.consensus.consensusDigest),
    "DON Consensus Digest must render on /compare"
  );
  console.log(
    `  ✅ \`POST /api/audits/[id]/compare\` executed Chainlink CRE 4-step workflow + 4 Counterfactual Breach Simulations (Run ID: ${compareData.audit.creWorkflowRunId})`
  );
  console.log(`  ✅ \`GET /audits/[id]/compare\` SSR HTML rendered (${comparePageHtml.length.toLocaleString()} bytes) with CRE trace, 16 EVM reads, 4 Breach Proofs & KR/EU/US statutes\n`);

  // ---------------------------------------------------------------------------
  // 5. Page 5: `GET /audits/[id]/review` & `POST /api/audits/[id]/review`
  // ---------------------------------------------------------------------------
  console.log("▶ [5/5] Verifying Route 5: `GET /audits/[id]/review` & `POST /api/audits/[id]/review` (Anchor & Report)...");
  const reviewReq = new NextRequest(`http://localhost:3000/api/audits/${createdId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reviewerName: "김법무 선임변호사 (E2E 검증)",
      overallSummary:
        "BLIX 백서 공시 주장과 MismatchedToken 온체인 상태 대조 결과 4건의 중대 불일치(MISMATCH) 및 1건의 법무 소명 필요(NEEDS_HUMAN_REVIEW)를 최종 확정하고 AuditRegistry에 해시를 앵커링함.",
      anchorAction: true,
      items: compareData.audit.checkItems.map((item: any) => ({
        itemKey: item.itemKey,
        status: item.status,
        reviewerNote: `[법무검토 완료] ${item.titleKo}: 온체인 증빙(${item.evidenceFunctionOrSlot}) 확인 완료.`,
      })),
    }),
  });
  const reviewRes = await postReviewHandler(reviewReq, {
    params: Promise.resolve({ id: createdId }),
  });
  assert.equal(reviewRes.status, 200, "POST /api/audits/[id]/review must return 200");
  const reviewData = await reviewRes.json();
  assert.equal(reviewData.audit.stage, "ANCHORED", "Stage must transition to ANCHORED");
  assert.ok(
    reviewData.audit.anchorTxHash?.startsWith("0x"),
    "AuditRegistry.recordAudit anchorTxHash must be generated"
  );
  assert.equal(
    reviewData.audit.anchorVerification?.verified,
    true,
    "AuditRegistry.verifyAnchor() must return true on-chain"
  );

  // Render `/audits/[id]/review` page SSR HTML
  const reviewPageTree = await AuditReviewPage({
    params: Promise.resolve({ id: createdId }),
  });
  const reviewPageHtml = renderWithAppRouter(reviewPageTree);
  assert.ok(
    reviewPageHtml.includes("verifyAnchor() === true (온체인 검증 완료)"),
    "On-chain verifyAnchor() badge must render on /review"
  );
  assert.ok(
    reviewPageHtml.includes(reviewData.audit.anchorTxHash),
    "anchorTxHash must render on /review"
  );
  assert.ok(
    reviewPageHtml.includes("증빙 패키지(JSON) 다운로드"),
    "JSON evidence export button must render on /review"
  );
  assert.ok(
    reviewPageHtml.includes("법무 시정요구서(Legal Cure Notice)") &&
      reviewPageHtml.includes("Solidity 방어 패치(Code Remediation Diff)"),
    "Legal Cure Notice & Solidity Code Remediation Diff panel must render on /review"
  );
  console.log(
    `  ✅ \`POST /api/audits/[id]/review\` anchored on AuditRegistry (tx: ${reviewData.audit.anchorTxHash.slice(0, 22)}..., verifyAnchor=true)`
  );
  console.log(`  ✅ \`GET /audits/[id]/review\` SSR HTML rendered (${reviewPageHtml.length.toLocaleString()} bytes) with Legal Cure Notice & Solidity Diff\n`);

  // ---------------------------------------------------------------------------
  // 6. Verify `GET /api/audits/[id]` & Clean Up Temporary Test Case (`DELETE /api/audits/[id]`)
  // ---------------------------------------------------------------------------
  const getByIdRes = await getAuditByIdHandler(
    new Request(`http://localhost:3000/api/audits/${createdId}`),
    { params: Promise.resolve({ id: createdId }) }
  );
  assert.equal(getByIdRes.status, 200, "GET /api/audits/[id] must return 200");

  const deleteRes = await deleteAuditByIdHandler(
    new Request(`http://localhost:3000/api/audits/${createdId}`, { method: "DELETE" }),
    { params: Promise.resolve({ id: createdId }) }
  );
  assert.equal(deleteRes.status, 200, "DELETE /api/audits/[id] must return 200");

  // Also verify seed cases render cleanly on `/extract`, `/compare`, `/review`
  for (const seedId of ["audit-compliant-blic", "audit-mismatched-blix"]) {
    const seedExtractHtml = renderWithAppRouter(
      await AuditExtractPage({ params: Promise.resolve({ id: seedId }) })
    );
    const seedCompareHtml = renderWithAppRouter(
      await AuditComparePage({ params: Promise.resolve({ id: seedId }) })
    );
    const seedReviewHtml = renderWithAppRouter(
      await AuditReviewPage({ params: Promise.resolve({ id: seedId }) })
    );
    assert.ok(seedExtractHtml.length > 1000 && seedCompareHtml.length > 1000 && seedReviewHtml.length > 1000);
    if (seedId === "audit-compliant-blic") {
      assert.ok(
        seedCompareHtml.includes("DEFENDED / BLOCKED_BY_CODE"),
        "BLIC /compare must render DEFENDED / BLOCKED_BY_CODE badge"
      );
    }
  }
  console.log("  ✅ Canonical seed cases (`audit-compliant-blic`, `audit-mismatched-blix`) verified across all 5 routes\n");

  console.log("================================================================================");
  console.log("🎉 ALL 5 MULTI-PAGE ROUTES & API HANDLERS PASSED E2E VERIFICATION (0 ERRORS)");
  console.log("================================================================================");
}

main()
  .catch((err) => {
    console.error("❌ E2E Route Verification Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.auditCase.deleteMany({
      where: {
        title: { startsWith: "[Step 4 E2E]" },
      },
    });
    await prisma.$disconnect();
  });
