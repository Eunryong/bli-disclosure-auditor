"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  ExternalLink,
  FileSearch,
  FileCheck2,
  Hash,
  Layers,
} from "lucide-react";
import type { AuditCaseDTO } from "@/types/audit";
import { ComparisonStatusBadge, StageBadge } from "@/components/StatusBadge";
import { getEtherscanAddressUrl, getEtherscanTxUrl } from "@/lib/etherscan";

export function AuditStepHeader({ audit }: { audit: AuditCaseDTO }) {
  const pathname = usePathname();
  const tokenExplorerUrl = getEtherscanAddressUrl(
    audit.chainId,
    audit.tokenAddress
  );
  const txExplorerUrl = getEtherscanTxUrl(audit.chainId, audit.anchorTxHash);

  const steps = [
    {
      stepNumber: 1,
      key: "extract",
      label: "Step 1 · 백서 원문 & 5대 항목 추출",
      subLabel: "/audits/[id]/extract",
      href: `/audits/${audit.id}/extract`,
      icon: FileSearch,
      active: pathname.endsWith("/extract"),
      completed: ["EXTRACTED", "COMPARED", "REVIEWED", "ANCHORED"].includes(
        audit.stage
      ),
    },
    {
      stepNumber: 2,
      key: "compare",
      label: "Step 2 · Chainlink CRE 온체인 1:1 대조",
      subLabel: "/audits/[id]/compare",
      href: `/audits/${audit.id}/compare`,
      icon: Cpu,
      active: pathname.endsWith("/compare"),
      completed: ["COMPARED", "REVIEWED", "ANCHORED"].includes(audit.stage),
    },
    {
      stepNumber: 3,
      key: "review",
      label: "Step 3 · 법무 검토 메모 & 해시 앵커링",
      subLabel: "/audits/[id]/review",
      href: `/audits/${audit.id}/review`,
      icon: FileCheck2,
      active: pathname.endsWith("/review"),
      completed: ["REVIEWED", "ANCHORED"].includes(audit.stage),
    },
  ];

  return (
    <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/75 p-5 shadow-lg">
      {/* Top Row: Back link + Case Metadata + Status Badges */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <Link
              href="/audits"
              className="inline-flex items-center gap-1 font-medium text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              전체 점검 목록으로
            </Link>
            <span>·</span>
            <span>Case ID: {audit.id}</span>
            <span>·</span>
            <span>{audit.projectName}</span>
          </div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            {audit.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-1 text-xs text-slate-300">
            <span className="inline-flex flex-wrap items-center gap-1.5 font-mono">
              <Layers className="h-3.5 w-3.5 text-slate-400" />
              Contract: <strong className="text-slate-100">{audit.tokenAddress}</strong> ({audit.chainName}, Chain ID: {audit.chainId})
              {tokenExplorerUrl && (
                <a
                  href={tokenExplorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/15 px-1.5 py-0.5 font-sans text-[0.65rem] font-semibold text-blue-300 hover:bg-blue-500/25"
                >
                  Sepolia Etherscan
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono">
              <Hash className="h-3.5 w-3.5 text-slate-400" />
              Doc SHA-256:{" "}
              <strong className="text-slate-100">
                {audit.documentHash.slice(0, 18)}…{audit.documentHash.slice(-8)}
              </strong>
            </span>
            {audit.anchorTxHash && (
              <span className="inline-flex items-center gap-1.5 font-mono text-emerald-300">
                Anchor Tx: {audit.anchorTxHash.slice(0, 14)}…
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
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={audit.stage} />
          <ComparisonStatusBadge status={audit.overallStatus} />
        </div>
      </div>

      {/* Multi-Page Step Navigation Bar */}
      <nav aria-label="점검 단계 진행 내비게이션" className="mt-4">
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.key}
                aria-current={step.active ? "step" : undefined}
              >
                <Link
                  href={step.href}
                  className={`flex items-center justify-between rounded-lg border p-3.5 transition ${
                    step.active
                      ? "border-blue-500 bg-blue-600/20 text-white shadow-sm"
                      : step.completed
                      ? "border-slate-700/80 bg-slate-900/90 text-slate-200 hover:border-slate-600 hover:bg-slate-800/80"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                        step.active
                          ? "border-blue-400 bg-blue-500 text-white"
                          : step.completed
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "border-slate-700 bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{step.label}</div>
                      <div className="font-mono text-[0.6875rem] text-slate-400">
                        {step.subLabel.replace("[id]", audit.id)}
                      </div>
                    </div>
                  </div>
                  {step.completed && !step.active && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
