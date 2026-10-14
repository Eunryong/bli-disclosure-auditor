import type { AuditComparisonStatus, AuditStage } from "@/types/audit";

export function ComparisonStatusBadge({
  status,
}: {
  status: AuditComparisonStatus;
}) {
  switch (status) {
    case "MATCH":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#166534]/40 bg-[#EAF3EC] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#166534]">
          <span className="h-1.5 w-1.5 bg-[#166534]" />
          MATCH · 일치
        </span>
      );
    case "MISMATCH":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#991B1B]/40 bg-[#FDECEC] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#991B1B]">
          <span className="h-1.5 w-1.5 bg-[#991B1B]" />
          MISMATCH · 불일치
        </span>
      );
    case "NEEDS_HUMAN_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#92400E]/40 bg-[#FEF3C7] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#92400E]">
          <span className="h-1.5 w-1.5 bg-[#92400E]" />
          NEEDS_HUMAN_REVIEW · 법무검토
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-[#D8D4CC] bg-[#EFECE6] px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight text-[#5A6065]">
          <span className="h-1.5 w-1.5 bg-[#5A6065]" />
          PENDING · 대기
        </span>
      );
  }
}

export function StageBadge({ stage }: { stage: AuditStage }) {
  const map: Record<AuditStage, { code: string; label: string; className: string }> = {
    CREATED: {
      code: "STG-01",
      label: "접수 완료",
      className: "border-[#D8D4CC] bg-[#EFECE6] text-[#5A6065]",
    },
    EXTRACTED: {
      code: "STG-02",
      label: "조항 발췌됨",
      className: "border-[#D8D4CC] bg-white text-[#111315]",
    },
    COMPARED: {
      code: "STG-03",
      label: "CRE 대조 완료",
      className: "border-[#0F172A]/40 bg-[#EFECE6] text-[#0F172A]",
    },
    REVIEWED: {
      code: "STG-04",
      label: "법무 심사 완료",
      className: "border-[#0F172A] bg-white text-[#0F172A]",
    },
    ANCHORED: {
      code: "NOTARIZED",
      label: "온체인 공증 완료",
      className: "border-[#166534]/50 bg-[#EAF3EC] text-[#166534]",
    },
  };

  const item = map[stage] ?? map.CREATED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-tight ${item.className}`}
    >
      <span>[{item.code}]</span>
      <span className="font-sans">{item.label}</span>
    </span>
  );
}
