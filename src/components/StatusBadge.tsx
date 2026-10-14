"use client";

import type { AuditComparisonStatus, AuditStage } from "@/types/audit";
import { useLanguage } from "@/lib/i18n";

export function ComparisonStatusBadge({
  status,
}: {
  status: AuditComparisonStatus;
}) {
  const { t } = useLanguage();

  switch (status) {
    case "MATCH":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#166534]/40 bg-[#EAF3EC] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#166534]">
          <span className="h-1.5 w-1.5 bg-[#166534]" />
          {t("MATCH · VERIFIED", "MATCH · 일치")}
        </span>
      );
    case "MISMATCH":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#991B1B]/40 bg-[#FDECEC] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#991B1B]">
          <span className="h-1.5 w-1.5 bg-[#991B1B]" />
          {t("MISMATCH · BREACH", "MISMATCH · 불일치")}
        </span>
      );
    case "NEEDS_HUMAN_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#92400E]/40 bg-[#FEF3C7] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#92400E]">
          <span className="h-1.5 w-1.5 bg-[#92400E]" />
          {t("NEEDS_HUMAN_REVIEW · COUNSEL", "NEEDS_HUMAN_REVIEW · 법무검토")}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#D8D4CC] bg-[#EFECE6] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#5A6065]">
          <span className="h-1.5 w-1.5 bg-[#5A6065]" />
          {t("PENDING · QUEUED", "PENDING · 대기")}
        </span>
      );
  }
}

export function StageBadge({ stage }: { stage: AuditStage }) {
  const { t } = useLanguage();

  const map: Record<
    AuditStage,
    { code: string; labelEn: string; labelKo: string; className: string }
  > = {
    CREATED: {
      code: "STG-01",
      labelEn: "Docket Registered",
      labelKo: "접수 완료",
      className: "border-[#D8D4CC] bg-[#EFECE6] text-[#5A6065]",
    },
    EXTRACTED: {
      code: "STG-02",
      labelEn: "Clauses Extracted",
      labelKo: "조항 발췌됨",
      className: "border-[#D8D4CC] bg-white text-[#111315]",
    },
    COMPARED: {
      code: "STG-03",
      labelEn: "CRE Compared",
      labelKo: "CRE 대조 완료",
      className: "border-[#0F172A]/40 bg-[#EFECE6] text-[#0F172A]",
    },
    REVIEWED: {
      code: "STG-04",
      labelEn: "Counsel Reviewed",
      labelKo: "법무 심사 완료",
      className: "border-[#0F172A] bg-white text-[#0F172A]",
    },
    ANCHORED: {
      code: "NOTARIZED",
      labelEn: "Anchored On-Chain",
      labelKo: "온체인 공증 완료",
      className: "border-[#166534]/50 bg-[#EAF3EC] text-[#166534]",
    },
  };

  const item = map[stage] ?? map.CREATED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight ${item.className}`}
    >
      <span>[{item.code}]</span>
      <span className="font-sans">{t(item.labelEn, item.labelKo)}</span>
    </span>
  );
}
