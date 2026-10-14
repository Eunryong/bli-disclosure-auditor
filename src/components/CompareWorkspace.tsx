"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AuditCaseDTO,
  CounterfactualBreachSimulation,
  CreWorkflowExecutionTrace,
} from "@/types/audit";
import { ComparisonStatusBadge } from "@/components/StatusBadge";
import { getEtherscanAddressUrl, getEtherscanTxUrl } from "@/lib/etherscan";
import { LEGAL_STATUTE_MAP } from "@/lib/legal-knowledge";
import { useLanguage } from "@/lib/i18n";

export function CompareWorkspace({
  initialAudit,
}: {
  initialAudit: AuditCaseDTO;
}) {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [audit, setAudit] = useState<AuditCaseDTO>(initialAudit);
  const [runningCre, setRunningCre] = useState(false);
  const [showRawTraces, setShowRawTraces] = useState(false);
  const [selectedStepNumber, setSelectedStepNumber] = useState<number>(3);
  const [showAllStepsJson, setShowAllStepsJson] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const items = audit.checkItems || [];
  const tokenExplorerUrl = getEtherscanAddressUrl(
    audit.chainId,
    audit.tokenAddress
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
  const callTraces: Array<{
    fn: string;
    calldata: string;
    rawHex: string;
    decoded: string;
  }> = Array.isArray(parsedSnapshot?.rawCallTraces)
    ? parsedSnapshot.rawCallTraces
    : [];

  const creTrace: CreWorkflowExecutionTrace | null =
    audit.creWorkflowTrace || parsedSnapshot?.creWorkflowTrace || null;

  const breachSimulations: CounterfactualBreachSimulation[] = Array.isArray(
    audit.breachSimulations
  )
    ? audit.breachSimulations
    : Array.isArray(parsedSnapshot?.breachSimulations)
    ? parsedSnapshot.breachSimulations
    : Array.isArray(creTrace?.breachSimulations)
    ? creTrace.breachSimulations
    : [];

  async function handleRunCreCompare() {
    try {
      setRunningCre(true);
      setFeedback(null);
      const res = await fetch(`/api/audits/${audit.id}/compare`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error ||
            t(
              "Failed to execute Chainlink CRE comparison.",
              "Chainlink CRE 대조 실행에 실패했습니다."
            )
        );
      }
      setAudit(data.audit);
      setFeedback(
        t(
          `Chainlink CRE Workflow (${data.audit.creWorkflowRunId}) completed: 4-stage execution trace, DON consensus digest, and 1:1 comparison at Block #${data.audit.snapshotBlockNumber} saved to SQLite.`,
          `Chainlink CRE 워크플로(${data.audit.creWorkflowRunId})가 완료되어 4단계 실행 트레이스, DON 합의 다이제스트 및 블록 #${data.audit.snapshotBlockNumber} 기준 1:1 대조 결과가 SQLite DB에 저장되었습니다.`
        )
      );
      router.refresh();
    } catch (err: any) {
      setFeedback(
        err?.message ||
          t(
            "An error occurred during comparison execution.",
            "대조 실행 중 오류가 발생했습니다."
          )
      );
    } finally {
      setRunningCre(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* =================================================================== */}
      {/* Top Control & Telemetry Ledger Header                               */}
      {/* =================================================================== */}
      <section className="border border-[#111315] bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
          <div className="max-w-3xl space-y-1.5">
            <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#5A6065]">
              DESK 02 // CHAINLINK CRE FORENSIC CROSS-EXAMINATION TERMINAL
            </div>
            <h2 className="font-editorial text-2xl font-bold tracking-tight text-[#111315]">
              {t(
                "1:1 Cross-Examination: Whitepaper Disclosure Claims vs. On-Chain Smart Contract State",
                "백서 공시 주장 vs 온체인 스마트계약 상태 1:1 대조"
              )}
            </h2>
            <p className="text-xs leading-relaxed text-[#5A6065]">
              {lang === "en" ? (
                <>
                  Executes the 4-stage orchestration pipeline defined in{" "}
                  <code className="font-mono text-[#111315]">
                    cre-workflow/workflow.yaml
                  </code>{" "}
                  to cross-examine off-chain whitepaper claims (HTTP/LLM) against
                  16 view functions, the EIP-1967 implementation slot, and 4
                  forked EVM breach simulations on target contract{" "}
                  <code className="font-mono font-semibold text-[#111315]">
                    {audit.tokenAddress}
                  </code>
                  {tokenExplorerUrl && (
                    <a
                      href={tokenExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1.5 inline-flex items-center rounded-[2px] border border-[#111315] bg-[#EFECE6] px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-[#111315] hover:bg-[#111315] hover:text-white"
                    >
                      View Contract on Etherscan &#8599;
                    </a>
                  )}
                  , verifying the verdict via OCR3-BFT DON consensus.
                </>
              ) : (
                <>
                  오케스트레이션 매니페스트(
                  <code className="font-mono text-[#111315]">
                    cre-workflow/workflow.yaml
                  </code>
                  )에 정의된 4단계 파이프라인을 실행해 오프체인 백서 주장 추출(HTTP/LLM)과 대상 컨트랙트(
                  <code className="font-mono font-semibold text-[#111315]">
                    {audit.tokenAddress}
                  </code>
                  {tokenExplorerUrl && (
                    <a
                      href={tokenExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1.5 inline-flex items-center rounded-[2px] border border-[#111315] bg-[#EFECE6] px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-[#111315] hover:bg-[#111315] hover:text-white"
                    >
                      Etherscan에서 컨트랙트 보기 &#8599;
                    </a>
                  )}
                  )의 16개 view 함수·EIP-1967 슬롯 조회 결과를 DON 합의(OCR3-BFT)로 검증하고 DB에 영구 기록합니다.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={runningCre}
              onClick={handleRunCreCompare}
              className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-4 py-2.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:opacity-50"
            >
              {runningCre
                ? t(
                    "Running Chainlink CRE Workflow...",
                    "Chainlink CRE 워크플로 실행 중..."
                  )
                : t(
                    "Execute Chainlink CRE Workflow (Live On-Chain Snapshot)",
                    "Chainlink CRE 워크플로 실행 (실제 온체인 스냅샷 조회)"
                  )}
            </button>
            <button
              type="button"
              onClick={() => setShowRawTraces((prev) => !prev)}
              className="rounded-[2px] border border-[#111315] bg-[#EFECE6] px-3.5 py-2.5 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#111315] hover:text-white"
            >
              {showRawTraces
                ? t("Hide ABI eth_call Traces", "ABI eth_call 트레이스 접기")
                : t(
                    `Inspect ABI eth_call Traces (${callTraces.length})`,
                    `ABI eth_call 트레이스 보기 (${callTraces.length}건)`
                  )}
            </button>
            <Link
              href={`/audits/${audit.id}/review`}
              className="rounded-[2px] border border-[#111315] bg-white px-4 py-2.5 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#F7F6F2]"
            >
              {t(
                "Proceed to Step 3 (Legal Review & Anchor) →",
                "Step 3 (법무 검토·앵커링) 이동 →"
              )}
            </Link>
          </div>
        </div>

        {/* 4-Column Border-Divided Snapshot Telemetry Strip */}
        <div className="grid grid-cols-1 divide-y divide-[#D8D4CC] border-t border-[#111315] bg-[#FAF9F5] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-3.5">
            <div className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#5A6065]">
              CRE Workflow Run ID
            </div>
            <div className="mt-1 font-mono text-xs font-bold text-[#111315]">
              {audit.creWorkflowRunId ||
                t(
                  "Not Executed (Click Execute above)",
                  "미실행 (실행 버튼을 눌러주세요)"
                )}
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#5A6065]">
              {t("On-Chain Snapshot Block", "온체인 스냅샷 블록 번호")}
            </div>
            <div className="mt-1 font-mono text-xs font-bold text-[#111315]">
              {audit.snapshotBlockNumber
                ? `#${audit.snapshotBlockNumber} (${audit.chainName})`
                : t("Not Captured", "미수집")}
            </div>
            {txExplorerUrl && (
              <a
                href={txExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block font-mono text-[0.65rem] font-semibold text-[#166534] underline"
              >
                {t(
                  "View Anchor Tx on Etherscan ↗",
                  "Anchor Tx Etherscan 보기 ↗"
                )}
              </a>
            )}
          </div>

          <div className="px-5 py-3.5">
            <div className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#5A6065]">
              {t("Match / Mismatch / Review Counts", "일치 / 불일치 / 법무검토 건수")}
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-xs font-bold">
              <span className="text-[#166534]">MATCH {audit.matchCount}</span>
              <span className="text-[#D8D4CC]">|</span>
              <span className="text-[#991B1B]">MISMATCH {audit.mismatchCount}</span>
              <span className="text-[#D8D4CC]">|</span>
              <span className="text-[#92400E]">REVIEW {audit.needsReviewCount}</span>
            </div>
          </div>

          <div className="px-5 py-3.5">
            <div className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#5A6065]">
              {t("Overall Audit Verdict", "종합 대조 판정")}
            </div>
            <div className="mt-1">
              <ComparisonStatusBadge status={audit.overallStatus} />
            </div>
          </div>
        </div>

        {/* Google Gemini AI CRE Reasoning Telemetry Strip */}
        {(creTrace?.geminiTelemetry?.step3 || audit.geminiTelemetry?.compare) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#111315] bg-[#EFECE6] px-5 py-2 font-mono text-[0.7rem] text-[#111315]">
            {(() => {
              const gm =
                creTrace?.geminiTelemetry?.step3 ||
                audit.geminiTelemetry?.compare!;
              return (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-[2px] border px-2 py-0.5 font-bold ${
                        gm.liveApiCalled
                          ? "border-[#166534] bg-[#EAF3EC] text-[#166534]"
                          : "border-[#9A3412] bg-[#FEF5EC] text-[#9A3412]"
                      }`}
                    >
                      {gm.liveApiCalled
                        ? "CRE + GEMINI AI LIVE REASONING"
                        : "CRE + GEMINI DETERMINISTIC ENGINE"}
                    </span>
                    <span>
                      MODEL: <strong>{gm.model}</strong>
                    </span>
                    <span className="text-[#D8D4CC]">|</span>
                    <span>
                      LATENCY: <strong>{gm.latencyMs} ms</strong>
                    </span>
                    <span className="text-[#D8D4CC]">|</span>
                    <span>
                      TOKENS:{" "}
                      <strong>
                        {gm.totalTokens} (prompt {gm.promptTokens} + completion{" "}
                        {gm.completionTokens})
                      </strong>
                    </span>
                  </div>
                  {gm.fallbackReason && (
                    <span className="text-[0.65rem] text-[#9A3412]">
                      {gm.fallbackReason}
                    </span>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Optional ABI eth_call Raw Trace Inspector Table */}
        {showRawTraces && callTraces.length > 0 && (
          <div className="border-t border-[#111315] bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-[#111315]">
                LOW-LEVEL ABI ETH_CALL &amp; STORAGE SLOT TRACE LOG (CONTRACT: {audit.tokenAddress})
              </span>
              <span className="font-mono text-xs text-[#5A6065]">
                Block #{audit.snapshotBlockNumber}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto border border-[#111315]">
              <table className="w-full border-collapse text-left font-mono text-[0.6875rem]">
                <thead className="border-b border-[#111315] bg-[#EFECE6] text-[#111315]">
                  <tr>
                    <th className="border-r border-[#D8D4CC] px-3 py-2">Function</th>
                    <th className="border-r border-[#D8D4CC] px-3 py-2">Selector (Calldata)</th>
                    <th className="border-r border-[#D8D4CC] px-3 py-2">Decoded Value</th>
                    <th className="px-3 py-2">Raw Return Word (32-byte Hex)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8D4CC] bg-white">
                  {callTraces.map((trace) => (
                    <tr key={trace.fn}>
                      <td className="border-r border-[#D8D4CC] px-3 py-1.5 font-semibold text-[#111315]">
                        {trace.fn}
                      </td>
                      <td className="border-r border-[#D8D4CC] px-3 py-1.5 text-[#5A6065]">
                        {trace.calldata}
                      </td>
                      <td className="border-r border-[#D8D4CC] px-3 py-1.5 font-semibold text-[#166534]">
                        {trace.decoded}
                      </td>
                      <td className="max-w-xs truncate px-3 py-1.5 text-[#5A6065]">
                        {trace.rawHex}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {feedback && (
          <div className="border-t border-[#166534] bg-[#EAF3EC] px-6 py-3 font-mono text-xs font-medium text-[#166534]">
            [CRE EXECUTION NOTICE] {feedback}
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* Horizontal 4-Stage Chainlink CRE Pipeline Timeline Ledger           */}
      {/* =================================================================== */}
      <section className="border border-[#111315] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#111315] bg-[#EFECE6] px-6 py-3.5">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#111315]">
              Chainlink CRE Workflow Execution Trace (Trigger &rarr; Off-chain API/LLM &rarr; EVM Read &rarr; Consensus Report Hash)
            </div>
            <p className="mt-0.5 font-mono text-[0.6875rem] text-[#5A6065]">
              Manifest: {creTrace?.manifestPath || "cre-workflow/workflow.yaml"} // 4-Stage Deterministic Orchestration Ledger
            </p>
          </div>

          {creTrace && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-[2px] border border-[#111315] bg-white px-2.5 py-1 font-mono text-[0.6875rem] font-semibold text-[#111315]">
                Engine: {creTrace.runtimeEngine} ({creTrace.totalDurationMs} ms)
              </span>
              <button
                type="button"
                onClick={() => setShowAllStepsJson((prev) => !prev)}
                className="rounded-[2px] border border-[#111315] bg-[#0F172A] px-3 py-1 font-mono text-[0.6875rem] font-semibold text-white transition-colors hover:bg-[#1E293B]"
              >
                {showAllStepsJson
                  ? t("View Selected Stage Only", "선택 단계만 보기")
                  : t("Expand All 4 Stage JSON Payloads", "4단계 JSON 전체 펼치기")}
              </button>
            </div>
          )}
        </div>

        {!creTrace ? (
          <div className="p-8 text-center font-mono text-xs text-[#5A6065]">
            {t(
              "No Chainlink CRE Workflow execution trace has been recorded for this docket yet. Click 'Execute Chainlink CRE Workflow' above or run npm run cre:simulate in your terminal.",
              "아직 이 점검 건에 대한 Chainlink CRE Workflow 실행 트레이스가 없습니다. 상단의 'Chainlink CRE 워크플로 실행' 버튼을 클릭하거나 터미널에서 npm run cre:simulate를 실행하세요."
            )}
          </div>
        ) : (
          <div>
            {/* 4-Column Horizontal Pipeline Timeline */}
            <div className="grid grid-cols-1 divide-y divide-[#D8D4CC] border-b border-[#111315] md:grid-cols-4 md:divide-x md:divide-y-0">
              {creTrace.steps.map((step) => {
                const isSelected =
                  showAllStepsJson || selectedStepNumber === step.stepNumber;
                return (
                  <button
                    key={step.stepId}
                    type="button"
                    onClick={() => {
                      setShowAllStepsJson(false);
                      setSelectedStepNumber(step.stepNumber);
                    }}
                    className={`flex flex-col justify-between p-4 text-left transition-colors ${
                      isSelected
                        ? "bg-[#FAF9F5] shadow-[inset_0_-3px_0_0_#111315]"
                        : "bg-white hover:bg-[#F7F6F2]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]">
                          STAGE 0{step.stepNumber} // {step.status}
                        </span>
                        <span className="rounded-[2px] border border-[#D8D4CC] bg-[#EFECE6] px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-[#111315]">
                          {step.durationMs} ms
                        </span>
                      </div>
                      <div className="font-editorial mt-2 text-base font-bold text-[#111315]">
                        {step.title.replace(/^\[Step \d:\s*|\s*\]$/g, "")}
                      </div>
                      <div className="mt-1 truncate font-mono text-[0.65rem] font-semibold text-[#5A6065]">
                        {step.capability}
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 border-t border-[#D8D4CC] pt-2 text-[0.72rem] leading-relaxed text-[#5A6065]">
                      {step.summary}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* DON Consensus & Report Hash Digest Strip */}
            <div className="border-b border-[#111315] bg-[#FAF9F5] px-6 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                <div className="font-bold text-[#111315]">
                  DON CONSENSUS ({creTrace.consensus.donId} · {creTrace.consensus.protocol}) — QUORUM{" "}
                  {creTrace.consensus.quorumReached}/{creTrace.consensus.nodeCount} ORACLE NODES VERIFIED
                </div>
                <span className="text-[0.6875rem] text-[#5A6065]">
                  Executed: {creTrace.executedAt.replace("T", " ").slice(0, 19)} UTC
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 font-mono text-[0.6875rem] lg:grid-cols-2">
                <div className="truncate border border-[#D8D4CC] bg-white px-3 py-1.5 text-[#111315]">
                  <span className="font-semibold text-[#5A6065]">Consensus Digest: </span>
                  <span className="font-bold">{creTrace.consensus.consensusDigest}</span>
                </div>
                <div className="truncate border border-[#D8D4CC] bg-white px-3 py-1.5 text-[#111315]">
                  <span className="font-semibold text-[#5A6065]">Deterministic Report Hash: </span>
                  <span className="font-bold text-[#166534]">{creTrace.consensus.reportHash}</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Input / Output JSON Payload Inspector */}
            <div className="divide-y divide-[#D8D4CC] bg-white">
              {creTrace.steps
                .filter(
                  (step) =>
                    showAllStepsJson || step.stepNumber === selectedStepNumber
                )
                .map((step) => (
                  <div key={step.stepId} className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8D4CC] pb-2.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-[#111315]">
                          {step.title}
                        </span>
                        <span className="ml-2 rounded-[2px] border border-[#D8D4CC] bg-[#EFECE6] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-[#111315]">
                          {step.capability}
                        </span>
                      </div>
                      <span className="font-mono text-[0.6875rem] text-[#5A6065]">
                        Duration: {step.durationMs} ms | Status: {step.status}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-[#5A6065]">{step.summary}</p>

                    <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <div className="mb-1 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]">
                          Input Payload (JSON)
                        </div>
                        <pre className="max-h-56 overflow-auto border border-[#D8D4CC] bg-[#FAF9F5] p-3 font-mono text-[0.6875rem] leading-relaxed text-[#111315]">
                          {JSON.stringify(step.inputPayload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="mb-1 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#166534]">
                          Output Payload &amp; Consensus Result (JSON)
                        </div>
                        <pre className="max-h-56 overflow-auto border border-[#D8D4CC] bg-[#FAF9F5] p-3 font-mono text-[0.6875rem] leading-relaxed text-[#111315]">
                          {JSON.stringify(step.outputPayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* Middle Section: Monospace Forensic Execution Log & State Table      */}
      {/* =================================================================== */}
      {breachSimulations.length > 0 && (
        <section className="border-2 border-[#111315] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#111315] bg-[#EFECE6] px-6 py-4">
            <div className="space-y-1">
              <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#5A6065]">
                EXHIBIT B // ADVERSARIAL EVM SANDBOX EXECUTION LOG (evm.runCall)
              </div>
              <h3 className="font-editorial text-xl font-bold text-[#111315]">
                {t(
                  "Counterfactual Breach Simulation Proof (Forked EVM Sandbox Execution)",
                  "온체인 공시 위반 행위 재현 결과 (Adversarial Breach Simulation Proof)"
                )}
              </h3>
              <p className="text-xs text-[#5A6065]">
                {lang === "en" ? (
                  <>
                    Going beyond passive <code>view</code> getter reads, we
                    execute 4 adversarial transactions violating whitepaper
                    promises (unauthorized minting, 50% fee hike, investor wallet
                    freeze, premature team dump) inside a cloned EVM sandbox (
                    <code>evm.runCall</code>) to prove whether the bytecode
                    blocks the breach (
                    <code>DEFENDED / BLOCKED_BY_CODE</code>) or allows it (
                    <code>BREACH_SUCCEEDED</code>).
                  </>
                ) : (
                  <>
                    단순 <code>view</code> 변수 조회를 넘어, 복제된 EVM 샌드박스 상태(
                    <code>evm.runCall</code>)에서 백서 공시 약속을 위반하는 4대 악의적 트랜잭션(무단 발행·기습 수수료 50% 인상·투자자 지갑 동결·팀 물량 조기 유출)을 직접 실행해 코드 차원의 방어 여부(
                    <code>DEFENDED / BLOCKED_BY_CODE</code> vs{" "}
                    <code>BREACH_SUCCEEDED</code>)를 실증합니다.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="rounded-[2px] border border-[#166534] bg-[#EAF3EC] px-3 py-1 font-bold text-[#166534]">
                DEFENDED:{" "}
                {breachSimulations.filter((b) => b.outcome === "DEFENDED").length}
              </span>
              <span className="rounded-[2px] border border-[#991B1B] bg-[#FDECEC] px-3 py-1 font-bold text-[#991B1B]">
                BREACH_SUCCEEDED:{" "}
                {
                  breachSimulations.filter(
                    (b) => b.outcome === "BREACH_SUCCEEDED"
                  ).length
                }
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#111315] bg-[#FAF9F5] font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]">
                  <th className="border-r border-[#D8D4CC] px-4 py-3">
                    {t(
                      "Scenario & Whitepaper Promise",
                      "시나리오 및 백서 공시 약속"
                    )}
                  </th>
                  <th className="border-r border-[#D8D4CC] px-4 py-3">
                    {t(
                      "Simulated Exploit Call (EVM Call Trace)",
                      "재현 공격 트랜잭션 (EVM Call Trace)"
                    )}
                  </th>
                  <th className="border-r border-[#D8D4CC] px-4 py-3">
                    {t("Before State", "실행 전 상태 (Before State)")}
                  </th>
                  <th className="border-r border-[#D8D4CC] px-4 py-3">
                    {t("After State", "실행 후 상태 (After State)")}
                  </th>
                  <th className="px-4 py-3">
                    {t("Defense / Breach Verdict", "방어 / 위반 판정 (Verdict)")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111315]">
                {breachSimulations.map((sim, idx) => {
                  const isBreached = sim.outcome === "BREACH_SUCCEEDED";
                  return (
                    <tr
                      key={sim.scenarioId}
                      className={`align-top ${
                        isBreached ? "bg-[#FDECEC]/35" : "bg-white"
                      }`}
                    >
                      {/* Col 1: Scenario & Promise */}
                      <td className="border-r border-[#D8D4CC] px-4 py-4">
                        <div className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[#5A6065]">
                          SIMULATION #0{idx + 1} // {sim.titleEn}
                        </div>
                        <div className="font-editorial mt-1 text-base font-bold text-[#111315]">
                          {lang === "en" ? sim.titleEn : sim.titleKo}
                        </div>
                        <div className="mt-2 border-l-2 border-[#111315] pl-2.5 text-xs leading-relaxed text-[#5A6065]">
                          <span className="font-mono text-[0.65rem] font-semibold uppercase text-[#111315]">
                            {t("[Whitepaper Promise]", "[백서 약속]")}
                          </span>{" "}
                          {sim.whitepaperPromiseKo}
                        </div>
                      </td>

                      {/* Col 2: Attempted EVM Call Trace */}
                      <td className="border-r border-[#D8D4CC] px-4 py-4 font-mono text-xs">
                        <div className="font-bold text-[#111315]">
                          [{sim.targetFunction}]
                        </div>
                        <div className="mt-1 font-sans text-xs text-[#111315]">
                          {sim.adversarialActionKo}
                        </div>
                        <div className="mt-2 space-y-0.5 border border-[#D8D4CC] bg-[#FAF9F5] p-2 text-[0.65rem] text-[#5A6065]">
                          <div>
                            Gas Used:{" "}
                            <strong className="text-[#111315]">
                              {sim.gasUsed}
                            </strong>{" "}
                            | Reverted:{" "}
                            <strong className="text-[#111315]">
                              {sim.txReverted ? "true" : "false"}
                            </strong>
                          </div>
                          <div className="max-w-xs truncate">
                            Calldata: {sim.calldata}
                          </div>
                          {sim.revertReason && (
                            <div className="font-semibold text-[#166534]">
                              Revert/Guard: {sim.revertReason}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Col 3: Before State */}
                      <td className="border-r border-[#D8D4CC] px-4 py-4 font-mono text-xs text-[#111315]">
                        <div className="border border-[#D8D4CC] bg-[#FAF9F5] p-2.5 leading-relaxed">
                          {sim.beforeState}
                        </div>
                      </td>

                      {/* Col 4: After State */}
                      <td className="border-r border-[#D8D4CC] px-4 py-4 font-mono text-xs">
                        <div
                          className={`border p-2.5 font-bold leading-relaxed ${
                            isBreached
                              ? "border-[#991B1B] bg-[#FDECEC] text-[#991B1B]"
                              : "border-[#166534] bg-[#EAF3EC] text-[#166534]"
                          }`}
                        >
                          {sim.afterState}
                        </div>
                      </td>

                      {/* Col 5: Forensic Verdict & Impact */}
                      <td className="px-4 py-4">
                        {isBreached ? (
                          <span className="inline-block rounded-[2px] border border-[#991B1B] bg-[#FDECEC] px-2.5 py-1 font-mono text-[0.6875rem] font-bold text-[#991B1B]">
                            {t("BREACH_SUCCEEDED", "BREACH_SUCCEEDED (위반 성공)")}
                          </span>
                        ) : (
                          <span className="inline-block rounded-[2px] border border-[#166534] bg-[#EAF3EC] px-2.5 py-1 font-mono text-[0.6875rem] font-bold text-[#166534]">
                            DEFENDED / BLOCKED_BY_CODE
                          </span>
                        )}
                        <p className="mt-2 text-xs leading-relaxed text-[#111315]">
                          <strong>
                            {t("Forensic Conclusion:", "증빙 결론:")}
                          </strong>{" "}
                          {sim.stateDeltaSummary}
                        </p>
                        <p className="mt-1 text-[0.7rem] leading-relaxed text-[#5A6065]">
                          {sim.legalImpactKo}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* Bottom Section: 3-Column Precision Comparison Matrix                */}
      {/* [Disclosed Claim | On-Chain Fact | Statutory Provisions (KR·EU·US)] */}
      {/* =================================================================== */}
      <section className="space-y-5">
        <div className="border-b-2 border-[#111315] pb-3">
          <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-[#5A6065]">
            EXHIBIT C // 3-COLUMN CROSS-EXAMINATION MATRIX (CLAIM VS. FACT VS. STATUTE)
          </div>
          <h3 className="font-editorial mt-1 text-xl font-bold text-[#111315]">
            {t(
              "5 Core Disclosure Articles · On-Chain Facts · 3-Jurisdiction (KR · EU · US) Statutory Mapping",
              "5대 핵심 공시 조항 · 온체인 실측값 · 3대 관할권(KR·EU·US) 법조문 대조 원장"
            )}
          </h3>
        </div>

        {items.map((item, idx) => {
          const legalMapping = LEGAL_STATUTE_MAP[item.itemKey];
          const clauseNum = String(idx + 1).padStart(2, "0");
          const isMismatch = item.status === "MISMATCH";
          const isReview = item.status === "NEEDS_HUMAN_REVIEW";

          return (
            <div
              key={item.itemKey}
              className={`border bg-white ${
                isMismatch
                  ? "border-2 border-[#991B1B]"
                  : isReview
                  ? "border-2 border-[#92400E]"
                  : "border-[#111315]"
              }`}
            >
              {/* Clause Row Header Bar */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 border-b border-[#111315] px-5 py-3 ${
                  isMismatch
                    ? "bg-[#FDECEC]"
                    : isReview
                    ? "bg-[#FEF3C7]"
                    : "bg-[#EFECE6]"
                }`}
              >
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="font-mono text-xs font-bold tracking-[0.08em] text-[#111315]">
                    CLAUSE § {clauseNum} [{item.itemKey}]
                  </span>
                  <h4 className="font-editorial text-lg font-bold text-[#111315]">
                    {lang === "en"
                      ? `${idx + 1}. ${item.titleEn}`
                      : item.titleKo}
                  </h4>
                  <span className="font-mono text-xs text-[#5A6065]">
                    ({lang === "en" ? item.titleKo : item.titleEn})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-[2px] border border-[#111315] bg-white px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-[#111315]">
                    Severity: {item.severity}
                  </span>
                  <ComparisonStatusBadge status={item.status} />
                </div>
              </div>

              {/* 3-Column Comparison Matrix */}
              <div className="grid grid-cols-1 divide-y divide-[#D8D4CC] lg:grid-cols-12 lg:divide-x lg:divide-y-0">
                {/* Column 1 (4 cols): Disclosed Claim */}
                <div className="p-5 lg:col-span-4">
                  <div className="flex items-center justify-between border-b border-[#D8D4CC] pb-2">
                    <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]">
                      {t(
                        "COL I // DISCLOSED WHITEPAPER CLAIM",
                        "COL I // 공시 백서 주장 (DISCLOSED CLAIM)"
                      )}
                    </span>
                    <span className="font-mono text-[0.6875rem] font-semibold text-[#5A6065]">
                      {item.sectionRef || t("Uncited", "조항 미기재")}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-semibold leading-relaxed text-[#111315]">
                    {item.disclosedClaim ||
                      t(
                        "No disclosed claim extracted.",
                        "추출된 공시 주장이 없습니다."
                      )}
                  </p>

                  {item.sourceQuote && (
                    <blockquote className="mt-3 border-l-2 border-[#111315] bg-[#FAF9F5] p-3 font-serif text-xs italic leading-relaxed text-[#5A6065]">
                      &ldquo;{item.sourceQuote}&rdquo;
                    </blockquote>
                  )}
                </div>

                {/* Column 2 (4 cols): On-Chain Fact & Rationale */}
                <div className="bg-[#FAF9F5] p-5 lg:col-span-4">
                  <div className="flex items-center justify-between border-b border-[#D8D4CC] pb-2">
                    <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]">
                      {t(
                        "COL II // ON-CHAIN FACT (EVM READ)",
                        "COL II // 온체인 실측값 (ON-CHAIN FACT)"
                      )}
                    </span>
                    <span className="font-mono text-[0.65rem] text-[#5A6065]">
                      {item.evidenceFunctionOrSlot}
                    </span>
                  </div>

                  <div className="mt-3 border border-[#D8D4CC] bg-white p-3 font-mono text-xs leading-relaxed text-[#111315]">
                    {item.onchainState ||
                      t(
                        "On-chain state snapshot has not been collected yet.",
                        "아직 온체인 상태 스냅샷이 수집되지 않았습니다."
                      )}
                  </div>

                  <div className="mt-3 border-t border-[#D8D4CC] pt-2.5 text-xs leading-relaxed text-[#111315]">
                    <strong className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-[#5A6065]">
                      {t(
                        "Verification Rationale:",
                        "대조 판정 근거 (Rationale):"
                      )}
                    </strong>
                    <p className="mt-1">
                      {item.rationale ||
                        t(
                          "Execute CRE comparison to generate rationale.",
                          "CRE 대조 실행 후 판정 근거가 생성됩니다."
                        )}
                    </p>
                  </div>
                </div>

                {/* Column 3 (4 cols): KR · EU · US Statutes */}
                <div className="p-5 lg:col-span-4">
                  <div className="border-b border-[#D8D4CC] pb-2">
                    <span className="font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111315]">
                      {t(
                        "COL III // APPLICABLE STATUTES (KR · EU · US)",
                        "COL III // 관련 법령 조항 (KR · EU · US STATUTES)"
                      )}
                    </span>
                  </div>

                  {legalMapping ? (
                    <div className="mt-3 divide-y divide-[#D8D4CC]">
                      {Object.values(legalMapping.statutes).map((cit) => (
                        <div
                          key={cit.jurisdiction}
                          className="py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between font-mono text-[0.6875rem] font-bold text-[#111315]">
                            <span>
                              {cit.flag} [{cit.jurisdictionLabelKo}]
                            </span>
                            <span className="text-[#92400E]">
                              {cit.articleRef}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-[#111315]">
                            {cit.statuteTitle}
                          </div>
                          <p className="mt-1 text-[0.7rem] leading-relaxed text-[#5A6065]">
                            {cit.relevanceSummaryKo}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-[#5A6065]">
                      {t("No statutory mapping", "법조문 매핑 없음")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Bottom Step Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#111315] bg-[#EFECE6] px-6 py-4">
        <Link
          href={`/audits/${audit.id}/extract`}
          className="rounded-[2px] border border-[#111315] bg-white px-4 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#F7F6F2]"
        >
          {t(
            "← Previous Step: Extract 5 Core Claims (/extract)",
            "← 이전 단계: 백서 5대 항목 추출 (/extract)"
          )}
        </Link>

        <Link
          href={`/audits/${audit.id}/review`}
          className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-5 py-2.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#1E293B]"
        >
          {t(
            "Next Step: Legal Review & On-Chain Hash Anchoring (/review) →",
            "다음 단계: 법무 검토 메모 작성 및 해시 앵커링 (/review) →"
          )}
        </Link>
      </div>
    </div>
  );
}
