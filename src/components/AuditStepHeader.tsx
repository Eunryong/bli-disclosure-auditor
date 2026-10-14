"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuditCaseDTO } from "@/types/audit";
import { ComparisonStatusBadge, StageBadge } from "@/components/StatusBadge";
import { getEtherscanAddressUrl, getEtherscanTxUrl } from "@/lib/etherscan";
import { useLanguage } from "@/lib/i18n";

export function AuditStepHeader({ audit }: { audit: AuditCaseDTO }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const tokenExplorerUrl = getEtherscanAddressUrl(
    audit.chainId,
    audit.tokenAddress
  );
  const txExplorerUrl = getEtherscanTxUrl(audit.chainId, audit.anchorTxHash);

  const steps = [
    {
      stepNumber: "01",
      key: "extract",
      label: t(
        "Disclosure Clause Extraction Desk",
        "공시 조항 발췌 데스크"
      ),
      subLabel: `/audits/${audit.id}/extract`,
      href: `/audits/${audit.id}/extract`,
      active: pathname.endsWith("/extract"),
      completed: ["EXTRACTED", "COMPARED", "REVIEWED", "ANCHORED"].includes(
        audit.stage
      ),
    },
    {
      stepNumber: "02",
      key: "compare",
      label: t(
        "Chainlink CRE Forensic Terminal",
        "Chainlink CRE 포렌식 대조 터미널"
      ),
      subLabel: `/audits/${audit.id}/compare`,
      href: `/audits/${audit.id}/compare`,
      active: pathname.endsWith("/compare"),
      completed: ["COMPARED", "REVIEWED", "ANCHORED"].includes(audit.stage),
    },
    {
      stepNumber: "03",
      key: "review",
      label: t(
        "Legal Opinion, Cure Notice & Notary",
        "법률 의견서·시정명세 및 온체인 공증"
      ),
      subLabel: `/audits/${audit.id}/review`,
      href: `/audits/${audit.id}/review`,
      active: pathname.endsWith("/review"),
      completed: ["REVIEWED", "ANCHORED"].includes(audit.stage),
    },
  ];

  return (
    <div className="mb-8 border border-[#111315] bg-white">
      {/* Top Docket Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D4CC] bg-[#EFECE6] px-5 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3 font-mono text-[0.72rem] text-[#5A6065]">
          <Link
            href="/audits"
            className="font-sans font-semibold text-[#0F172A] underline-offset-4 hover:underline"
          >
            {t("← Back to Master Ledger (/audits)", "← 전체 점검 원장으로 (/audits)")}
          </Link>
          <span className="text-[#D8D4CC]">|</span>
          <span>
            DOCKET ID: <strong className="text-[#111315]">{audit.id}</strong>
          </span>
          <span className="text-[#D8D4CC]">|</span>
          <span>
            ISSUER: <strong className="text-[#111315]">{audit.projectName}</strong> ({audit.tokenSymbol})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={audit.stage} />
          <ComparisonStatusBadge status={audit.overallStatus} />
        </div>
      </div>

      {/* Main Case Title & Cryptographic Coordinates */}
      <div className="border-b border-[#D8D4CC] px-5 py-4">
        <h1 className="font-editorial text-2xl font-bold text-[#111315] sm:text-[1.75rem]">
          {audit.title}
        </h1>

        <div className="mt-3 grid grid-cols-1 gap-3 border-t border-[#D8D4CC] pt-3 font-mono text-[0.72rem] text-[#5A6065] md:grid-cols-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#5A6065]">CONTRACT:</span>
            <strong className="text-[#111315]">{audit.tokenAddress}</strong>
            <span className="text-[0.65rem]">
              ({audit.chainName} · #{audit.chainId})
            </span>
            {tokenExplorerUrl && (
              <a
                href={tokenExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[#0F172A] bg-[#EFECE6] px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-[#0F172A] hover:bg-[#0F172A] hover:text-white"
              >
                Sepolia Etherscan ↗
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#5A6065]">WHITEPAPER SHA-256:</span>
            <strong className="text-[#111315]">
              {audit.documentHash.slice(0, 22)}…{audit.documentHash.slice(-8)}
            </strong>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#5A6065]">NOTARY ANCHOR TX:</span>
            {audit.anchorTxHash ? (
              <>
                <strong className="text-[#166534]">
                  {audit.anchorTxHash.slice(0, 18)}…
                </strong>
                {txExplorerUrl && (
                  <a
                    href={txExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-[#166534]/50 bg-[#EAF3EC] px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-[#166534] hover:bg-[#166534] hover:text-white"
                  >
                    Sepolia Tx ↗
                  </a>
                )}
              </>
            ) : (
              <span className="text-[#92400E]">
                {t("UNANCHORED (Pending Notarization)", "UNANCHORED (공증 대기)")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3-Desk Ledger Tab Navigation */}
      <nav aria-label={t("Audit Desk Navigation", "점검 단계 진행 내비게이션")}>
        <ol className="grid grid-cols-1 divide-y divide-[#D8D4CC] md:grid-cols-3 md:divide-x md:divide-y-0">
          {steps.map((step) => (
            <li
              key={step.key}
              aria-current={step.active ? "step" : undefined}
            >
              <Link
                href={step.href}
                className={`flex items-center justify-between px-5 py-3.5 transition ${
                  step.active
                    ? "bg-[#0F172A] text-white"
                    : step.completed
                    ? "bg-white text-[#111315] hover:bg-[#EFECE6]"
                    : "bg-[#F7F6F2] text-[#5A6065] hover:bg-[#EFECE6] hover:text-[#111315]"
                }`}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className={`font-mono text-xs font-bold ${
                      step.active
                        ? "text-[#D8D4CC]"
                        : step.completed
                        ? "text-[#166534]"
                        : "text-[#5A6065]"
                    }`}
                  >
                    DESK {step.stepNumber}
                  </span>
                  <div>
                    <div className="text-xs font-semibold tracking-tight">
                      {step.label}
                    </div>
                    <div
                      className={`mt-0.5 font-mono text-[0.65rem] ${
                        step.active ? "text-[#D8D4CC]" : "text-[#5A6065]"
                      }`}
                    >
                      {step.subLabel}
                    </div>
                  </div>
                </div>

                <span
                  className={`font-mono text-[0.65rem] font-semibold ${
                    step.active
                      ? "border border-white/40 px-1.5 py-0.5 text-white"
                      : step.completed
                      ? "text-[#166534]"
                      : "text-[#5A6065]"
                  }`}
                >
                  {step.active ? "ACTIVE" : step.completed ? "DONE ✓" : "PENDING"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
