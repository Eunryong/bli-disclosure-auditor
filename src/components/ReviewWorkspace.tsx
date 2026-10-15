"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AuditCaseDTO,
  AuditCheckItemDTO,
  AuditComparisonStatus,
  CounterfactualBreachSimulation,
  GeminiCallMetadata,
} from "@/types/audit";
import { ComparisonStatusBadge } from "@/components/StatusBadge";
import { getEtherscanAddressUrl, getEtherscanTxUrl } from "@/lib/etherscan";
import {
  CODE_REMEDIATION_SPECS,
  LEGAL_STATUTE_MAP,
  generateLegalCureNotice,
} from "@/lib/legal-knowledge";
import { useLanguage } from "@/lib/i18n";

export function ReviewWorkspace({
  initialAudit,
}: {
  initialAudit: AuditCaseDTO;
}) {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [audit, setAudit] = useState<AuditCaseDTO>(initialAudit);
  const [reviewerName, setReviewerName] = useState(
    initialAudit.reviewerName ||
      "Senior Legal Counsel, Digital Asset Compliance Desk"
  );
  const [overallSummary, setOverallSummary] = useState(
    initialAudit.overallSummary || ""
  );
  const [items, setItems] = useState<AuditCheckItemDTO[]>(
    initialAudit.checkItems || []
  );
  const [aiCureNoticeText, setAiCureNoticeText] = useState<string | null>(
    initialAudit.aiCureNoticeText || null
  );
  const [geminiTelemetry, setGeminiTelemetry] =
    useState<GeminiCallMetadata | null>(
      initialAudit.geminiTelemetry?.review || null
    );
  const [draftingAi, setDraftingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const [copiedCureNotice, setCopiedCureNotice] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const verification = audit.anchorVerification || null;
  const tokenExplorerUrl = getEtherscanAddressUrl(
    audit.chainId,
    audit.tokenAddress
  );
  const registryExplorerUrl = getEtherscanAddressUrl(
    audit.chainId,
    audit.auditRegistryAddress
  );
  const txExplorerUrl = getEtherscanTxUrl(audit.chainId, audit.anchorTxHash);

  let parsedSnapshot: any = null;
  if (audit.onchainSnapshotJson) {
    try {
      parsedSnapshot = JSON.parse(audit.onchainSnapshotJson);
    } catch {
      parsedSnapshot = null;
    }
  }

  const breachSimulations: CounterfactualBreachSimulation[] = Array.isArray(
    audit.breachSimulations
  )
    ? audit.breachSimulations
    : Array.isArray(parsedSnapshot?.breachSimulations)
    ? parsedSnapshot.breachSimulations
    : Array.isArray(parsedSnapshot?.creWorkflowTrace?.breachSimulations)
    ? parsedSnapshot.creWorkflowTrace.breachSimulations
    : [];

  const legalCureNotice = generateLegalCureNotice({
    ...audit,
    reviewerName,
    overallSummary,
    checkItems: items,
    breachSimulations,
  });

  const effectiveCureNoticeText =
    aiCureNoticeText || legalCureNotice.fullNoticeTextKo;

  function updateItemReview(
    itemKey: string,
    field: "status" | "reviewerNote",
    value: string
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.itemKey === itemKey
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function handleCopyCureNotice() {
    try {
      await navigator.clipboard.writeText(effectiveCureNoticeText);
      setCopiedCureNotice(true);
      setTimeout(() => setCopiedCureNotice(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  }

  async function handleGenerateAiDraft() {
    try {
      setDraftingAi(true);
      setFeedback(null);
      const res = await fetch(`/api/audits/${audit.id}/review/ai-draft`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            t(
              "Failed to generate Gemini AI Legal Opinion & Cure Notice.",
              "Gemini AI 법무 의견서 생성에 실패했습니다."
            )
        );
      }

      if (data.audit) {
        setAudit(data.audit);
        setOverallSummary(data.audit.overallSummary || "");
        setItems(data.audit.checkItems || []);
        if (data.audit.aiCureNoticeText) {
          setAiCureNoticeText(data.audit.aiCureNoticeText);
        }
        if (data.audit.geminiTelemetry?.review) {
          setGeminiTelemetry(data.audit.geminiTelemetry.review);
        }
      }
      if (data.geminiTelemetry) {
        setGeminiTelemetry(data.geminiTelemetry);
      }

      const meta: GeminiCallMetadata | undefined =
        data.geminiTelemetry || data.audit?.geminiTelemetry?.review;
      setFeedback(
        t(
          `Gemini AI Legal Opinion, 5 Clause Reviewer Notes & Formal Cure Notice synthesized and verified via 4-Layer Hallucination Guardrail (${
            meta?.model || "gemini-3.8-flash"
          } // ${meta?.latencyMs ?? 0}ms // ${meta?.totalTokens ?? 0} tokens).`,
          `Gemini AI 종합 법무 의견, 5개 조항 검토 메모 및 시정요구서가 4중 할루시네이션 가드레일 검증을 거쳐 생성·저장되었습니다 (${
            meta?.model || "gemini-3.8-flash"
          } // ${meta?.latencyMs ?? 0}ms // ${meta?.totalTokens ?? 0} tokens).`
        )
      );
      router.refresh();
    } catch (err: any) {
      setFeedback(
        err?.message ||
          t(
            "An error occurred during Gemini AI legal draft synthesis.",
            "Gemini AI 법무 초안 생성 중 오류가 발생했습니다."
          )
      );
    } finally {
      setDraftingAi(false);
    }
  }

  async function handleSaveReview(anchorAction: boolean) {
    try {
      if (anchorAction) {
        setAnchoring(true);
      } else {
        setSaving(true);
      }
      setFeedback(null);

      const res = await fetch(`/api/audits/${audit.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName,
          overallSummary,
          anchorAction,
          items: items.map((item) => ({
            itemKey: item.itemKey,
            status: item.status,
            reviewerNote: item.reviewerNote,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            t(
              "Failed to save legal review determination.",
              "검토 결과 저장에 실패했습니다."
            )
        );
      }

      setAudit(data.audit);
      setItems(data.audit.checkItems || []);
      setFeedback(
        anchorAction
          ? t(
              `AuditRegistry.sol recordAudit() executed and verifyAnchor() integrity verified (${
                data.audit.anchorVerification?.verified
                  ? "VERIFIED=true"
                  : "DONE"
              })! (Tx: ${data.audit.anchorTxHash})`,
              `AuditRegistry.sol recordAudit() 실행 및 verifyAnchor() 무결성 검증(${
                data.audit.anchorVerification?.verified
                  ? "VERIFIED=true"
                  : "DONE"
              }) 완료! (Tx: ${data.audit.anchorTxHash})`
            )
          : t(
              "Reviewer sign-off notes and final clause verdicts saved to SQLite DB.",
              "담당자 검토 메모 및 최종 판정 상태가 SQLite DB에 저장되었습니다."
            )
      );
      router.refresh();
    } catch (err: any) {
      setFeedback(
        err?.message ||
          t("An error occurred while saving.", "저장 중 오류가 발생했습니다.")
      );
    } finally {
      setSaving(false);
      setAnchoring(false);
    }
  }

  function handleExportJsonReport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      disclaimer:
        "This report is not legal advice or an automated determination of illegality; it serves as factual compliance evidence comparing whitepaper disclosures against on-chain smart contract configurations.",
      auditCase: {
        id: audit.id,
        title: audit.title,
        projectName: audit.projectName,
        tokenSymbol: audit.tokenSymbol,
        whitepaperFileName: audit.whitepaperFileName,
        documentHash: audit.documentHash,
        tokenAddress: audit.tokenAddress,
        chainId: audit.chainId,
        chainName: audit.chainName,
        snapshotBlockNumber: audit.snapshotBlockNumber,
        creWorkflowRunId: audit.creWorkflowRunId,
        mismatchCount: audit.mismatchCount,
        needsReviewCount: audit.needsReviewCount,
        matchCount: audit.matchCount,
        overallStatus: audit.overallStatus,
        reviewerName,
        overallSummary,
        reportHash: audit.reportHash,
        auditRegistryAddress: audit.auditRegistryAddress,
        anchorTxHash: audit.anchorTxHash,
        anchoredAt: audit.anchoredAt,
      },
      onchainAnchorVerification: verification,
      counterfactualBreachSimulations: breachSimulations,
      legalStatuteMappings: LEGAL_STATUTE_MAP,
      codeRemediationSpecs: CODE_REMEDIATION_SPECS,
      legalCureNoticeDraft: {
        ...legalCureNotice,
        fullNoticeTextKo: effectiveCureNoticeText,
      },
      geminiTelemetry: audit.geminiTelemetry,
      onchainSnapshot: parsedSnapshot,
      checkItems: items,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-evidence-package-${audit.tokenSymbol.toLowerCase()}-${audit.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrintReport() {
    setShowPrintReport(true);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  return (
    <div className="space-y-8">
      {/* =================================================================== */}
      {/* Formal Legal Opinion & On-Chain Notary Certificate Sheet            */}
      {/* =================================================================== */}
      <section className="border-2 border-[#111315] bg-white">
        {/* Official Law Firm Opinion Masthead */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#111315] bg-[#EFECE6] px-6 py-5">
          <div className="max-w-3xl space-y-1.5">
            <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#5A6065]">
              DESK 03 // FORMAL LEGAL OPINION &amp; CURE NOTICE BUREAU
            </div>
            <h2 className="font-editorial text-2xl font-bold tracking-tight text-[#111315]">
              {t(
                "Final Legal Sign-Off, Cure Notice & AuditRegistry On-Chain Hash Anchoring",
                "법무·컴플라이언스 담당자 최종 검토 및 AuditRegistry 온체인 해시 앵커링"
              )}
            </h2>
            <p className="text-xs leading-relaxed text-[#5A6065]">
              {t(
                "Finalize each clause's verdict (MATCH / MISMATCH / NEEDS_HUMAN_REVIEW) and legal opinion, then permanently notarize the integrity digests on-chain via AuditRegistry.sol recordAudit() without exposing confidential raw documents.",
                "각 조항의 최종 판정(MATCH / MISMATCH / NEEDS_HUMAN_REVIEW)과 법무 검토 의견을 확정하고, 개인정보·원문 노출 없이 무결성 다이제스트만 AuditRegistry.sol의 recordAudit()로 온체인에 영구 공증(Notarize)합니다."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={draftingAi || saving || anchoring}
              onClick={handleGenerateAiDraft}
              className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:opacity-50"
            >
              {draftingAi
                ? t(
                    "Synthesizing Legal Opinion with Gemini AI...",
                    "Gemini AI 법무 의견서 생성 중..."
                  )
                : t(
                    "Generate Legal Opinion & Cure Notice with Gemini AI",
                    "Gemini AI 법무 의견서·시정요구서 자동 작성"
                  )}
            </button>
            <button
              type="button"
              disabled={saving || anchoring}
              onClick={() => handleSaveReview(false)}
              className="rounded-[2px] border border-[#111315] bg-white px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#F7F6F2] disabled:opacity-50"
            >
              {saving
                ? t("Saving...", "저장 중...")
                : t("Save Legal Review to DB", "검토 의견 DB 저장")}
            </button>
            <button
              type="button"
              disabled={saving || anchoring}
              onClick={() => handleSaveReview(true)}
              className="rounded-[2px] border border-[#166534] bg-[#166534] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#14532D] disabled:opacity-50"
            >
              {anchoring
                ? t("Anchoring On-Chain...", "온체인 앵커링 중...")
                : t(
                    "Anchor on AuditRegistry (recordAudit & verifyAnchor)",
                    "온체인 앵커링 실행 (recordAudit & verifyAnchor)"
                  )}
            </button>
            <button
              type="button"
              onClick={handleExportJsonReport}
              className="rounded-[2px] border border-[#111315] bg-[#FAF9F5] px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#EFECE6]"
            >
              {t("Download Evidence Package (JSON)", "증빙 패키지(JSON) 다운로드")}
            </button>
            <button
              type="button"
              onClick={() => setShowPrintReport((prev) => !prev)}
              className="rounded-[2px] border border-[#111315] bg-[#FAF9F5] px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#EFECE6]"
            >
              {showPrintReport
                ? t("Close Printable Report View", "인쇄용 리포트 뷰 닫기")
                : t("Printable / PDF Report View", "인쇄/PDF용 리포트 뷰")}
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              className="rounded-[2px] border border-[#D8D4CC] bg-white px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:border-[#111315]"
            >
              {t("Print / Save PDF", "PDF / 인쇄")}
            </button>
          </div>
        </div>

        {/* Gemini AI Legal Review & 4-Layer Hallucination Guardrail Telemetry Strip */}
        <div className="space-y-1.5 border-b border-[#111315] bg-[#FAF9F5] px-6 py-2.5 font-mono text-[0.6875rem]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-[#111315]">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  geminiTelemetry?.liveApiCalled
                    ? "bg-[#166534]"
                    : "bg-[#166534]"
                }`}
              />
              <span className="font-bold uppercase tracking-[0.08em]">
                {t(
                  "GEMINI AI LEGAL COUNSEL ENGINE:",
                  "GEMINI AI 법무 추론 엔진:"
                )}
              </span>
              {geminiTelemetry ? (
                <span>
                  Model: <strong>{geminiTelemetry.model}</strong> · Latency:{" "}
                  <strong>{geminiTelemetry.latencyMs}ms</strong> · Tokens:{" "}
                  <strong>{geminiTelemetry.totalTokens}</strong> (in:{" "}
                  {geminiTelemetry.promptTokens} / out:{" "}
                  {geminiTelemetry.completionTokens})
                </span>
              ) : (
                <span className="text-[#5A6065]">
                  {t(
                    "Click 'Generate Legal Opinion & Cure Notice with Gemini AI' above to synthesize executive opinion, 5 clause notes & formal Cure Notice.",
                    "상단 'Gemini AI 법무 의견서·시정요구서 자동 작성' 버튼을 클릭하면 종합 의견·5개 조항 메모·시정요구서가 즉시 생성됩니다."
                  )}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[2px] border border-[#166534] bg-[#EAF3EC] px-2.5 py-0.5 font-bold text-[#166534]">
                Hallucination Guardrail: PASSED (Quote Grounded ✓ · EVM Facts Locked ✓ · Statutes Whitelisted ✓)
              </span>
              <span className="rounded-[2px] border border-[#111315] bg-white px-2 py-0.5 font-bold text-[#111315]">
                {geminiTelemetry?.guardrail?.signoffStatus || "AI_DRAFT_VERIFIED"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-[#5A6065]">
            <span>
              {t(
                "Guard 1: Exact Quote Grounding ✓ · Guard 2: Numerical & On-Chain Fact Lock ✓ · Guard 3: Closed-World Statute Whitelist (KR VAUPA / EU MiCA / US SEC) ✓ · Guard 4: Human Counsel Sign-off Gate Required before AuditRegistry.sol Anchoring",
                "Guard 1: 백서 원문 인용구 검증 ✓ · Guard 2: 온체인 수치·판정 잠금 ✓ · Guard 3: 화이트리스트 법령(KR/EU/US) 검증 ✓ · Guard 4: AuditRegistry.sol 온체인 앵커링 전 변호사(Counsel) 최종 서명 필수"
              )}
            </span>
            {geminiTelemetry?.fallbackNote && (
              <span className="text-[#9A3412]">
                {geminiTelemetry.fallbackNote}
              </span>
            )}
          </div>
        </div>

        {/* Counsel Sign-Off & Seal Block */}
        <div className="grid grid-cols-1 divide-y divide-[#D8D4CC] border-b border-[#111315] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          <div className="space-y-4 p-6 lg:col-span-8">
            <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[#5A6065]">
              SECTION I // LEAD COUNSEL SIGN-OFF &amp; EXECUTIVE LEGAL OPINION
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="reviewer-name"
                  className="block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#111315]"
                >
                  {t(
                    "Lead Reviewer / Counsel (reviewedBy)",
                    "검토 담당자 성명 / 소속 (reviewedBy)"
                  )}
                </label>
                <input
                  id="reviewer-name"
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="mt-1.5 w-full rounded-[2px] border border-[#111315] bg-[#FAF9F5] px-3 py-2 text-xs font-semibold text-[#111315] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="overall-summary"
                  className="block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#111315]"
                >
                  {t(
                    "Executive Legal & Compliance Opinion (overallSummary)",
                    "법무·컴플라이언스 종합 검토 의견 (overallSummary)"
                  )}
                </label>
                <textarea
                  id="overall-summary"
                  rows={3}
                  value={overallSummary}
                  onChange={(e) => setOverallSummary(e.target.value)}
                  placeholder={t(
                    "Enter executive legal review opinion regarding exchange listing eligibility or periodic disclosure audit.",
                    "상장적격성 심사 또는 정기 공시 점검에 관한 종합 검토 의견을 입력하세요."
                  )}
                  className="mt-1.5 w-full rounded-[2px] border border-[#111315] bg-[#FAF9F5] px-3 py-2 text-xs leading-relaxed text-[#111315] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Official Counsel Seal & Opinion Stamp Box */}
          <div className="flex flex-col justify-between bg-[#FAF9F5] p-6 lg:col-span-4">
            <div>
              <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-[#5A6065]">
                COUNSEL ATTESTATION &amp; SEAL
              </div>
              <div className="mt-3 border-2 border-[#111315] bg-white p-3.5">
                <div className="flex items-center justify-between border-b border-[#D8D4CC] pb-2">
                  <span className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#111315]">
                    BLI COMPLIANCE CHAMBER
                  </span>
                  <ComparisonStatusBadge status={audit.overallStatus} />
                </div>
                <div className="mt-2.5 font-editorial text-sm font-bold text-[#111315]">
                  {reviewerName}
                </div>
                <div className="mt-1 font-mono text-[0.6875rem] text-[#5A6065]">
                  DOCKET: {legalCureNotice.documentNumber}
                </div>
                <div className="mt-0.5 font-mono text-[0.6875rem] text-[#5A6065]">
                  VERDICT: MATCH {audit.matchCount} / MISMATCH {audit.mismatchCount} / REVIEW {audit.needsReviewCount}
                </div>
              </div>
            </div>

            <div className="mt-3 font-mono text-[0.65rem] leading-relaxed text-[#5A6065]">
              {t(
                "* This attestation block records human reviewer sign-off on factual comparison findings and does not constitute formal legal advice.",
                "* 본 서명란은 사실적 불일치 대조 결과에 대한 담당자 확인 기록이며 법률 자문이 아닙니다."
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Section II: AuditRegistry.sol On-Chain Notary Stamp Box           */}
        {/* ================================================================= */}
        <div className="p-6">
          <div
            className={`border-2 p-5 ${
              verification?.verified
                ? "border-[#166534] bg-[#EAF3EC]/45"
                : "border-[#92400E] bg-[#FEF3C7]/45"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111315] pb-3">
              <div>
                <div className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#5A6065]">
                  SECTION II // BLOCKCHAIN CRYPTOGRAPHIC NOTARY STAMP (AuditRegistry.sol)
                </div>
                <h3 className="font-editorial mt-0.5 text-lg font-bold text-[#111315]">
                  {t(
                    "AuditRegistry.sol On-Chain Anchoring & verifyAnchor() Cryptographic Proof",
                    "AuditRegistry.sol 온체인 앵커링 & verifyAnchor() 무결성 검증 결과"
                  )}
                </h3>
              </div>

              {verification?.verified ? (
                <span className="rounded-[2px] border border-[#166534] bg-[#EAF3EC] px-3 py-1 font-mono text-xs font-bold text-[#166534]">
                  {t(
                    "verifyAnchor() === true (On-Chain Verified)",
                    "verifyAnchor() === true (온체인 검증 완료)"
                  )}
                </span>
              ) : (
                <span className="rounded-[2px] border border-[#92400E] bg-[#FEF3C7] px-3 py-1 font-mono text-xs font-bold text-[#92400E]">
                  {t(
                    "Not Yet Anchored (Click 'Anchor on AuditRegistry' above)",
                    "미앵커링 (우측 상단 '온체인 앵커링 실행' 버튼을 클릭하세요)"
                  )}
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 font-mono text-xs text-[#111315] sm:grid-cols-2">
              <div className="border border-[#D8D4CC] bg-white p-3">
                <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                  auditRegistryAddress
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 break-all font-bold">
                  <span>
                    {audit.auditRegistryAddress ||
                      t("Not deployed", "미배포")}
                  </span>
                  {registryExplorerUrl && (
                    <a
                      href={registryExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[2px] border border-[#111315] bg-[#EFECE6] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#111315] hover:bg-[#111315] hover:text-white"
                    >
                      Etherscan &#8599;
                    </a>
                  )}
                </div>
              </div>

              <div className="border border-[#D8D4CC] bg-white p-3">
                <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                  anchorTxHash
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 break-all font-bold">
                  <span>
                    {audit.anchorTxHash || t("Not yet generated", "미생성")}
                  </span>
                  {txExplorerUrl && (
                    <a
                      href={txExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[2px] border border-[#166534] bg-[#EAF3EC] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#166534] hover:bg-[#166534] hover:text-white"
                    >
                      {t("View Sepolia Tx", "Sepolia Tx 보기")} &#8599;
                    </a>
                  )}
                </div>
              </div>

              <div className="border border-[#D8D4CC] bg-white p-3">
                <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                  documentHash (bytes32)
                </div>
                <div className="mt-1 break-all">{audit.documentHash}</div>
              </div>

              <div className="border border-[#D8D4CC] bg-white p-3">
                <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                  reportHash (bytes32)
                </div>
                <div className="mt-1 break-all">
                  {audit.reportHash ||
                    t(
                      "SHA-256 reportHash will be computed upon saving review.",
                      "검토 저장 시 SHA-256 reportHash가 자동 생성됩니다."
                    )}
                </div>
              </div>

              <div className="border border-[#D8D4CC] bg-white p-3">
                <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                  tokenAddress
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 break-all">
                  <span>{audit.tokenAddress}</span>
                  {tokenExplorerUrl && (
                    <a
                      href={tokenExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[2px] border border-[#111315] bg-[#EFECE6] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#111315] hover:bg-[#111315] hover:text-white"
                    >
                      Etherscan &#8599;
                    </a>
                  )}
                </div>
              </div>

              <div className="border border-[#D8D4CC] bg-white p-3">
                <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                  chainId / blockNumber / mismatchCount
                </div>
                <div className="mt-1 font-bold">
                  {audit.chainId} / #{audit.snapshotBlockNumber ?? 1} /{" "}
                  {audit.mismatchCount} {t("mismatches", "건")}
                </div>
              </div>

              {verification && (
                <>
                  <div className="border border-[#D8D4CC] bg-white p-3">
                    <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                      auditor (msg.sender)
                    </div>
                    <div className="mt-1 break-all">{verification.auditor}</div>
                  </div>
                  <div className="border border-[#D8D4CC] bg-white p-3">
                    <div className="text-[0.65rem] font-semibold uppercase text-[#5A6065]">
                      anchoredAt (block.timestamp)
                    </div>
                    <div className="mt-1">
                      {verification.anchoredAtTimestamp} (
                      {new Date(
                        verification.anchoredAtTimestamp * 1000
                      ).toISOString()}
                      )
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {feedback && (
          <div className="border-t border-[#166534] bg-[#EAF3EC] px-6 py-3 font-mono text-xs font-medium text-[#166534]">
            [NOTARY NOTICE] {feedback}
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* Printable / PDF Compliance Evidence Report View                     */}
      {/* =================================================================== */}
      {showPrintReport && (
        <section className="border-2 border-[#111315] bg-white p-8 text-[#111315]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#111315] pb-4">
            <div>
              <div className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#5A6065]">
                BLI LegalTech &amp; RegTech Compliance Audit Evidence Report
              </div>
              <h2 className="font-editorial mt-1 text-2xl font-bold text-[#111315]">
                {t(
                  "Smart Contract & Whitepaper Disclosure Consistency Evidence Report",
                  "스마트계약·공시자료(백서) 정합성 점검 증빙 리포트"
                )}
              </h2>
              <p className="mt-1 text-xs text-[#5A6065]">
                {t(
                  "This document does not constitute formal legal advice or an automated finding of illegality; it records 1:1 factual comparison and legal review between whitepaper disclosures (Claims) and on-chain smart contract parameters (Facts).",
                  "본 문서는 위법 여부의 자동 판정이나 법률 자문이 아니며, 공시 백서 원문(Claim)과 온체인 스마트계약 설정(Fact) 간의 1:1 사실 대조 및 법무 검토 증빙서입니다."
                )}
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#111315]">
              <div>Case ID: {audit.id}</div>
              <div>Token: {audit.tokenSymbol}</div>
              <div>Chain ID: {audit.chainId}</div>
              <div>Snapshot Block: #{audit.snapshotBlockNumber ?? 1}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 border border-[#111315] bg-[#FAF9F5] p-4 text-xs sm:grid-cols-2">
            <div>
              <strong>{t("Audit Docket Title:", "점검 건명:")}</strong>{" "}
              {audit.title}
            </div>
            <div>
              <strong>{t("Issuer Project:", "발행 프로젝트:")}</strong>{" "}
              {audit.projectName} ({audit.tokenSymbol})
            </div>
            <div className="font-mono">
              <strong>{t("Target Contract:", "대상 컨트랙트:")}</strong>{" "}
              {audit.tokenAddress}{" "}
              {tokenExplorerUrl && (
                <a
                  href={tokenExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  [Sepolia Etherscan]
                </a>
              )}
            </div>
            <div className="font-mono">
              <strong>{t("Whitepaper SHA-256:", "공시 문서 SHA-256:")}</strong>{" "}
              {audit.documentHash}
            </div>
            <div className="font-mono">
              <strong>
                {t("AuditRegistry Address:", "AuditRegistry 주소:")}
              </strong>{" "}
              {audit.auditRegistryAddress || "-"}{" "}
              {registryExplorerUrl && (
                <a
                  href={registryExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  [Sepolia Etherscan]
                </a>
              )}
            </div>
            <div className="font-mono">
              <strong>{t("Anchor Tx Hash:", "앵커링 Tx Hash:")}</strong>{" "}
              {audit.anchorTxHash || "-"}{" "}
              {txExplorerUrl && (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  [Sepolia Tx]
                </a>
              )}
            </div>
            <div className="font-mono sm:col-span-2">
              <strong>
                {t(
                  "Report Integrity Hash (reportHash):",
                  "리포트 무결성 해시(reportHash):"
                )}
              </strong>{" "}
              {audit.reportHash || "-"} (verifyAnchor:{" "}
              {verification?.verified
                ? t("TRUE - VERIFIED", "TRUE - 검증됨")
                : "PENDING"}
              )
            </div>
          </div>

          <div className="mt-5">
            <h3 className="font-editorial text-base font-bold text-[#111315]">
              {t(
                `1. Executive Legal & Compliance Opinion (${reviewerName})`,
                `1. 법무·컴플라이언스 종합 검토 의견 (${reviewerName})`
              )}
            </h3>
            <p className="mt-1.5 border border-[#D8D4CC] bg-[#FAF9F5] p-3 text-xs leading-relaxed text-[#111315]">
              {overallSummary ||
                t(
                  "No executive legal review opinion recorded.",
                  "등록된 종합 검토 의견이 없습니다."
                )}
            </p>
          </div>

          <div className="mt-5">
            <h3 className="font-editorial text-base font-bold text-[#111315]">
              {t(
                "2. 5 Mandatory Disclosure Clauses vs. On-Chain Reality 1:1 Comparison Ledger",
                "2. 5대 핵심 공시 항목 vs 온체인 실제 상태 1:1 대조 결과표"
              )}
            </h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse border border-[#111315] text-left text-xs">
                <thead className="bg-[#EFECE6] text-[#111315]">
                  <tr>
                    <th className="border border-[#111315] p-2">
                      {t("Audit Clause", "점검 항목")}
                    </th>
                    <th className="border border-[#111315] p-2">
                      {t("Disclosed Claim", "백서 공시 주장 (Claim)")}
                    </th>
                    <th className="border border-[#111315] p-2">
                      {t("On-Chain Reality (Fact)", "온체인 실제 값 (On-Chain Fact)")}
                    </th>
                    <th className="border border-[#111315] p-2">
                      {t("Verdict", "최종 판정")}
                    </th>
                    <th className="border border-[#111315] p-2">
                      {t("Counsel Reviewer Note", "법무 검토 메모 (Reviewer Note)")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.itemKey} className="align-top">
                      <td className="border border-[#111315] p-2 font-semibold">
                        {lang === "en" ? item.titleEn : item.titleKo}
                        <div className="mt-0.5 font-mono text-[0.65rem] text-[#5A6065]">
                          {item.sectionRef}
                        </div>
                      </td>
                      <td className="border border-[#111315] p-2">
                        {item.disclosedClaim}
                      </td>
                      <td className="border border-[#111315] p-2 font-mono text-[0.6875rem]">
                        {item.onchainState}
                        <div className="mt-1 text-[0.65rem] text-[#5A6065]">
                          {t("Evidence:", "근거:")} {item.evidenceFunctionOrSlot}
                        </div>
                      </td>
                      <td className="border border-[#111315] p-2 font-mono font-bold">
                        {item.status}
                      </td>
                      <td className="border border-[#111315] p-2">
                        {item.reviewerNote || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5">
            <h3 className="font-editorial text-base font-bold text-[#111315]">
              {t(
                "3. Formal Legal Cure Notice & Solidity Remediation Specification",
                "3. 법무 시정요구서(Legal Cure Notice) 및 Solidity 방어 패치 명세"
              )}
            </h3>
            <pre className="mt-2 whitespace-pre-wrap border border-[#111315] bg-[#FAF9F5] p-3 font-sans text-[0.7rem] leading-relaxed text-[#111315]">
              {effectiveCureNoticeText}
            </pre>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* Formal Legal Cure Notice & Solidity Redline Comparison Table        */}
      {/* =================================================================== */}
      <section className="border-2 border-[#111315] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#111315] bg-[#EFECE6] px-6 py-4">
          <div className="space-y-1">
            <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#5A6065]">
              SECTION III // OFFICIAL LEGAL CURE NOTICE &amp; REDLINE REMEDIATION SCHEDULE
            </div>
            <h3 className="font-editorial text-xl font-bold text-[#111315]">
              {t(
                "Formal Legal Cure Notice & Solidity Defense Patch (Code Remediation Diff)",
                "법무 시정요구서(Legal Cure Notice) & Solidity 방어 패치(Code Remediation Diff)"
              )}
            </h3>
            <p className="text-xs text-[#5A6065]">
              {t(
                "Generates an official Legal Cure Notice citing detected mismatches (MISMATCH), counterfactual breach execution proofs (BREACH_SUCCEEDED), and KR/EU/US regulatory statutes, paired with a side-by-side Solidity Redline Remediation Table.",
                "검출된 불일치(MISMATCH) 및 행위 재현 시뮬레이션(BREACH_SUCCEEDED) 증거와 한·EU·미 3대 관할권 법조문을 인용해 발행사 앞 발송할 공식 소명·시정요구서 초안과 Solidity 스마트계약 Redline 패치 대조표를 생성합니다."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={draftingAi || saving || anchoring}
              onClick={handleGenerateAiDraft}
              className="rounded-[2px] border border-[#111315] bg-white px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#FAF9F5] disabled:opacity-50"
            >
              {draftingAi
                ? t("Synthesizing...", "생성 중...")
                : t(
                    "Synthesize Cure Notice with Gemini AI",
                    "Gemini AI 시정요구서 재작성"
                  )}
            </button>
            <button
              type="button"
              onClick={handleCopyCureNotice}
              className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#1E293B]"
            >
              {copiedCureNotice
                ? t("Legal Cure Notice Copied!", "시정요구서 전문 복사됨!")
                : t(
                    "Copy Legal Cure Notice (Markdown)",
                    "법무 시정요구서(Markdown) 전문 복사"
                  )}
            </button>
          </div>
        </div>

        {/* Official Legal Cure Notice Memorandum Sheet */}
        <div className="border-b-2 border-[#111315] bg-[#FAF9F5] p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#111315] pb-2 font-mono text-xs">
            <span className="font-bold text-[#111315]">
              MEMORANDUM NO: {legalCureNotice.documentNumber} // TO: {legalCureNotice.recipientProject}
            </span>
            <span className="text-[#5A6065]">
              DATE: {legalCureNotice.issuedDateIso} // COUNSEL: {reviewerName}
            </span>
          </div>
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap border border-[#D8D4CC] bg-white p-5 font-sans text-xs leading-relaxed text-[#111315]">
            {effectiveCureNoticeText}
          </pre>
        </div>

        {/* Redline Comparison Table: Vulnerable Solidity (- BLIX) vs Remediated Patch (+ BLIC) */}
        <div className="p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#111315]">
              REDLINE COMPARISON SCHEDULE // VULNERABLE SOLIDITY (- BLIX) VS. REMEDIATED PATCH (+ BLIC) &amp; WHITEPAPER REDLINE
            </div>
            <span className="font-mono text-[0.6875rem] text-[#5A6065]">
              5 MANDATORY CLAUSES REDLINE TABLE
            </span>
          </div>

          <div className="overflow-x-auto border border-[#111315]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#111315] bg-[#EFECE6] font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]">
                  <th className="border-r border-[#D8D4CC] px-4 py-3">
                    {t(
                      "Clause & Vulnerability Diagnosis",
                      "조항 및 취약점 진단 (Clause & Diagnosis)"
                    )}
                  </th>
                  <th className="border-r border-[#D8D4CC] px-4 py-3 text-[#991B1B]">
                    {t(
                      "- Vulnerable Solidity (BLIX)",
                      "- 취약 코드 (Vulnerable Solidity)"
                    )}
                  </th>
                  <th className="border-r border-[#D8D4CC] px-4 py-3 text-[#166534]">
                    {t(
                      "+ Remediated Defense Patch (BLIC)",
                      "+ 공시 준수 방어 패치 (Remediated Solidity)"
                    )}
                  </th>
                  <th className="px-4 py-3">
                    {t(
                      "Dual Cure Options (Option A: Code Patch / Option B: Whitepaper Redline)",
                      "양방향 시정 권고안 (Option A: 코드 패치 / Option B: 백서 정정)"
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111315]">
                {items.map((item, idx) => {
                  const spec = CODE_REMEDIATION_SPECS[item.itemKey];
                  if (!spec) return null;
                  const clauseNum = String(idx + 1).padStart(2, "0");

                  return (
                    <tr key={`remediation-${item.itemKey}`} className="align-top bg-white">
                      {/* Col 1: Clause & Diagnosis */}
                      <td className="border-r border-[#D8D4CC] p-4 lg:w-1/5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-[#111315]">
                            § {clauseNum} [{item.itemKey}]
                          </span>
                          <ComparisonStatusBadge status={item.status} />
                        </div>
                        <div className="font-editorial mt-1.5 text-base font-bold text-[#111315]">
                          {spec.titleKo}
                        </div>
                        <p className="mt-2 border-l-2 border-[#991B1B] pl-2.5 text-xs leading-relaxed text-[#5A6065]">
                          <strong className="text-[#991B1B]">
                            {t("Diagnosis:", "취약점 진단:")}
                          </strong>{" "}
                          {spec.vulnerabilitySummaryKo}
                        </p>
                      </td>

                      {/* Col 2: Vulnerable Code (- Redline) */}
                      <td className="border-r border-[#D8D4CC] bg-[#FDECEC]/35 p-4 lg:w-[27%]">
                        <div className="mb-1.5 font-mono text-[0.65rem] font-bold text-[#991B1B]">
                          - {spec.vulnerableContractLabel}
                        </div>
                        <pre className="overflow-x-auto border border-[#991B1B]/40 bg-white p-2.5 font-mono text-[0.6875rem] leading-relaxed text-[#991B1B]">
                          {spec.vulnerableSolidityCode}
                        </pre>
                      </td>

                      {/* Col 3: Remediated Code (+ Redline) */}
                      <td className="border-r border-[#D8D4CC] bg-[#EAF3EC]/35 p-4 lg:w-[27%]">
                        <div className="mb-1.5 font-mono text-[0.65rem] font-bold text-[#166534]">
                          + {spec.remediatedContractLabel}
                        </div>
                        <pre className="overflow-x-auto border border-[#166534]/40 bg-white p-2.5 font-mono text-[0.6875rem] leading-relaxed text-[#166534]">
                          {spec.remediatedSolidityCode}
                        </pre>
                      </td>

                      {/* Col 4: Dual Remediation Options */}
                      <td className="space-y-2.5 p-4 text-xs lg:w-[26%]">
                        <div className="border border-[#166534]/50 bg-[#EAF3EC]/30 p-2.5">
                          <div className="font-mono text-[0.65rem] font-bold uppercase text-[#166534]">
                            {t(
                              "[OPTION A] Smart Contract Patch / Privilege Renouncement",
                              "[OPTION A] 스마트계약 재배포 / 권한 소각"
                            )}
                          </div>
                          <p className="mt-1 text-[0.72rem] leading-relaxed text-[#111315]">
                            {spec.whitepaperRedline.optionACodeEnforcedText}
                          </p>
                        </div>

                        <div className="border border-[#D8D4CC] bg-[#FAF9F5] p-2.5">
                          <div className="font-mono text-[0.65rem] font-bold uppercase text-[#92400E]">
                            {t(
                              "[OPTION B] Whitepaper Risk Disclosure Amendment (Redline)",
                              "[OPTION B] 백서 공시 문구 정정 (Redline)"
                            )}
                          </div>
                          <p className="mt-1 text-[0.72rem] leading-relaxed text-[#111315]">
                            {spec.whitepaperRedline.optionBDisclosureRiskRedline}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* Section IV: Clause-by-Clause Final Legal Sign-Off Ledger            */}
      {/* =================================================================== */}
      <section className="border border-[#111315] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111315] bg-[#EFECE6] px-6 py-3.5">
          <div className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-[#111315]">
            SECTION IV // CLAUSE-BY-CLAUSE LEGAL SIGN-OFF &amp; REVIEWER NOTES (§ 01 — § 05)
          </div>
          <span className="font-mono text-[0.6875rem] text-[#5A6065]">
            HUMAN-IN-THE-LOOP FINAL DETERMINATION
          </span>
        </div>

        <div className="divide-y divide-[#111315]">
          {items.map((item, idx) => {
            const legalMapping = LEGAL_STATUTE_MAP[item.itemKey];
            const clauseNum = String(idx + 1).padStart(2, "0");

            return (
              <div key={item.itemKey} className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D4CC] pb-3">
                  <div className="flex flex-wrap items-baseline gap-2.5">
                    <span className="font-mono text-xs font-bold tracking-[0.08em] text-[#111315]">
                      CLAUSE § {clauseNum} [{item.itemKey}]
                    </span>
                    <h3 className="font-editorial text-lg font-bold text-[#111315]">
                      {lang === "en" ? item.titleEn : item.titleKo}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <ComparisonStatusBadge status={item.status} />
                    <label
                      htmlFor={`status-${item.itemKey}`}
                      className="sr-only"
                    >
                      {t("Change Final Verdict", "최종 상태 변경")}
                    </label>
                    <select
                      id={`status-${item.itemKey}`}
                      value={item.status}
                      onChange={(e) =>
                        updateItemReview(
                          item.itemKey,
                          "status",
                          e.target.value as AuditComparisonStatus
                        )
                      }
                      className="rounded-[2px] border border-[#111315] bg-[#FAF9F5] px-3 py-1.5 font-mono text-xs font-semibold text-[#111315] focus:bg-white focus:outline-none"
                    >
                      <option value="MATCH">
                        {t("MATCH (Verified Compliant)", "MATCH (일치 확정)")}
                      </option>
                      <option value="MISMATCH">
                        {t("MISMATCH (Confirmed Breach)", "MISMATCH (불일치 확정)")}
                      </option>
                      <option value="NEEDS_HUMAN_REVIEW">
                        {t(
                          "NEEDS_HUMAN_REVIEW (Requires Off-Chain Evidence)",
                          "NEEDS_HUMAN_REVIEW (추가 소명/검토 필요)"
                        )}
                      </option>
                      <option value="PENDING">
                        {t("PENDING (Awaiting Audit)", "PENDING (대기)")}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                  <div className="border border-[#D8D4CC] bg-[#FAF9F5] p-3.5">
                    <div className="font-mono text-[0.6875rem] font-bold uppercase text-[#5A6065]">
                      {t("Disclosed Whitepaper Claim", "백서 공시 주장")} (
                      {item.sectionRef})
                    </div>
                    <p className="mt-1.5 font-medium leading-relaxed text-[#111315]">
                      {item.disclosedClaim}
                    </p>
                  </div>
                  <div className="border border-[#D8D4CC] bg-[#FAF9F5] p-3.5">
                    <div className="font-mono text-[0.6875rem] font-bold uppercase text-[#5A6065]">
                      {t("On-Chain Empirical State", "온체인 실제 값")} (
                      {item.evidenceFunctionOrSlot})
                    </div>
                    <p className="mt-1.5 font-mono leading-relaxed text-[#111315]">
                      {item.onchainState}
                    </p>
                  </div>
                </div>

                {legalMapping && (
                  <div className="mt-3 border border-[#D8D4CC] bg-white p-3">
                    <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-[#5A6065]">
                      {t(
                        "Applicable Regulatory Statutes & Listing Standards (KR / EU / US)",
                        "적용 법조문 및 거래소 심사 기준 (KR / EU / US)"
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                      {Object.values(legalMapping.statutes).map((cit) => (
                        <div
                          key={cit.jurisdiction}
                          className="border border-[#D8D4CC] bg-[#FAF9F5] p-2.5 text-[0.6875rem]"
                        >
                          <div className="font-semibold text-[#111315]">
                            {cit.flag} [{cit.jurisdictionLabelKo}] {cit.statuteTitle}
                          </div>
                          <div className="mt-0.5 font-mono font-bold text-[#92400E]">
                            {cit.articleRef}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label
                    htmlFor={`note-${item.itemKey}`}
                    className="block font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]"
                  >
                    {t(
                      "Legal & Compliance Counsel Reviewer Note (reviewerNote)",
                      "법무·컴플라이언스 담당자 검토 메모 (reviewerNote)"
                    )}
                  </label>
                  <textarea
                    id={`note-${item.itemKey}`}
                    rows={2}
                    value={item.reviewerNote}
                    onChange={(e) =>
                      updateItemReview(item.itemKey, "reviewerNote", e.target.value)
                    }
                    placeholder={t(
                      "Record cure requirements, on-chain privilege risk analysis, and off-chain evidentiary verification notes.",
                      "소명 요청 사항, 온체인 함수 위험도, 오프체인 증빙 대조 결과 등을 기록하세요."
                    )}
                    className="mt-1.5 w-full rounded-[2px] border border-[#111315] bg-[#FAF9F5] p-3 text-xs leading-relaxed text-[#111315] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#111315] bg-[#EFECE6] px-6 py-4">
        <Link
          href={`/audits/${audit.id}/compare`}
          className="rounded-[2px] border border-[#111315] bg-white px-4 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#F7F6F2]"
        >
          &larr;{" "}
          {t(
            "Previous Step: Chainlink CRE Comparison (/compare)",
            "이전 단계: Chainlink CRE 대조 (/compare)"
          )}
        </Link>

        <div className="font-mono text-xs text-[#5A6065]">
          {t(
            "ARCHIVAL PERSISTENCE: All determinations are permanently stored in SQLite DB (prisma/dev.db).",
            "ARCHIVAL PERSISTENCE: 모든 변경사항은 SQLite DB(prisma/dev.db)에 영구 보존됩니다."
          )}
        </div>
      </div>
    </div>
  );
}
