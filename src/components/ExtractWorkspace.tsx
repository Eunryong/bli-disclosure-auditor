"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuditCaseDTO, AuditCheckItemDTO } from "@/types/audit";
import { useLanguage } from "@/lib/i18n";

export function ExtractWorkspace({ initialAudit }: { initialAudit: AuditCaseDTO }) {
  const router = useRouter();
  const { lang, t } = useLanguage();
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
        throw new Error(
          data.error ||
            t("Automatic extraction failed.", "자동 추출에 실패했습니다.")
        );
      }
      setAudit(data.audit);
      setItems(data.audit.checkItems || []);
      setFeedback(
        t(
          "Extracted all 5 core disclosure items (disclosedClaim, sourceQuote, sectionRef) from the whitepaper and saved to SQLite.",
          "백서 원문에서 5대 핵심 항목(공시 주장·근거 문구·조항 위치)을 추출하여 SQLite DB에 저장했습니다."
        )
      );
      router.refresh();
    } catch (err: any) {
      setFeedback(
        err?.message ||
          t(
            "An error occurred during extraction.",
            "추출 중 오류가 발생했습니다."
          )
      );
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
        throw new Error(
          data.error || t("Failed to save extraction.", "저장에 실패했습니다.")
        );
      }
      setAudit(data.audit);
      setItems(data.audit.checkItems || []);
      if (navigateToCompare) {
        router.push(`/audits/${audit.id}/compare`);
      } else {
        setFeedback(
          t(
            "All 5 extracted disclosure claims and citations have been saved to SQLite.",
            "5대 핵심 항목 추출/보정 내용이 SQLite DB에 영구 저장되었습니다."
          )
        );
        router.refresh();
      }
    } catch (err: any) {
      setFeedback(
        err?.message ||
          t("An error occurred while saving.", "저장 중 오류가 발생했습니다.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Desk 01 Action Ledger Bar */}
      <div className="border border-[#111315] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="space-y-1">
            <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#5A6065]">
              DESK 01 // CLAUSE EXTRACTION &amp; CITATION INDEXING
            </div>
            <p className="text-xs text-[#111315]">
              {lang === "en" ? (
                <>
                  Verify and confirm the{" "}
                  <strong className="font-semibold">
                    Disclosed Claim (disclosedClaim)
                  </strong>
                  ,{" "}
                  <strong className="font-semibold">
                    Verbatim Quote (sourceQuote)
                  </strong>
                  , and{" "}
                  <strong className="font-semibold">
                    Article Citation (sectionRef)
                  </strong>{" "}
                  for each of the 5 mandatory audit articles against Exhibit A on
                  the left.
                </>
              ) : (
                <>
                  좌측 등록 공시 백서 원문(Exhibit A)과 대조하며 5대 핵심 조항의{" "}
                  <strong className="font-semibold">
                    공시 주장(disclosedClaim)
                  </strong>
                  ,{" "}
                  <strong className="font-semibold">
                    원문 인용구(sourceQuote)
                  </strong>
                  ,{" "}
                  <strong className="font-semibold">
                    조항 위치(sectionRef)
                  </strong>
                  를 검증·확정하십시오.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={extracting || saving}
              onClick={handleAutoExtract}
              className="rounded-[2px] border border-[#111315] bg-[#EFECE6] px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#111315] hover:text-white disabled:opacity-50"
            >
              {extracting
                ? t("Extracting Claims...", "AI/규칙 추출 중...")
                : t(
                    "Auto-Extract 5 Core Claims (AI/Rule)",
                    "백서 5대 핵심 항목 AI 자동 추출"
                  )}
            </button>
            <button
              type="button"
              disabled={saving || extracting}
              onClick={() => handleSave(false)}
              className="rounded-[2px] border border-[#D8D4CC] bg-white px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:border-[#111315] hover:bg-[#F7F6F2] disabled:opacity-50"
            >
              {t("Save Draft to DB", "추출 결과 DB 임시저장")}
            </button>
            <button
              type="button"
              disabled={saving || extracting}
              onClick={() => handleSave(true)}
              className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:opacity-50"
            >
              {t(
                "Save & Proceed to Step 2 (CRE Compare) →",
                "저장 후 Step 2 (CRE 대조) 이동 →"
              )}
            </button>
          </div>
        </div>

        {feedback && (
          <div className="border-t border-[#166534] bg-[#EAF3EC] px-5 py-2.5 font-mono text-xs font-medium text-[#166534]">
            [NOTICE] {feedback}
          </div>
        )}
      </div>

      {/* Split Desk: Left Sticky Whitepaper Manuscript Sheet + Right Clause Index Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (5 cols): Archival Whitepaper Manuscript Sheet */}
        <section className="lg:col-span-5">
          <div className="sticky top-6 border-2 border-[#111315] bg-[#FAF9F5]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111315] bg-[#EFECE6] px-4 py-3">
              <div>
                <div className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#5A6065]">
                  EXHIBIT A // SOURCE DISCLOSURE DOCUMENT
                </div>
                <h2 className="font-editorial mt-0.5 text-base font-bold text-[#111315]">
                  {t(
                    "Registered Disclosure Whitepaper Manuscript",
                    "등록된 공시 백서 원문"
                  )}
                </h2>
              </div>
              <span className="rounded-[2px] border border-[#111315] bg-white px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-[#111315]">
                {audit.whitepaperFileName}
              </span>
            </div>

            <div className="border-b border-[#D8D4CC] bg-white px-4 py-2 font-mono text-[0.6875rem] text-[#5A6065]">
              <span className="font-semibold text-[#111315]">SHA-256 DIGEST:</span>{" "}
              <span className="break-all">{audit.documentHash}</span>
            </div>

            <div className="p-4">
              <pre className="max-h-[680px] overflow-y-auto whitespace-pre-wrap border border-[#D8D4CC] bg-white p-4 font-mono text-xs leading-relaxed text-[#111315]">
                {audit.whitepaperText}
              </pre>
            </div>
          </div>
        </section>

        {/* Right Column (7 cols): 5-Clause Extraction Index Ledger */}
        <section className="lg:col-span-7">
          <div className="border border-[#111315] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111315] bg-[#EFECE6] px-5 py-3">
              <div className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[#111315]">
                SCHEDULE OF EXTRACTED DISCLOSURE CLAUSES (§ 01 — § 05)
              </div>
              <div className="font-mono text-[0.6875rem] text-[#5A6065]">
                5 MANDATORY AUDIT ARTICLES
              </div>
            </div>

            <div className="divide-y divide-[#111315]">
              {items.map((item, idx) => {
                const clauseNum = String(idx + 1).padStart(2, "0");
                return (
                  <div
                    key={item.itemKey}
                    className="grid grid-cols-1 md:grid-cols-12"
                  >
                    {/* Left Clause Number Margin Gutter */}
                    <div className="border-b border-[#D8D4CC] bg-[#F7F6F2] p-4 md:col-span-3 md:border-b-0 md:border-r md:border-[#D8D4CC]">
                      <div className="font-mono text-xs font-bold tracking-[0.1em] text-[#111315]">
                        CLAUSE § {clauseNum}
                      </div>
                      <div className="mt-1 font-mono text-[0.65rem] font-semibold text-[#5A6065]">
                        [{item.itemKey}]
                      </div>
                      <h3 className="font-editorial mt-2 text-base font-bold leading-snug text-[#111315]">
                        {lang === "en"
                          ? `${idx + 1}. ${item.titleEn}`
                          : item.titleKo}
                      </h3>
                      <p className="mt-0.5 text-[0.7rem] text-[#5A6065]">
                        {lang === "en" ? item.titleKo : item.titleEn}
                      </p>

                      <div className="mt-3 border-t border-[#D8D4CC] pt-2.5">
                        <div className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[#5A6065]">
                          {t("On-Chain Target Functions", "온체인 대조 함수")}
                        </div>
                        <div className="mt-0.5 break-words font-mono text-[0.6875rem] font-medium text-[#111315]">
                          {item.evidenceFunctionOrSlot}
                        </div>
                      </div>
                    </div>

                    {/* Right Clause Editor Fields */}
                    <div className="space-y-3.5 p-4 md:col-span-9">
                      <div>
                        <label
                          htmlFor={`claim-${item.itemKey}`}
                          className="block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#111315]"
                        >
                          {t(
                            "Disclosed Claim Summary (disclosedClaim)",
                            "공시 주장 요약 (disclosedClaim)"
                          )}
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
                          placeholder={t(
                            "Summary of the whitepaper's commitment",
                            "백서에서 주장하는 핵심 설정 요약"
                          )}
                          className="mt-1 w-full rounded-[2px] border border-[#111315] bg-[#FAF9F5] px-3 py-2 text-xs font-medium text-[#111315] focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <label
                            htmlFor={`quote-${item.itemKey}`}
                            className="block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#5A6065]"
                          >
                            {t(
                              "Verbatim Whitepaper Quote (sourceQuote)",
                              "백서 원문 근거 인용구 (sourceQuote)"
                            )}
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
                            placeholder={t(
                              "Exact sentence excerpted from the whitepaper",
                              "백서 원문에서 발췌한 문장"
                            )}
                            className="mt-1 w-full rounded-[2px] border border-[#D8D4CC] bg-white px-3 py-2 text-xs leading-relaxed text-[#111315] focus:border-[#111315] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`section-${item.itemKey}`}
                            className="block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#5A6065]"
                          >
                            {t(
                              "Article Citation (sectionRef)",
                              "근거 조항 위치 (sectionRef)"
                            )}
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
                            placeholder={t(
                              "e.g., Article 1, Clauses 1–3",
                              "예: 제1조 제1항~제3항"
                            )}
                            className="mt-1 w-full rounded-[2px] border border-[#D8D4CC] bg-white px-3 py-2 font-mono text-xs text-[#111315] focus:border-[#111315] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Desk Navigation Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#111315] bg-[#EFECE6] px-5 py-3.5">
              <Link
                href="/audits"
                className="rounded-[2px] border border-[#111315] bg-white px-4 py-2 font-mono text-xs font-semibold text-[#111315] transition-colors hover:bg-[#F7F6F2]"
              >
                {t("← Back to Ledger (/audits)", "← 목록으로 (/audits)")}
              </Link>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-5 py-2.5 font-mono text-xs font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:opacity-50"
              >
                {t(
                  "Confirm Claims & Proceed to Chainlink CRE Compare →",
                  "추출 결과 확정 및 Chainlink CRE 대조 페이지로 이동 →"
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
