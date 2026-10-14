import type { AuditComparisonStatus, AuditStage } from "@/types/audit";

export function ComparisonStatusBadge({
  status,
}: {
  status: AuditComparisonStatus;
}) {
  switch (status) {
    case "MATCH":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          MATCH (일치)
        </span>
      );
    case "MISMATCH":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          MISMATCH (불일치)
        </span>
      );
    case "NEEDS_HUMAN_REVIEW":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          NEEDS_HUMAN_REVIEW (법무검토 필요)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/80 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          PENDING (대기)
        </span>
      );
  }
}

export function StageBadge({ stage }: { stage: AuditStage }) {
  const map: Record<
    AuditStage,
    { label: string; className: string }
  > = {
    CREATED: {
      label: "1단계: 등록 완료",
      className: "border-slate-600 bg-slate-800 text-slate-300",
    },
    EXTRACTED: {
      label: "2단계: 공시항목 추출됨",
      className: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    },
    COMPARED: {
      label: "3단계: CRE 온체인 대조됨",
      className: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
    },
    REVIEWED: {
      label: "4단계: 법무검토 완료",
      className: "border-purple-500/40 bg-purple-500/15 text-purple-300",
    },
    ANCHORED: {
      label: "최종: 온체인 해시 앵커링됨",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    },
  };

  const item = map[stage] ?? map.CREATED;
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${item.className}`}
    >
      {item.label}
    </span>
  );
}
