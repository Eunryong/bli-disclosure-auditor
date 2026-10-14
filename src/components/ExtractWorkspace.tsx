"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Save,
  FileText,
  BookOpenCheck,
} from "lucide-react";
import type { AuditCaseDTO, AuditCheckItemDTO } from "@/types/audit";

export function ExtractWorkspace({ initialAudit }: { initialAudit: AuditCaseDTO }) {
  const router = useRouter();
  const [audit, setAudit] = useState<AuditCaseDTO>(initialAudit);
  const [items, setItems] = useState<AuditCheckItemDTO[]>(
    initialAudit.checkItems || []
  );
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function updateItemField(
    itemKey: string,
    field: "disclosedClaim" | "sourceQuote" | "sectionRef",
    value: string
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.itemKey === itemKey ? { ...item, [field]: value } : item
      )
    );
  }

  async function handleAutoExtract() {
    try {
      setExtracting(true);
      setFeedback(null);
      const res = await fetch(`/api/audits/${audit.id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "auto" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "자동 추출에 실패했습니다.");
      }
      setAudit(data.audit);
      setItems(data.audit.checkItems || []);
      setFeedback(
        "백서 원문에서 5대 핵심 항목(공시 주장·근거 문구·조항 위치)을 추출하여 SQLite DB에 저장했습니다."
      );
      router.refresh();
    } catch (err: any) {
      setFeedback(err?.message || "추출 중 오류가 발생했습니다.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave(navigateToCompare: boolean) {
    try {
      setSaving(true);
      setFeedback(null);
      const res = await fetch(`/api/audits/${audit.id}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            itemKey: item.itemKey,
            disclosedClaim: item.disclosedClaim,
            sourceQuote: item.sourceQuote,
            sectionRef: item.sectionRef,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "저장에 실패했습니다.");
      }
      setAudit(data.audit);
      setItems(data.audit.checkItems || []);
      if (navigateToCompare) {
        router.push(`/audits/${audit.id}/compare`);
      } else {
        setFeedback("5대 핵심 항목 추출/보정 내용이 SQLite DB에 영구 저장되었습니다.");
        router.refresh();
      }
    } catch (err: any) {
      setFeedback(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <BookOpenCheck className="h-4 w-4 text-sky-400" />
          <span>
            좌측 백서 원문과 대조하며 5대 핵심 항목의 <strong>공시 주장(disclosedClaim)</strong>, <strong>원문 인용구(sourceQuote)</strong>, <strong>조항 위치(sectionRef)</strong>를 확인·수정하세요.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={extracting || saving}
            onClick={handleAutoExtract}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3.5 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            {extracting ? "AI/규칙 추출 중..." : "백서 5대 핵심 항목 AI 자동 추출"}
          </button>
          <button
            type="button"
            disabled={saving || extracting}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            추출 결과 DB 임시저장
          </button>
          <button
            type="button"
            disabled={saving || extracting}
            onClick={() => handleSave(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            저장 후 Step 2 (CRE 대조) 이동
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-sky-500/40 bg-sky-950/30 px-4 py-3 text-xs text-sky-200">
          {feedback}
        </div>
      )}

      {/* Split View: Whitepaper Raw Document (Left) + 5 Core Extracted Items (Right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Registered Whitepaper Source */}
        <section className="lg:col-span-5">
          <div className="sticky top-6 rounded-xl border border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">
                  등록된 공시 백서 원문
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {audit.whitepaperFileName}
              </span>
            </div>
            <div className="mt-2 font-mono text-[0.6875rem] text-slate-400">
              SHA-256: {audit.documentHash}
            </div>
            <pre className="mt-3 max-h-[680px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200">
              {audit.whitepaperText}
            </pre>
          </div>
        </section>

        {/* Right Column: 5 Mandatory Check Items Editor */}
        <section className="space-y-4 lg:col-span-7">
          {items.map((item) => (
            <div
              key={item.itemKey}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="font-mono text-xs font-semibold text-blue-400">
                    [{item.itemKey}]
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {item.titleKo}
                  </h3>
                  <p className="text-xs text-slate-400">{item.titleEn}</p>
                </div>
                <span className="rounded border border-slate-700 bg-slate-800/80 px-2.5 py-1 font-mono text-[0.6875rem] text-slate-300">
                  온체인 대조 함수: {item.evidenceFunctionOrSlot}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label
                    htmlFor={`claim-${item.itemKey}`}
                    className="block text-xs font-semibold text-slate-300"
                  >
                    공시 주장 요약 (disclosedClaim)
                  </label>
                  <input
                    id={`claim-${item.itemKey}`}
                    type="text"
                    value={item.disclosedClaim}
                    onChange={(e) =>
                      updateItemField(
                        item.itemKey,
                        "disclosedClaim",
                        e.target.value
                      )
                    }
                    placeholder="백서에서 주장하는 핵심 설정 요약"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`quote-${item.itemKey}`}
                      className="block text-xs font-semibold text-slate-300"
                    >
                      백서 원문 근거 인용구 (sourceQuote)
                    </label>
                    <textarea
                      id={`quote-${item.itemKey}`}
                      rows={2}
                      value={item.sourceQuote}
                      onChange={(e) =>
                        updateItemField(
                          item.itemKey,
                          "sourceQuote",
                          e.target.value
                        )
                      }
                      placeholder="백서 원문에서 발췌한 문장"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`section-${item.itemKey}`}
                      className="block text-xs font-semibold text-slate-300"
                    >
                      근거 조항 위치 (sectionRef)
                    </label>
                    <input
                      id={`section-${item.itemKey}`}
                      type="text"
                      value={item.sectionRef}
                      onChange={(e) =>
                        updateItemField(
                          item.itemKey,
                          "sectionRef",
                          e.target.value
                        )
                      }
                      placeholder="예: 제1조 제1항~제3항"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <Link
              href="/audits"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              목록으로 (/audits)
            </Link>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              추출 결과 확정 및 Chainlink CRE 대조 페이지로 이동
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
