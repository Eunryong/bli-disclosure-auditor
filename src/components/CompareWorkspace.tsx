"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Play,
  Terminal,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Scale,
  Flame,
  Layers,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import type {
  AuditCaseDTO,
  CounterfactualBreachSimulation,
  CreWorkflowExecutionTrace,
} from "@/types/audit";
import { ComparisonStatusBadge } from "@/components/StatusBadge";
import { getEtherscanAddressUrl, getEtherscanTxUrl } from "@/lib/etherscan";
import { LEGAL_STATUTE_MAP } from "@/lib/legal-knowledge";

export function CompareWorkspace({
  initialAudit,
}: {
  initialAudit: AuditCaseDTO;
}) {
  const router = useRouter();
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
        throw new Error(data.error || "Chainlink CRE 대조 실행에 실패했습니다.");
      }
      setAudit(data.audit);
      setFeedback(
        `Chainlink CRE 워크플로(${data.audit.creWorkflowRunId})가 완료되어 4단계 실행 트레이스, DON 합의 다이제스트 및 블록 #${data.audit.snapshotBlockNumber} 기준 1:1 대조 결과가 SQLite DB에 저장되었습니다.`
      );
      router.refresh();
    } catch (err: any) {
      setFeedback(err?.message || "대조 실행 중 오류가 발생했습니다.");
    } finally {
      setRunningCre(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Chainlink CRE Workflow Control Panel */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Cpu className="h-4 w-4 text-indigo-400" />
              Chainlink CRE (Compute Runtime Environment) On-Chain Verification
            </div>
            <h2 className="text-lg font-bold text-white">
              백서 공시 주장 vs 온체인 스마트계약 상태 1:1 대조
            </h2>
            <p className="text-xs text-slate-300">
              오케스트레이션 매니페스트(<code>cre-workflow/workflow.yaml</code>)에 정의된 4단계 파이프라인을 실행해 오프체인 백서 주장 추출(HTTP/LLM)과 대상 컨트랙트(
              <code className="text-indigo-200">{audit.tokenAddress}</code>
              {tokenExplorerUrl && (
                <a
                  href={tokenExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1.5 inline-flex items-center gap-1 rounded border border-indigo-400/40 bg-indigo-500/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-indigo-200 hover:bg-indigo-500/30"
                >
                  Etherscan에서 컨트랙트 보기
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
              )의 16개 view 함수·EIP-1967 슬롯 조회 결과를 DON 합의(OCR3-BFT)로 검증하고 DB에 영구 기록합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={runningCre}
              onClick={handleRunCreCompare}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {runningCre
                ? "Chainlink CRE 워크플로 실행 중..."
                : "Chainlink CRE 워크플로 실행 (실제 온체인 스냅샷 조회)"}
            </button>
            <button
              type="button"
              onClick={() => setShowRawTraces((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-slate-900/90 px-3.5 py-2.5 text-xs font-semibold text-indigo-200 hover:bg-slate-800"
            >
              <Code2 className="h-3.5 w-3.5" />
              {showRawTraces
                ? "ABI eth_call 트레이스 접기"
                : `ABI eth_call 트레이스 보기 (${callTraces.length}건)`}
            </button>
            <Link
              href={`/audits/${audit.id}/review`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
            >
              Step 3 (법무 검토·앵커링) 이동
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Snapshot Telemetry */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-indigo-500/20 pt-4 text-xs sm:grid-cols-4">
          <div className="rounded-lg bg-slate-950/70 p-3">
            <span className="text-slate-400">CRE Workflow Run ID</span>
            <div className="mt-1 font-mono font-semibold text-indigo-300">
              {audit.creWorkflowRunId || "미실행 (실행 버튼을 눌러주세요)"}
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/70 p-3">
            <span className="text-slate-400">온체인 스냅샷 블록 번호</span>
            <div className="mt-1 font-mono font-semibold text-white">
              {audit.snapshotBlockNumber
                ? `#${audit.snapshotBlockNumber} (${audit.chainName})`
                : "미수집"}
            </div>
            {txExplorerUrl && (
              <a
                href={txExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-sans text-[0.65rem] font-semibold text-emerald-300 hover:underline"
              >
                Anchor Tx Etherscan 보기
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
          <div className="rounded-lg bg-slate-950/70 p-3">
            <span className="text-slate-400">일치 / 불일치 / 법무검토 건수</span>
            <div className="mt-1 flex items-center gap-2 font-semibold">
              <span className="text-emerald-300">MATCH {audit.matchCount}</span>
              <span>·</span>
              <span className="text-rose-300">
                MISMATCH {audit.mismatchCount}
              </span>
              <span>·</span>
              <span className="text-amber-300">
                REVIEW {audit.needsReviewCount}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-slate-950/70 p-3">
            <span className="text-slate-400">종합 대조 판정</span>
            <div className="mt-1">
              <ComparisonStatusBadge status={audit.overallStatus} />
            </div>
          </div>
        </div>

        {/* Optional ABI eth_call Raw Trace Inspector */}
        {showRawTraces && callTraces.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-indigo-300">
              <span>
                실제 ABI 인코딩 eth_call 호출 및 디코딩 로그 (Contract:{" "}
                {audit.tokenAddress})
              </span>
              <span className="font-mono text-slate-400">
                Block #{audit.snapshotBlockNumber}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left font-mono text-[0.6875rem] text-slate-300">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-1.5 pr-3">Function</th>
                    <th className="py-1.5 pr-3">Selector (Calldata)</th>
                    <th className="py-1.5 pr-3">Decoded Value</th>
                    <th className="py-1.5">Raw Return Word (32-byte Hex)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {callTraces.map((trace) => (
                    <tr key={trace.fn}>
                      <td className="py-1.5 pr-3 font-semibold text-indigo-300">
                        {trace.fn}
                      </td>
                      <td className="py-1.5 pr-3 text-sky-300">
                        {trace.calldata}
                      </td>
                      <td className="py-1.5 pr-3 text-emerald-300">
                        {trace.decoded}
                      </td>
                      <td className="max-w-xs truncate py-1.5 text-slate-500">
                        {trace.rawHex}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div className="rounded-lg border border-indigo-500/40 bg-indigo-950/40 px-4 py-3 text-xs text-indigo-200">
          {feedback}
        </div>
      )}

      {/* =================================================================== */}
      {/* Dedicated Panel: Chainlink CRE Workflow Execution Trace Viewer      */}
      {/* =================================================================== */}
      <div className="rounded-xl border border-cyan-500/30 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Layers className="h-4 w-4 text-cyan-400" />
              Chainlink CRE Workflow Execution Trace (Trigger → Off-chain API/LLM → EVM Read → Consensus Report Hash)
            </div>
            <p className="text-xs text-slate-400">
              매니페스트(<code>{creTrace?.manifestPath || "cre-workflow/workflow.yaml"}</code>) 기반 4단계 오케스트레이션 실행 로그 및 DON 합의(OCR3-BFT) 출력 페이로드
            </p>
          </div>

          {creTrace && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 font-mono text-[0.6875rem] text-cyan-200">
                Engine: {creTrace.runtimeEngine} ({creTrace.totalDurationMs} ms)
              </span>
              <button
                type="button"
                onClick={() => setShowAllStepsJson((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                {showAllStepsJson ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    선택 단계만 보기
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    4단계 JSON 전체 펼치기
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {!creTrace ? (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
            아직 이 점검 건에 대한 Chainlink CRE Workflow 실행 트레이스가 없습니다. 상단의{" "}
            <strong className="text-indigo-300">
              &ldquo;Chainlink CRE 워크플로 실행&rdquo;
            </strong>{" "}
            버튼을 클릭하거나 터미널에서 <code>npm run cre:simulate</code>를 실행하세요.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* 4-Stage Pipeline Step Selector Cards */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
                    className={`flex flex-col justify-between rounded-lg border p-3.5 text-left transition ${
                      isSelected
                        ? "border-cyan-400/60 bg-cyan-950/25 shadow-sm"
                        : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-bold text-cyan-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          STEP {step.stepNumber} · {step.status}
                        </span>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[0.65rem] text-slate-400">
                          {step.durationMs} ms
                        </span>
                      </div>
                      <div className="mt-1.5 text-xs font-bold text-white">
                        {step.title.replace(/^\[Step \d:\s*|\s*\]$/g, "")}
                      </div>
                      <div className="mt-1 truncate font-mono text-[0.65rem] text-indigo-300">
                        {step.capability}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[0.7rem] leading-relaxed text-slate-400">
                      {step.summary}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* DON Consensus & Report Hash Digest Bar */}
            <div className="rounded-lg border border-indigo-500/30 bg-slate-950/90 p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-indigo-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>
                    DON Consensus ({creTrace.consensus.donId} · {creTrace.consensus.protocol}) — Quorum{" "}
                    {creTrace.consensus.quorumReached}/{creTrace.consensus.nodeCount} Oracle Nodes Verified
                  </span>
                </div>
                <span className="font-mono text-[0.6875rem] text-slate-400">
                  Executed: {creTrace.executedAt.replace("T", " ").slice(0, 19)} UTC
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2 font-mono text-[0.6875rem] lg:grid-cols-2">
                <div className="truncate rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-slate-300">
                  <span className="text-slate-400">Consensus Digest: </span>
                  <span className="text-cyan-300">{creTrace.consensus.consensusDigest}</span>
                </div>
                <div className="truncate rounded border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-slate-300">
                  <span className="text-slate-400">Deterministic Report Hash: </span>
                  <span className="text-emerald-300">{creTrace.consensus.reportHash}</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Input / Output JSON Payload Inspector */}
            <div className="space-y-3">
              {creTrace.steps
                .filter(
                  (step) =>
                    showAllStepsJson || step.stepNumber === selectedStepNumber
                )
                .map((step) => (
                  <div
                    key={step.stepId}
                    className="rounded-lg border border-slate-800 bg-slate-950 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                      <div>
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {step.title}
                        </span>
                        <span className="ml-2 rounded bg-indigo-950/80 px-2 py-0.5 font-mono text-[0.6875rem] text-indigo-300">
                          {step.capability}
                        </span>
                      </div>
                      <span className="font-mono text-[0.6875rem] text-slate-400">
                        Duration: {step.durationMs} ms | Status: {step.status}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-300">{step.summary}</p>

                    <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div>
                        <div className="mb-1 font-mono text-[0.6875rem] font-semibold text-sky-300">
                          Input Payload (JSON)
                        </div>
                        <pre className="max-h-60 overflow-auto rounded border border-slate-800/90 bg-slate-900/90 p-3 font-mono text-[0.6875rem] leading-relaxed text-slate-200">
                          {JSON.stringify(step.inputPayload, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div className="mb-1 font-mono text-[0.6875rem] font-semibold text-emerald-300">
                          Output Payload & Consensus Result (JSON)
                        </div>
                        <pre className="max-h-60 overflow-auto rounded border border-slate-800/90 bg-slate-900/90 p-3 font-mono text-[0.6875rem] leading-relaxed text-slate-200">
                          {JSON.stringify(step.outputPayload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* Dedicated Panel: Counterfactual Breach Simulation Proof             */}
      {/* =================================================================== */}
      {breachSimulations.length > 0 && (
        <div className="rounded-xl border border-amber-500/40 bg-slate-900/95 p-5 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <Flame className="h-4 w-4 text-amber-400" />
                온체인 공시 위반 행위 재현 결과 (Adversarial Breach Simulation Proof)
              </div>
              <p className="text-xs text-slate-300">
                단순 <code>view</code> 변수 조회를 넘어, 복제된 EVM 샌드박스 상태(
                <code>evm.runCall</code>)에서 백서 공시 약속을 위반하는 4대 악의적 트랜잭션(무단 발행·기습 수수료 50% 인상·투자자 지갑 동결·팀 물량 조기 유출)을 직접 실행해 스마트계약 코드가 이를 실제로 차단(
                <code>DEFENDED / BLOCKED_BY_CODE</code>)하는지 혹은 위반이 성공(
                <code>BREACH_SUCCEEDED</code>)하는지 실증합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="rounded-md border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 font-bold text-emerald-300">
                DEFENDED:{" "}
                {
                  breachSimulations.filter((b) => b.outcome === "DEFENDED")
                    .length
                }
                건
              </span>
              <span className="rounded-md border border-rose-500/40 bg-rose-950/50 px-2.5 py-1 font-bold text-rose-300">
                BREACH_SUCCEEDED:{" "}
                {
                  breachSimulations.filter(
                    (b) => b.outcome === "BREACH_SUCCEEDED"
                  ).length
                }
                건
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {breachSimulations.map((sim) => {
              const isBreached = sim.outcome === "BREACH_SUCCEEDED";
              return (
                <div
                  key={sim.scenarioId}
                  className={`rounded-xl border p-4 ${
                    isBreached
                      ? "border-rose-500/50 bg-rose-950/20"
                      : "border-emerald-500/40 bg-emerald-950/15"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div>
                      <span className="font-mono text-[0.6875rem] font-semibold text-amber-300">
                        {sim.titleEn}
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {sim.titleKo}
                      </h4>
                    </div>
                    {isBreached ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/20 px-2.5 py-0.5 font-mono text-[0.6875rem] font-bold text-rose-300">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        BREACH_SUCCEEDED (위반 성공)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[0.6875rem] font-bold text-emerald-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        DEFENDED / BLOCKED_BY_CODE
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="rounded bg-slate-950/80 p-2.5">
                      <div className="text-[0.6875rem] font-semibold text-sky-300">
                        백서 공시 약속 (Disclosed Promise)
                      </div>
                      <div className="mt-0.5 text-slate-200">
                        {sim.whitepaperPromiseKo}
                      </div>
                    </div>

                    <div className="rounded bg-slate-950/80 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[0.6875rem] font-semibold text-indigo-300">
                        <span>시도한 공격/배신 트랜잭션 (Attempted Action)</span>
                        <span className="font-mono text-slate-400">
                          Gas: {sim.gasUsed} | Reverted:{" "}
                          {sim.txReverted ? "true" : "false"}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-[0.7rem] text-white">
                        [{sim.targetFunction}] {sim.adversarialActionKo}
                      </div>
                      <div className="mt-1 truncate font-mono text-[0.65rem] text-slate-400">
                        Calldata: {sim.calldata}
                      </div>
                      {sim.revertReason && (
                        <div className="mt-1 font-mono text-[0.6875rem] text-amber-300">
                          Revert / Custom Error: {sim.revertReason}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded border border-slate-800 bg-slate-950/90 p-2.5">
                        <div className="text-[0.65rem] font-semibold uppercase text-slate-400">
                          실행 전 온체인 상태 (Before State)
                        </div>
                        <div className="mt-1 font-mono text-[0.7rem] text-slate-200">
                          {sim.beforeState}
                        </div>
                      </div>
                      <div
                        className={`rounded border p-2.5 ${
                          isBreached
                            ? "border-rose-500/40 bg-rose-950/40"
                            : "border-emerald-500/30 bg-emerald-950/30"
                        }`}
                      >
                        <div className="text-[0.65rem] font-semibold uppercase text-slate-300">
                          실행 후 온체인 상태 (After State)
                        </div>
                        <div
                          className={`mt-1 font-mono text-[0.7rem] font-semibold ${
                            isBreached ? "text-rose-200" : "text-emerald-200"
                          }`}
                        >
                          {sim.afterState}
                        </div>
                      </div>
                    </div>

                    <p className="pt-1 text-[0.72rem] leading-relaxed text-slate-300">
                      <strong className="text-white">증빙 결론:</strong>{" "}
                      {sim.stateDeltaSummary} ({sim.legalImpactKo})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 1:1 Comparison Cards for the 5 Core Items */}
      <div className="space-y-4">
        {items.map((item) => {
          const legalMapping = LEGAL_STATUTE_MAP[item.itemKey];
          return (
            <div
              key={item.itemKey}
              className={`rounded-xl border p-5 ${
                item.status === "MISMATCH"
                  ? "border-rose-500/40 bg-rose-950/15"
                  : item.status === "NEEDS_HUMAN_REVIEW"
                  ? "border-amber-500/40 bg-amber-950/15"
                  : item.status === "MATCH"
                  ? "border-emerald-500/30 bg-slate-900/80"
                  : "border-slate-800 bg-slate-900/80"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <span className="font-mono text-xs font-semibold text-blue-400">
                    [{item.itemKey}]
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {item.titleKo}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                    Severity: {item.severity}
                  </span>
                  <ComparisonStatusBadge status={item.status} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Left: Disclosed Claim from Whitepaper */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-sky-300">
                    <span>공시 백서 주장 (Disclosed Claim)</span>
                    <span className="font-mono text-slate-400">
                      {item.sectionRef || "조항 미기재"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">
                    {item.disclosedClaim || "추출된 공시 주장이 없습니다."}
                  </p>
                  {item.sourceQuote && (
                    <blockquote className="mt-2 border-l-2 border-sky-500/50 pl-3 text-xs italic text-slate-400">
                      &ldquo;{item.sourceQuote}&rdquo;
                    </blockquote>
                  )}
                </div>

                {/* Right: On-chain State from Smart Contract */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                    <span>온체인 실제 상태 (On-Chain Fact)</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-slate-400">
                      <Terminal className="h-3 w-3" />
                      {item.evidenceFunctionOrSlot}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-slate-100">
                    {item.onchainState ||
                      "아직 온체인 상태 스냅샷이 수집되지 않았습니다."}
                  </p>
                  <div className="mt-3 border-t border-slate-800/80 pt-2 text-xs text-slate-300">
                    <strong className="text-slate-100">
                      대조 판정 근거(Rationale):
                    </strong>{" "}
                    {item.rationale ||
                      "CRE 대조 실행 후 판정 근거가 생성됩니다."}
                  </div>
                </div>
              </div>

              {/* 3-Jurisdiction (KR / EU / US) Legal & Regulatory Statute Mapping */}
              {legalMapping && (
                <div className="mt-4 rounded-lg border border-slate-800/90 bg-slate-950/90 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Scale className="h-3.5 w-3.5 text-amber-400" />
                    <span>
                      글로벌 3대 규제 관할권(한국·EU·미국) 관련 법조문 및 상장심사 기준 매핑
                    </span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                    {Object.values(legalMapping.statutes).map((cit) => (
                      <div
                        key={cit.jurisdiction}
                        className="rounded border border-slate-800 bg-slate-900/70 p-2.5 text-[0.7rem]"
                      >
                        <div className="flex items-center justify-between gap-1 font-semibold text-indigo-200">
                          <span>
                            {cit.flag} [{cit.jurisdictionLabelKo}]
                          </span>
                        </div>
                        <div className="mt-1 font-semibold text-white">
                          {cit.statuteTitle} —{" "}
                          <span className="text-amber-300">
                            {cit.articleRef}
                          </span>
                        </div>
                        <p className="mt-1 leading-relaxed text-slate-400">
                          {cit.relevanceSummaryKo}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Step Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4">
        <Link
          href={`/audits/${audit.id}/extract`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          이전 단계: 백서 5대 항목 추출 (/extract)
        </Link>

        <Link
          href={`/audits/${audit.id}/review`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          다음 단계: 법무 검토 메모 작성 및 해시 앵커링 (/review)
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
