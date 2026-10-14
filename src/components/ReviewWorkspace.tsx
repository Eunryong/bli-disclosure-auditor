"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Anchor,
  Download,
  ExternalLink,
  Save,
  ShieldAlert,
  CheckCircle2,
  Printer,
  ShieldCheck,
  FileCheck2,
  Scale,
  Code2,
  Copy,
  Flame,
} from "lucide-react";
import type {
  AuditCaseDTO,
  AuditCheckItemDTO,
  AuditComparisonStatus,
  CounterfactualBreachSimulation,
} from "@/types/audit";
import { ComparisonStatusBadge } from "@/components/StatusBadge";
import { getEtherscanAddressUrl, getEtherscanTxUrl } from "@/lib/etherscan";
import {
  CODE_REMEDIATION_SPECS,
  LEGAL_STATUTE_MAP,
  generateLegalCureNotice,
} from "@/lib/legal-knowledge";

export function ReviewWorkspace({
  initialAudit,
}: {
  initialAudit: AuditCaseDTO;
}) {
  const router = useRouter();
  const [audit, setAudit] = useState<AuditCaseDTO>(initialAudit);
  const [reviewerName, setReviewerName] = useState(
    initialAudit.reviewerName || "김법무 선임변호사 (디지털자산 컴플라이언스팀)"
  );
  const [overallSummary, setOverallSummary] = useState(
    initialAudit.overallSummary || ""
  );
  const [items, setItems] = useState<AuditCheckItemDTO[]>(
    initialAudit.checkItems || []
  );
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
      await navigator.clipboard.writeText(legalCureNotice.fullNoticeTextKo);
      setCopiedCureNotice(true);
      setTimeout(() => setCopiedCureNotice(false), 2500);
    } catch {
      // ignore clipboard errors
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
        throw new Error(data.error || "검토 결과 저장에 실패했습니다.");
      }

      setAudit(data.audit);
      setItems(data.audit.checkItems || []);
      setFeedback(
        anchorAction
          ? `AuditRegistry.sol recordAudit() 실행 및 verifyAnchor() 무결성 검증(${
              data.audit.anchorVerification?.verified ? "VERIFIED=true" : "DONE"
            }) 완료! (Tx: ${data.audit.anchorTxHash})`
          : "담당자 검토 메모 및 최종 판정 상태가 SQLite DB에 저장되었습니다."
      );
      router.refresh();
    } catch (err: any) {
      setFeedback(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
      setAnchoring(false);
    }
  }

  function handleExportJsonReport() {
    const payload = {
      exportedAt: new Date().toISOString(),
      disclaimer:
        "본 리포트는 법률 자문이나 위법성 자동 판정이 아니며, 공시 백서와 온체인 스마트계약 설정 간의 사실 대조 증빙 자료입니다.",
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
      legalCureNoticeDraft: legalCureNotice,
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
    <div className="space-y-6">
      {/* Top Reviewer & On-Chain Anchor Summary Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              법무·컴플라이언스 담당자 최종 검토 및 AuditRegistry 온체인 해시 앵커링
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              각 항목의 최종 상태(<code>MATCH</code> / <code>MISMATCH</code> /{" "}
              <code>NEEDS_HUMAN_REVIEW</code>)와 검토 메모를 확정하고, 개인정보·원문 노출 없이 해시 요약본만{" "}
              <code>AuditRegistry.sol</code>의 <code>recordAudit()</code>로 온체인에 앵커링합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving || anchoring}
              onClick={() => handleSaveReview(false)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "저장 중..." : "검토 의견 DB 저장"}
            </button>
            <button
              type="button"
              disabled={saving || anchoring}
              onClick={() => handleSaveReview(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              <Anchor className="h-3.5 w-3.5" />
              {anchoring
                ? "온체인 앵커링 중..."
                : "온체인 앵커링 실행 (recordAudit & verifyAnchor)"}
            </button>
            <button
              type="button"
              onClick={handleExportJsonReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 px-3.5 py-2 text-xs font-semibold text-blue-200 hover:bg-blue-600/30"
            >
              <Download className="h-3.5 w-3.5" />
              증빙 패키지(JSON) 다운로드
            </button>
            <button
              type="button"
              onClick={() => setShowPrintReport((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-600/20 px-3.5 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-600/30"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              {showPrintReport ? "인쇄용 리포트 뷰 닫기" : "인쇄/PDF용 리포트 뷰"}
            </button>
            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF / 인쇄
            </button>
          </div>
        </div>

        {/* Reviewer Metadata Form */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="reviewer-name"
              className="block text-xs font-semibold text-slate-300"
            >
              검토 담당자 성명 / 소속 (reviewedBy)
            </label>
            <input
              id="reviewer-name"
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="overall-summary"
              className="block text-xs font-semibold text-slate-300"
            >
              법무·컴플라이언스 종합 검토 의견 (overallSummary)
            </label>
            <textarea
              id="overall-summary"
              rows={2}
              value={overallSummary}
              onChange={(e) => setOverallSummary(e.target.value)}
              placeholder="상장적격성 심사 또는 정기 공시 점검에 관한 종합 검토 의견을 입력하세요."
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* On-chain AuditRegistry Payload & verifyAnchor Verification Card */}
        <div className="mt-5 rounded-lg border border-emerald-500/30 bg-slate-950/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              AuditRegistry.sol 온체인 앵커링 & verifyAnchor() 무결성 검증 결과
            </div>
            {verification?.verified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-0.5 font-mono text-xs font-bold text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                verifyAnchor() === true (온체인 검증 완료)
              </span>
            ) : (
              <span className="font-mono text-xs text-amber-300">
                미앵커링 (우측 상단 &apos;온체인 앵커링 실행&apos; 버튼을 클릭하세요)
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 font-mono text-[0.6875rem] text-slate-300 sm:grid-cols-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500">auditRegistryAddress:</span>{" "}
              <span>{audit.auditRegistryAddress || "미배포"}</span>
              {registryExplorerUrl && (
                <a
                  href={registryExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  Etherscan
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500">anchorTxHash:</span>{" "}
              <span className="truncate">{audit.anchorTxHash || "미생성"}</span>
              {txExplorerUrl && (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                >
                  Sepolia Tx 보기
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <div>
              <span className="text-slate-500">documentHash (bytes32):</span>{" "}
              {audit.documentHash}
            </div>
            <div>
              <span className="text-slate-500">reportHash (bytes32):</span>{" "}
              {audit.reportHash ||
                "검토 저장 시 SHA-256 reportHash가 자동 생성됩니다."}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-500">tokenAddress:</span>{" "}
              <span>{audit.tokenAddress}</span>
              {tokenExplorerUrl && (
                <a
                  href={tokenExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/15 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-blue-300 hover:bg-blue-500/25"
                >
                  Etherscan
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <div>
              <span className="text-slate-500">
                chainId / blockNumber / mismatchCount:
              </span>{" "}
              {audit.chainId} / #{audit.snapshotBlockNumber ?? 1} /{" "}
              {audit.mismatchCount}건
            </div>
            {verification && (
              <>
                <div>
                  <span className="text-slate-500">auditor (msg.sender):</span>{" "}
                  {verification.auditor}
                </div>
                <div>
                  <span className="text-slate-500">
                    anchoredAt (block.timestamp):
                  </span>{" "}
                  {verification.anchoredAtTimestamp} (
                  {new Date(
                    verification.anchoredAtTimestamp * 1000
                  ).toISOString()}
                  )
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200">
          {feedback}
        </div>
      )}

      {/* Printable / PDF Compliance Evidence Report View */}
      {showPrintReport && (
        <section className="rounded-xl border-2 border-indigo-400/50 bg-white p-8 text-slate-900 shadow-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                BLI LegalTech & RegTech Compliance Audit Evidence Report
              </div>
              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                스마트계약·공시자료(백서) 정합성 점검 증빙 리포트
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                본 문서는 위법 여부의 자동 판정이나 법률 자문이 아니며, 공시 백서 원문(Claim)과 온체인 스마트계약 설정(Fact) 간의 1:1 사실 대조 및 법무 검토 증빙서입니다.
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-700">
              <div>Case ID: {audit.id}</div>
              <div>Token: {audit.tokenSymbol}</div>
              <div>Chain ID: {audit.chainId}</div>
              <div>Snapshot Block: #{audit.snapshotBlockNumber ?? 1}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg bg-slate-100 p-4 text-xs sm:grid-cols-2">
            <div>
              <strong>점검 건명:</strong> {audit.title}
            </div>
            <div>
              <strong>발행 프로젝트:</strong> {audit.projectName} (
              {audit.tokenSymbol})
            </div>
            <div className="font-mono">
              <strong>대상 컨트랙트:</strong> {audit.tokenAddress}{" "}
              {tokenExplorerUrl && (
                <a
                  href={tokenExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-700 underline"
                >
                  [Sepolia Etherscan]
                </a>
              )}
            </div>
            <div className="font-mono">
              <strong>공시 문서 SHA-256:</strong> {audit.documentHash}
            </div>
            <div className="font-mono">
              <strong>AuditRegistry 주소:</strong>{" "}
              {audit.auditRegistryAddress || "-"}{" "}
              {registryExplorerUrl && (
                <a
                  href={registryExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-700 underline"
                >
                  [Sepolia Etherscan]
                </a>
              )}
            </div>
            <div className="font-mono">
              <strong>앵커링 Tx Hash:</strong> {audit.anchorTxHash || "-"}{" "}
              {txExplorerUrl && (
                <a
                  href={txExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-700 underline"
                >
                  [Sepolia Tx]
                </a>
              )}
            </div>
            <div className="font-mono sm:col-span-2">
              <strong>리포트 무결성 해시(reportHash):</strong>{" "}
              {audit.reportHash || "-"} (verifyAnchor:{" "}
              {verification?.verified ? "TRUE - 검증됨" : "PENDING"})
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-900">
              1. 법무·컴플라이언스 종합 검토 의견 ({reviewerName})
            </h3>
            <p className="mt-1.5 rounded border border-slate-300 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
              {overallSummary || "등록된 종합 검토 의견이 없습니다."}
            </p>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-900">
              2. 5대 핵심 공시 항목 vs 온체인 실제 상태 1:1 대조 결과표
            </h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                <thead className="bg-slate-200 text-slate-900">
                  <tr>
                    <th className="border border-slate-300 p-2">점검 항목</th>
                    <th className="border border-slate-300 p-2">
                      백서 공시 주장 (Claim)
                    </th>
                    <th className="border border-slate-300 p-2">
                      온체인 실제 값 (On-Chain Fact)
                    </th>
                    <th className="border border-slate-300 p-2">최종 판정</th>
                    <th className="border border-slate-300 p-2">
                      법무 검토 메모 (Reviewer Note)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.itemKey} className="align-top">
                      <td className="border border-slate-300 p-2 font-semibold">
                        {item.titleKo}
                        <div className="mt-0.5 font-mono text-[0.65rem] text-slate-500">
                          {item.sectionRef}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2">
                        {item.disclosedClaim}
                      </td>
                      <td className="border border-slate-300 p-2 font-mono text-[0.6875rem]">
                        {item.onchainState}
                        <div className="mt-1 text-[0.65rem] text-slate-500">
                          근거: {item.evidenceFunctionOrSlot}
                        </div>
                      </td>
                      <td className="border border-slate-300 p-2 font-mono font-bold">
                        {item.status}
                      </td>
                      <td className="border border-slate-300 p-2">
                        {item.reviewerNote || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {breachSimulations.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-900">
                3. 온체인 공시 위반 행위 재현 시뮬레이션 (Adversarial Breach Simulation Proof)
              </h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full border-collapse border border-slate-300 text-left text-xs">
                  <thead className="bg-slate-200 text-slate-900">
                    <tr>
                      <th className="border border-slate-300 p-2">재현 시나리오</th>
                      <th className="border border-slate-300 p-2">실행 트랜잭션</th>
                      <th className="border border-slate-300 p-2">실행 전 → 실행 후 상태</th>
                      <th className="border border-slate-300 p-2">방어/위반 결과</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breachSimulations.map((sim) => (
                      <tr key={sim.scenarioId} className="align-top">
                        <td className="border border-slate-300 p-2 font-semibold">
                          {sim.titleKo}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono text-[0.6875rem]">
                          [{sim.targetFunction}] {sim.adversarialActionKo}
                          <div className="mt-0.5 text-[0.65rem] text-slate-500">
                            Gas: {sim.gasUsed} | Calldata: {sim.calldata.slice(0, 26)}...
                          </div>
                        </td>
                        <td className="border border-slate-300 p-2 font-mono text-[0.6875rem]">
                          <div>Before: {sim.beforeState}</div>
                          <div className="mt-0.5 font-semibold">
                            After: {sim.afterState}
                          </div>
                        </td>
                        <td className="border border-slate-300 p-2 font-mono font-bold">
                          {sim.badgeText}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5">
            <h3 className="text-sm font-bold text-slate-900">
              4. 법무 시정요구서(Legal Cure Notice) 및 Solidity 방어 패치 명세
            </h3>
            <pre className="mt-2 whitespace-pre-wrap rounded border border-slate-300 bg-slate-50 p-3 font-sans text-[0.7rem] leading-relaxed text-slate-800">
              {legalCureNotice.fullNoticeTextKo}
            </pre>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* Dedicated Panel: Legal Cure Notice & Solidity Code Remediation Diff */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-indigo-500/40 bg-slate-900/95 p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Code2 className="h-4 w-4 text-indigo-400" />
              법무 시정요구서(Legal Cure Notice) &amp; Solidity 방어 패치(Code Remediation Diff)
            </div>
            <h3 className="text-base font-bold text-white">
              공시·스마트계약 불일치 소명 요구 공문 초안 및 코드/백서 양방향 시정 가이드
            </h3>
            <p className="text-xs text-slate-400">
              검출된 불일치(<code>MISMATCH</code>) 및 행위 재현 시뮬레이션(
              <code>BREACH_SUCCEEDED</code>) 증거와 한·EU·미 3대 관할권 법조문을 인용해 발행사 앞 발송할 공식 소명·시정요구서 초안과 Solidity 스마트계약 패치 코드를 자동 생성합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyCureNotice}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/40 bg-indigo-600/25 px-3.5 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-600/40"
          >
            <Copy className="h-3.5 w-3.5" />
            {copiedCureNotice
              ? "시정요구서 전문 복사됨!"
              : "법무 시정요구서(Markdown) 전문 복사"}
          </button>
        </div>

        {/* Formal Legal Cure Notice Markdown Box */}
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono font-bold text-amber-300">
              문서번호: {legalCureNotice.documentNumber} | 수신: {legalCureNotice.recipientProject}
            </span>
            <span className="font-mono text-slate-400">
              발신일: {legalCureNotice.issuedDateIso} | 검토역: {reviewerName}
            </span>
          </div>
          <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded border border-slate-800/90 bg-slate-900/90 p-3.5 font-sans text-xs leading-relaxed text-slate-200">
            {legalCureNotice.fullNoticeTextKo}
          </pre>
        </div>

        {/* Side-by-Side Solidity Remediation Diff & Whitepaper Redline per Item */}
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <Flame className="h-4 w-4 text-amber-400" />
            <span>
              항목별 Solidity 취약 코드(<code>- BLIX</code>) vs 공시 준수 방어 코드(
              <code>+ BLIC Patch</code>) 및 백서 정정(Redline) 명세
            </span>
          </div>

          {items.map((item) => {
            const spec = CODE_REMEDIATION_SPECS[item.itemKey];
            if (!spec) return null;
            return (
              <div
                key={`remediation-${item.itemKey}`}
                className="rounded-lg border border-slate-800 bg-slate-950/90 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div>
                    <span className="font-mono text-xs font-bold text-indigo-300">
                      [{item.itemKey}]
                    </span>{" "}
                    <span className="text-sm font-bold text-white">
                      {spec.titleKo}
                    </span>
                  </div>
                  <ComparisonStatusBadge status={item.status} />
                </div>

                <p className="mt-2 text-xs text-rose-200/90">
                  <strong className="text-rose-300">핵심 취약점 진단:</strong>{" "}
                  {spec.vulnerabilitySummaryKo}
                </p>

                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded border border-rose-500/30 bg-rose-950/20 p-3">
                    <div className="mb-1.5 font-mono text-[0.6875rem] font-bold text-rose-300">
                      - {spec.vulnerableContractLabel}
                    </div>
                    <pre className="overflow-x-auto font-mono text-[0.6875rem] leading-relaxed text-rose-200">
                      {spec.vulnerableSolidityCode}
                    </pre>
                  </div>

                  <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-3">
                    <div className="mb-1.5 font-mono text-[0.6875rem] font-bold text-emerald-300">
                      + {spec.remediatedContractLabel}
                    </div>
                    <pre className="overflow-x-auto font-mono text-[0.6875rem] leading-relaxed text-emerald-200">
                      {spec.remediatedSolidityCode}
                    </pre>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2.5 text-xs md:grid-cols-2">
                  <div className="rounded border border-slate-800 bg-slate-900/80 p-2.5">
                    <div className="font-semibold text-emerald-300">
                      시정 방안 A — 스마트계약 재배포 / 권한 소각 (Code Remediation)
                    </div>
                    <p className="mt-1 text-[0.72rem] leading-relaxed text-slate-300">
                      {spec.whitepaperRedline.optionACodeEnforcedText}
                    </p>
                  </div>
                  <div className="rounded border border-slate-800 bg-slate-900/80 p-2.5">
                    <div className="font-semibold text-sky-300">
                      시정 방안 B — 백서 공시 문구 정정 공고 (Whitepaper Redline)
                    </div>
                    <p className="mt-1 text-[0.72rem] leading-relaxed text-slate-300">
                      {spec.whitepaperRedline.optionBDisclosureRiskRedline}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Item-by-Item Legal Review & Sign-off */}
      <div className="space-y-4">
        {items.map((item) => {
          const legalMapping = LEGAL_STATUTE_MAP[item.itemKey];
          return (
            <div
              key={item.itemKey}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-semibold text-blue-400">
                    [{item.itemKey}]
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {item.titleKo}
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <ComparisonStatusBadge status={item.status} />
                  <label
                    htmlFor={`status-${item.itemKey}`}
                    className="sr-only"
                  >
                    최종 상태 변경
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
                    className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="MATCH">MATCH (일치 확정)</option>
                    <option value="MISMATCH">MISMATCH (불일치 확정)</option>
                    <option value="NEEDS_HUMAN_REVIEW">
                      NEEDS_HUMAN_REVIEW (추가 소명/검토 필요)
                    </option>
                    <option value="PENDING">PENDING (대기)</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg bg-slate-950/70 p-3">
                  <div className="font-semibold text-sky-300">
                    백서 공시 주장 ({item.sectionRef})
                  </div>
                  <p className="mt-1 text-slate-200">{item.disclosedClaim}</p>
                </div>
                <div className="rounded-lg bg-slate-950/70 p-3">
                  <div className="font-semibold text-indigo-300">
                    온체인 실제 값 ({item.evidenceFunctionOrSlot})
                  </div>
                  <p className="mt-1 font-mono text-slate-200">
                    {item.onchainState}
                  </p>
                </div>
              </div>

              {legalMapping && (
                <div className="mt-3 rounded-lg border border-slate-800/90 bg-slate-950/80 p-3">
                  <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-amber-300">
                    <Scale className="h-3.5 w-3.5 text-amber-400" />
                    <span>적용 법조문 및 거래소 심사 기준 (KR / EU / US)</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    {Object.values(legalMapping.statutes).map((cit) => (
                      <div
                        key={cit.jurisdiction}
                        className="rounded border border-slate-800 bg-slate-900/70 p-2 text-[0.6875rem]"
                      >
                        <div className="font-semibold text-indigo-200">
                          {cit.flag} [{cit.jurisdictionLabelKo}] {cit.statuteTitle}
                        </div>
                        <div className="mt-0.5 font-mono text-amber-300">
                          {cit.articleRef}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <label
                  htmlFor={`note-${item.itemKey}`}
                  className="block text-xs font-semibold text-amber-300"
                >
                  법무·컴플라이언스 담당자 검토 메모 (reviewerNote)
                </label>
                <textarea
                  id={`note-${item.itemKey}`}
                  rows={2}
                  value={item.reviewerNote}
                  onChange={(e) =>
                    updateItemReview(item.itemKey, "reviewerNote", e.target.value)
                  }
                  placeholder="소명 요청 사항, 온체인 함수 위험도, 오프체인 증빙 대조 결과 등을 기록하세요."
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
        <Link
          href={`/audits/${audit.id}/compare`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          이전 단계: Chainlink CRE 대조 (/compare)
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span>모든 변경사항은 SQLite DB(prisma/dev.db)에 영구 보존됩니다.</span>
        </div>
      </div>
    </div>
  );
}
