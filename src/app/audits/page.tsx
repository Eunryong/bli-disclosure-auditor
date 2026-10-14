import Link from "next/link";
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
  const totalCheckItems = audits.reduce(
    (acc, a) => acc + (a.matchCount + a.mismatchCount + a.needsReviewCount || 5),
    0
  );

  return (
    <div className="space-y-6">
      {/* Editorial Ledger Masthead */}
      <div className="border border-[#111315] bg-white">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#111315] px-6 py-5">
          <div>
            <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-widest text-[#5A6065]">
              MASTER EXAMINATION LEDGER // SQLITE ARCHIVE (PRISMA/DEV.DB)
            </div>
            <h1 className="mt-1 font-editorial text-2xl font-bold text-[#111315] sm:text-3xl">
              저장된 공시·스마트계약 불일치 점검 목록
            </h1>
            <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-[#5A6065]">
              접수된 가상자산 공시 백서 원문(SHA-256)과 온체인 스마트계약의 5대 핵심 조항 정합성 심사 원장입니다. 각 사건 번호(Docket ID)별로 발췌 데스크(<code>/extract</code>), CRE 포렌식 터미널(<code>/compare</code>), 법률 의견서 발행소(<code>/review</code>)로 즉시 이동할 수 있습니다.
            </p>
          </div>

          <Link
            href="/audits/new"
            className="inline-flex items-center gap-2 rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1E293B]"
          >
            <span className="font-mono text-[#D8D4CC]">[+ DOCKET]</span>
            새 점검 건 생성 (/audits/new)
          </Link>
        </div>

        {/* Border-Divided Summary KPI Strip */}
        <div className="grid grid-cols-1 divide-y divide-[#D8D4CC] bg-[#EFECE6] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-4">
            <div className="font-mono text-[0.6875rem] uppercase tracking-wider text-[#5A6065]">
              01 // TOTAL REGISTERED DOCKETS
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-editorial text-3xl font-bold text-[#111315]">
                {totalCases}
              </span>
              <span className="font-mono text-[0.6875rem] text-[#5A6065]">
                누적 접수 사건
              </span>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="font-mono text-[0.6875rem] uppercase tracking-wider text-[#991B1B]">
              02 // MATERIAL MISMATCH DETECTED
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-editorial text-3xl font-bold text-[#991B1B]">
                {mismatchCases}
              </span>
              <span className="rounded-[2px] border border-[#991B1B]/35 bg-[#FDECEC] px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-[#991B1B]">
                시정·소명 요구 대상
              </span>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="font-mono text-[0.6875rem] uppercase tracking-wider text-[#166534]">
              03 // ON-CHAIN NOTARIZED (ANCHORED)
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-editorial text-3xl font-bold text-[#166534]">
                {anchoredCases}
              </span>
              <span className="rounded-[2px] border border-[#166534]/35 bg-[#EAF3EC] px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-[#166534]">
                AuditRegistry 검증됨
              </span>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="font-mono text-[0.6875rem] uppercase tracking-wider text-[#5A6065]">
              04 // EXAMINED CLAUSE VECTORS
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-editorial text-3xl font-bold text-[#111315]">
                {totalCheckItems}
              </span>
              <span className="font-mono text-[0.6875rem] text-[#5A6065]">
                5대 필수 공시 조항 기준
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEC EDGAR / Listing Examination Data Ledger Grid */}
      <div className="border border-[#111315] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111315] bg-[#EFECE6] px-5 py-2.5">
          <div className="font-mono text-xs font-semibold text-[#111315]">
            SCHEDULE I — REGISTERED DISCLOSURE VS. SMART CONTRACT EXAMINATION LEDGER
          </div>
          <div className="font-mono text-[0.6875rem] text-[#5A6065]">
            SORT: UPDATED_AT DESC · RECORDS: {audits.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#111315] bg-[#F7F6F2] font-mono text-[0.6875rem] uppercase tracking-wider text-[#5A6065]">
                <th className="border-r border-[#D8D4CC] px-4 py-3">
                  Docket ID / Symbol
                </th>
                <th className="border-r border-[#D8D4CC] px-4 py-3">
                  Filing Entity &amp; Examination Title
                </th>
                <th className="border-r border-[#D8D4CC] px-4 py-3">
                  On-Chain Contract &amp; Whitepaper Digest
                </th>
                <th className="border-r border-[#D8D4CC] px-4 py-3">
                  5-Clause Verdict Matrix
                </th>
                <th className="border-r border-[#D8D4CC] px-4 py-3">
                  Stage &amp; Notary Anchor
                </th>
                <th className="px-4 py-3">Workflow Desks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D4CC]">
              {audits.map((audit, index) => {
                const tokenExplorerUrl = getEtherscanAddressUrl(
                  audit.chainId,
                  audit.tokenAddress
                );
                const txExplorerUrl = getEtherscanTxUrl(
                  audit.chainId,
                  audit.anchorTxHash
                );

                return (
                  <tr
                    key={audit.id}
                    className="align-top transition hover:bg-[#F7F6F2]/70"
                  >
                    {/* Col 1: Docket ID & Symbol */}
                    <td className="border-r border-[#D8D4CC] px-4 py-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.6875rem] text-[#5A6065]">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="border border-[#111315] bg-[#0F172A] px-1.5 py-0.5 text-[0.6875rem] font-bold text-white">
                          {audit.tokenSymbol || "TOKEN"}
                        </span>
                      </div>
                      <div className="mt-1.5 text-[0.72rem] font-semibold text-[#111315]">
                        {audit.id}
                      </div>
                      <div className="mt-1 text-[0.65rem] text-[#5A6065]">
                        {new Date(audit.updatedAt).toLocaleDateString("ko-KR")}{" "}
                        {new Date(audit.updatedAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Col 2: Filing Entity & Examination Title */}
                    <td className="max-w-md border-r border-[#D8D4CC] px-4 py-4">
                      <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-wide text-[#5A6065]">
                        {audit.projectName}
                      </div>
                      <div className="mt-0.5 font-editorial text-base font-bold leading-snug text-[#111315]">
                        {audit.title}
                      </div>
                      {audit.overallSummary && (
                        <p className="mt-1.5 line-clamp-2 text-[0.72rem] leading-relaxed text-[#5A6065]">
                          {audit.overallSummary}
                        </p>
                      )}
                      {audit.reviewerName && (
                        <div className="mt-1.5 font-mono text-[0.65rem] text-[#5A6065]">
                          COUNSEL: {audit.reviewerName}
                        </div>
                      )}
                    </td>

                    {/* Col 3: On-Chain Target & Whitepaper SHA-256 */}
                    <td className="border-r border-[#D8D4CC] px-4 py-4 font-mono text-[0.6875rem]">
                      <div className="space-y-2">
                        <div>
                          <div className="text-[0.625rem] uppercase text-[#5A6065]">
                            TARGET CONTRACT ({audit.chainName} · #{audit.chainId}
                            {audit.snapshotBlockNumber
                              ? ` · BLK #${audit.snapshotBlockNumber}`
                              : ""}
                            )
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[#111315]">
                            <span>
                              {audit.tokenAddress.slice(0, 12)}…
                              {audit.tokenAddress.slice(-8)}
                            </span>
                            {tokenExplorerUrl && (
                              <a
                                href={tokenExplorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border border-[#0F172A] bg-[#EFECE6] px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
                              >
                                Etherscan ↗
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-[#D8D4CC] pt-1.5">
                          <div className="text-[0.625rem] uppercase text-[#5A6065]">
                            DISCLOSURE DOC ({audit.whitepaperFileName})
                          </div>
                          <div className="mt-0.5 text-[#5A6065]">
                            SHA-256: {audit.documentHash.slice(0, 16)}…
                            {audit.documentHash.slice(-6)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Col 4: 5-Clause Verdict Matrix */}
                    <td className="border-r border-[#D8D4CC] px-4 py-4">
                      <div>
                        <ComparisonStatusBadge status={audit.overallStatus} />
                      </div>
                      <div className="mt-2 grid grid-cols-3 divide-x divide-[#D8D4CC] border border-[#D8D4CC] bg-[#F7F6F2] text-center font-mono text-[0.65rem]">
                        <div className="px-1.5 py-1">
                          <div className="text-[#5A6065]">MATCH</div>
                          <div className="font-bold text-[#166534]">
                            {audit.matchCount}
                          </div>
                        </div>
                        <div className="px-1.5 py-1">
                          <div className="text-[#5A6065]">BREACH</div>
                          <div className="font-bold text-[#991B1B]">
                            {audit.mismatchCount}
                          </div>
                        </div>
                        <div className="px-1.5 py-1">
                          <div className="text-[#5A6065]">REVIEW</div>
                          <div className="font-bold text-[#92400E]">
                            {audit.needsReviewCount}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Col 5: Stage & Notary Anchor */}
                    <td className="border-r border-[#D8D4CC] px-4 py-4">
                      <div>
                        <StageBadge stage={audit.stage} />
                      </div>
                      {audit.anchorTxHash ? (
                        <div className="mt-2 font-mono text-[0.65rem]">
                          <div className="text-[#166534]">
                            TX: {audit.anchorTxHash.slice(0, 14)}…
                          </div>
                          {txExplorerUrl && (
                            <a
                              href={txExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-block border border-[#166534]/40 bg-[#EAF3EC] px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold text-[#166534] hover:bg-[#166534] hover:text-white"
                            >
                              Sepolia Tx ↗
                            </a>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 font-mono text-[0.65rem] text-[#5A6065]">
                          NOTARY: 미공증
                        </div>
                      )}
                    </td>

                    {/* Col 6: Dedicated Multi-Page Desk Links */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1.5">
                        <Link
                          href={`/audits/${audit.id}/extract`}
                          className="flex items-center justify-between border border-[#D8D4CC] bg-white px-2.5 py-1.5 text-[0.7rem] font-semibold text-[#111315] transition hover:border-[#111315] hover:bg-[#EFECE6]"
                        >
                          <span>1. 조항 발췌</span>
                          <span className="font-mono text-[0.65rem] text-[#5A6065]">
                            /extract →
                          </span>
                        </Link>
                        <Link
                          href={`/audits/${audit.id}/compare`}
                          className="flex items-center justify-between border border-[#D8D4CC] bg-white px-2.5 py-1.5 text-[0.7rem] font-semibold text-[#111315] transition hover:border-[#111315] hover:bg-[#EFECE6]"
                        >
                          <span>2. CRE 포렌식 대조</span>
                          <span className="font-mono text-[0.65rem] text-[#5A6065]">
                            /compare →
                          </span>
                        </Link>
                        <Link
                          href={`/audits/${audit.id}/review`}
                          className="flex items-center justify-between border border-[#0F172A] bg-[#0F172A] px-2.5 py-1.5 text-[0.7rem] font-semibold text-white transition hover:bg-[#1E293B]"
                        >
                          <span>3. 법률 의견서·공증</span>
                          <span className="font-mono text-[0.65rem] text-[#D8D4CC]">
                            /review →
                          </span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
