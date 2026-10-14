import Link from "next/link";
import {
  FilePlus2,
  FileSearch,
  Cpu,
  FileCheck2,
  Hash,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { listAuditCases } from "@/lib/audit-service";
import { ComparisonStatusBadge, StageBadge } from "@/components/StatusBadge";
import { getEtherscanAddressUrl, getEtherscanTxUrl } from "@/lib/etherscan";

export const dynamic = "force-dynamic";

export default async function AuditsListPage() {
  const audits = await listAuditCases();

  const totalCases = audits.length;
  const mismatchCases = audits.filter(
    (a) => a.overallStatus === "MISMATCH"
  ).length;
  const anchoredCases = audits.filter((a) => a.stage === "ANCHORED").length;

  return (
    <div className="space-y-8">
      {/* Page Title & Action Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Audit Case Repository · SQLite Persistent Storage
          </div>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            저장된 공시·스마트계약 불일치 점검 목록
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            등록된 가상자산 백서 원문(SHA-256)과 온체인 스마트계약의 5대 핵심 항목 대조 현황을 조회하고, 단계별 전용 페이지(추출 → CRE 대조 → 법무 검토·앵커링)로 이어서 작업할 수 있습니다.
          </p>
        </div>

        <Link
          href="/audits/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500"
        >
          <FilePlus2 className="h-4 w-4" />
          새 점검 건 생성 (/audits/new)
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="text-xs font-medium text-slate-400">
            총 등록 점검 건수 (SQLite DB)
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-white">{totalCases}건</span>
            <span className="text-xs text-slate-400">5대 필수 항목 기준</span>
          </div>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5">
          <div className="text-xs font-medium text-rose-300">
            불일치 검출 건수 (MISMATCH)
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-rose-300">
              {mismatchCases}건
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              법무 소명 요청 대상
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5">
          <div className="text-xs font-medium text-emerald-300">
            AuditRegistry 온체인 해시 앵커링 완료
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-emerald-300">
              {anchoredCases}건
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              무결성 증빙 완료
            </span>
          </div>
        </div>
      </div>

      {/* Audit Cases List */}
      <div className="space-y-4">
        {audits.map((audit) => {
          const tokenExplorerUrl = getEtherscanAddressUrl(
            audit.chainId,
            audit.tokenAddress
          );
          const txExplorerUrl = getEtherscanTxUrl(
            audit.chainId,
            audit.anchorTxHash
          );

          return (
            <article
              key={audit.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 transition hover:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-blue-300">
                      {audit.tokenSymbol || "TOKEN"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {audit.projectName}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="font-mono text-xs text-slate-400">
                      ID: {audit.id}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white sm:text-xl">
                    {audit.title}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StageBadge stage={audit.stage} />
                  <ComparisonStatusBadge status={audit.overallStatus} />
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-800/90 bg-slate-950/60 p-4 text-xs sm:grid-cols-3">
                <div>
                  <div className="text-slate-400">스마트계약 주소 / 체인</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-slate-200">
                    <Layers className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                    <span className="truncate">{audit.tokenAddress}</span>
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
                  <div className="mt-0.5 text-[0.6875rem] text-slate-400">
                    {audit.chainName} (Chain ID: {audit.chainId})
                    {audit.snapshotBlockNumber
                      ? ` · Block #${audit.snapshotBlockNumber}`
                      : ""}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400">공시 백서 원문 &amp; SHA-256 해시</div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-slate-200">
                    <Hash className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                    <span className="truncate">{audit.documentHash}</span>
                  </div>
                  <div className="mt-0.5 text-[0.6875rem] text-slate-400">
                    파일명: {audit.whitepaperFileName}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400">5대 핵심 항목 판정 요약</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-medium">
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                      일치(MATCH): {audit.matchCount}
                    </span>
                    <span className="rounded bg-rose-500/15 px-2 py-0.5 text-rose-300">
                      불일치(MISMATCH): {audit.mismatchCount}
                    </span>
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-amber-300">
                      법무검토(REVIEW): {audit.needsReviewCount}
                    </span>
                  </div>
                  {audit.anchorTxHash && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[0.6875rem] text-emerald-400">
                      <span>Anchor Tx: {audit.anchorTxHash.slice(0, 18)}…</span>
                      {txExplorerUrl && (
                        <a
                          href={txExplorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-emerald-300 hover:bg-emerald-500/25"
                        >
                          Sepolia Tx
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

            {audit.overallSummary && (
              <p className="mt-3 text-xs text-slate-300">
                <strong className="text-slate-100">검토 요약:</strong>{" "}
                {audit.overallSummary}
              </p>
            )}

            {/* Direct Step Route Navigation Buttons */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                최종 업데이트:{" "}
                {new Date(audit.updatedAt).toLocaleString("ko-KR")}
                {audit.reviewerName ? ` · 담당자: ${audit.reviewerName}` : ""}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/audits/${audit.id}/extract`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-blue-500/50 hover:bg-slate-800 hover:text-white"
                >
                  <FileSearch className="h-3.5 w-3.5 text-sky-400" />
                  1. 추출 확인/수정 (/extract)
                </Link>
                <Link
                  href={`/audits/${audit.id}/compare`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-blue-500/50 hover:bg-slate-800 hover:text-white"
                >
                  <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                  2. CRE 온체인 대조 (/compare)
                </Link>
                <Link
                  href={`/audits/${audit.id}/review`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-600/30"
                >
                  <FileCheck2 className="h-3.5 w-3.5 text-blue-400" />
                  3. 법무 검토·앵커링 (/review)
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}
