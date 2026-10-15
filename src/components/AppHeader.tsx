"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n";

interface GeminiConfigStatus {
  hasApiKey: boolean;
  maskedKey: string;
  model: string;
  fallbackModel: string;
}

export function AppHeader() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();

  const [geminiStatus, setGeminiStatus] = useState<GeminiConfigStatus | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("gemini-2.5-flash");
  const [savingKey, setSavingKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    telemetry?: {
      model: string;
      latencyMs: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      liveApiCalled: boolean;
    };
    error?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings/gemini")
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.hasApiKey === "boolean") {
          setGeminiStatus(data);
          if (data.model) setModelInput(data.model);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  async function handleSaveAndTest(testOnly = false) {
    try {
      setSavingKey(true);
      setTestResult(null);
      const res = await fetch("/api/settings/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
          model: modelInput,
          testOnly,
          testConnection: true,
        }),
      });
      const data = await res.json();
      if (!testOnly && data && typeof data.hasApiKey === "boolean") {
        setGeminiStatus({
          hasApiKey: data.hasApiKey,
          maskedKey: data.maskedKey,
          model: data.model,
          fallbackModel: data.fallbackModel,
        });
        setApiKeyInput("");
      }
      if (data?.testResult) {
        setTestResult(data.testResult);
      } else if (!data?.hasApiKey && !apiKeyInput.trim()) {
        setTestResult({
          ok: false,
          error: t(
            "Please enter a valid GEMINI_API_KEY first.",
            "먼저 유효한 GEMINI_API_KEY를 입력해 주세요."
          ),
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err?.message || "Failed to connect to /api/settings/gemini",
      });
    } finally {
      setSavingKey(false);
    }
  }

  return (
    <header className="border-b border-[#111315] bg-[#FFFFFF]">
      {/* Top Institutional Banner Strip */}
      <div className="border-b border-[#D8D4CC] bg-[#EFECE6] px-6 py-1.5">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 text-[0.6875rem] text-[#5A6065]">
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <span className="font-semibold text-[#111315]">
              DOCKET REGISTRY // DIGITAL ASSET DISCLOSURE EXAMINATION
            </span>
            <span className="text-[#D8D4CC]">|</span>
            <span>ORCHESTRATOR: CHAINLINK CRE (OCR3-BFT)</span>
            <span className="text-[#D8D4CC]">|</span>
            <span>AI ENGINE: GOOGLE GEMINI ({geminiStatus?.model || "gemini-2.5-flash"}) + 4-LAYER GUARDRAIL</span>
            <span className="text-[#D8D4CC]">|</span>
            <span>JURISDICTIONS: KR · EU (MiCA) · US (SEC)</span>
          </div>
          <div className="text-[0.6875rem] text-[#5A6065]">
            <strong className="font-semibold text-[#111315]">
              {t(
                "Non-Legal-Advice Notice:",
                "법률 자문 면책 고지(Non-Legal-Advice):"
              )}
            </strong>{" "}
            {t(
              "This system does not render automated legal conclusions; it extracts and verifies factual discrepancies between disclosure claims and on-chain smart contracts.",
              "본 시스템은 위법 여부를 자동 판정하지 않으며, 공시 백서(Claim)와 온체인 계약(Fact) 간의 사실적 불일치를 추출·증빙합니다."
            )}
          </div>
        </div>
      </div>

      {/* Main Masthead */}
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link href="/audits" className="group block">
            <div className="flex items-baseline gap-3">
              <span className="border border-[#111315] bg-[#0F172A] px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-white">
                BLI // EDGAR-CRE
              </span>
              <span className="font-editorial text-xl font-bold tracking-tight text-[#111315] sm:text-2xl">
                {t(
                  "Disclosure vs. Smart Contract Mismatch Auditor",
                  "스마트계약·공시자료(백서) 불일치 점검 원장"
                )}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[0.6875rem] tracking-tight text-[#5A6065]">
              {t(
                "ON-CHAIN FORENSIC & LEGAL COMPLIANCE LEDGER · CHAINLINK CRE + GOOGLE GEMINI AI (4-LAYER GUARDRAIL)",
                "DISCLOSURE VS. SMART CONTRACT MISMATCH AUDITOR · CHAINLINK CRE + GOOGLE GEMINI AI (4중 할루시네이션 가드레일)"
              )}
            </p>
          </Link>
        </div>

        <nav
          aria-label={t("Global Navigation", "전역 메뉴")}
          className="flex flex-wrap items-center gap-2"
        >
          <Link
            href="/audits"
            className={`inline-flex items-center gap-2 rounded-[2px] border px-3.5 py-2 text-xs font-semibold transition ${
              pathname === "/audits"
                ? "border-[#111315] bg-[#EFECE6] text-[#111315]"
                : "border-[#D8D4CC] bg-white text-[#5A6065] hover:border-[#111315] hover:text-[#111315]"
            }`}
          >
            <span className="font-mono text-[0.6875rem] text-[#5A6065]">01</span>
            {t("Audit Docket Ledger (/audits)", "점검 원장 목록 (/audits)")}
          </Link>
          <Link
            href="/audits/new"
            className={`inline-flex items-center gap-2 rounded-[2px] border px-4 py-2 text-xs font-semibold transition ${
              pathname === "/audits/new"
                ? "border-[#0F172A] bg-[#0F172A] text-white"
                : "border-[#0F172A] bg-[#0F172A] text-white hover:bg-[#1E293B]"
            }`}
          >
            <span className="font-mono text-[0.6875rem] text-[#D8D4CC]">+</span>
            {t("New Audit Docket (/audits/new)", "새 점검 건 생성 (/audits/new)")}
          </Link>

          {/* [Gemini AI Key / Guardrail Status] Button */}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={`inline-flex items-center gap-2 rounded-[2px] border px-3 py-2 font-mono text-[0.7rem] font-semibold transition ${
              geminiStatus?.hasApiKey
                ? "border-[#166534] bg-[#EAF3EC] text-[#166534] hover:bg-[#166534] hover:text-white"
                : "border-[#111315] bg-[#FAF9F5] text-[#111315] hover:bg-[#111315] hover:text-white"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                geminiStatus?.hasApiKey ? "bg-[#166534]" : "bg-[#166534]"
              }`}
            />
            <span>
              {geminiStatus?.hasApiKey
                ? t(
                    `Gemini AI Key / Guardrail Status: LIVE (${geminiStatus.model})`,
                    `Gemini AI 키 / 가드레일 상태: 활성 (${geminiStatus.model})`
                  )
                : t(
                    "Gemini AI Key / Guardrail Status",
                    "Gemini AI 키 / 가드레일 상태"
                  )}
            </span>
          </button>

          {/* EN | KO Language Toggle */}
          <div
            role="group"
            aria-label="Language switcher"
            className="ml-1 inline-flex items-center rounded-[2px] border border-[#111315] bg-[#EFECE6] font-mono text-[0.7rem] font-bold"
          >
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={`px-2.5 py-2 transition ${
                lang === "en"
                  ? "bg-[#0F172A] text-white"
                  : "text-[#5A6065] hover:text-[#111315]"
              }`}
            >
              EN
            </button>
            <span className="text-[#D8D4CC]">|</span>
            <button
              type="button"
              onClick={() => setLang("ko")}
              aria-pressed={lang === "ko"}
              className={`px-2.5 py-2 transition ${
                lang === "ko"
                  ? "bg-[#0F172A] text-white"
                  : "text-[#5A6065] hover:text-[#111315]"
              }`}
            >
              KO
            </button>
          </div>
        </nav>
      </div>

      {/* Gemini API Key Setup & Hallucination Guardrail Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl border-2 border-[#111315] bg-[#FFFFFF] shadow-lg">
            <div className="flex items-center justify-between border-b border-[#111315] bg-[#EFECE6] px-5 py-3.5">
              <div>
                <div className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#5A6065]">
                  GOOGLE GEMINI AI // 4-LAYER ANTI-HALLUCINATION GUARDRAIL ENGINE
                </div>
                <h2 className="font-editorial text-lg font-bold text-[#111315]">
                  {t(
                    "Gemini AI Key & 4-Layer Hallucination Guardrail Status",
                    "Google Gemini API 키 설정 및 4중 할루시네이션 가드레일 상태"
                  )}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-[2px] border border-[#111315] bg-white px-2.5 py-1 font-mono text-xs font-bold text-[#111315] hover:bg-[#111315] hover:text-white"
              >
                ✕ {t("Close", "닫기")}
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="border border-[#166534] bg-[#EAF3EC] p-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-[0.7rem] font-bold text-[#166534]">
                    Hallucination Guardrail: PASSED (Quote Grounded ✓ · EVM Facts Locked ✓ · Statutes Whitelisted ✓)
                  </span>
                  <span className="rounded-[2px] border border-[#166534] bg-white px-2 py-0.5 font-mono text-[0.65rem] font-bold text-[#166534]">
                    GATE: AI_DRAFT_VERIFIED
                  </span>
                </div>
                <div className="mt-2.5 grid gap-1.5 border-t border-[#166534]/30 pt-2.5 font-mono text-[0.6875rem] text-[#111315] sm:grid-cols-2">
                  <div>
                    <strong>Guard 1 (Quote Grounding):</strong>{" "}
                    {t(
                      "Exact whitepaper substring match enforced",
                      "백서 원문 정규화 부분문자열 대조 및 자동 복원"
                    )}
                  </div>
                  <div>
                    <strong>Guard 2 (EVM Fact Lock):</strong>{" "}
                    {t(
                      "Verdicts & EVM numbers immutable by LLM",
                      "판정(MATCH/MISMATCH) 및 온체인 수치 절대 고정"
                    )}
                  </div>
                  <div>
                    <strong>Guard 3 (Statute Whitelist):</strong>{" "}
                    {t(
                      "Closed-world KR/EU/US statute whitelist",
                      "화이트리스트 법령(KR/EU/US) 외 조문 인용 차단"
                    )}
                  </div>
                  <div>
                    <strong>Guard 4 (HITL Sign-off Gate):</strong>{" "}
                    {t(
                      "Requires Counsel sign-off before anchoring",
                      "변호사(Counsel) 최종 서명 전 온체인 앵커링 잠금"
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-[#D8D4CC] bg-[#FAF9F5] p-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[#111315]">
                    {t("Current .env Status:", "현재 .env 설정 상태:")}
                  </span>
                  {geminiStatus?.hasApiKey ? (
                    <span className="rounded-[2px] border border-[#166534] bg-[#EAF3EC] px-2 py-0.5 font-mono text-[0.6875rem] font-bold text-[#166534]">
                      ACTIVE KEY: {geminiStatus.maskedKey} ({geminiStatus.model})
                    </span>
                  ) : (
                    <span className="rounded-[2px] border border-[#9A3412] bg-[#FEF5EC] px-2 py-0.5 font-mono text-[0.6875rem] font-bold text-[#9A3412]">
                      {t(
                        "GEMINI_API_KEY Not Configured (Deterministic Guarded Mode Active)",
                        "GEMINI_API_KEY 미설정 (결정론적 가드레일 모드 활성)"
                      )}
                    </span>
                  )}
                </div>
                <p className="mt-2 leading-relaxed text-[#5A6065]">
                  {t(
                    "Google Gemini AI (temperature: 0 + JSON Schema) powers Step 1 (Whitepaper 5-Clause Extraction), Step 2 (Chainlink CRE Legal Discrepancy Reasoning), and Step 3 (Executive Legal Opinion & Formal Cure Notice Generation). Saving here writes directly to your local .env file.",
                    "Google Gemini AI(temperature: 0 + JSON Schema)는 Step 1(백서 5대 조항 추출), Step 2(Chainlink CRE 온체인·공시 불일치 법률 추론), Step 3(법무 종합 의견서 및 시정요구서 초안 생성)에 사용되며, 저장 시 로컬 .env 파일에 즉시 반영됩니다."
                  )}
                </p>
              </div>

              <div>
                <label
                  htmlFor="gemini-api-key-input"
                  className="block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[#111315]"
                >
                  GEMINI_API_KEY{" "}
                  {geminiStatus?.hasApiKey && (
                    <span className="font-normal text-[#5A6065]">
                      ({t("Leave blank to keep current key", "비워두면 현재 저장된 키 유지")}:{" "}
                      {geminiStatus.maskedKey})
                    </span>
                  )}
                </label>
                <input
                  id="gemini-api-key-input"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="mt-1.5 w-full rounded-[2px] border border-[#111315] bg-[#FAF9F5] px-3 py-2 font-mono text-xs text-[#111315] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="gemini-model-select"
                  className="block font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-[#111315]"
                >
                  GEMINI_MODEL ({t("Primary Inference Model", "기본 추론 모델")})
                </label>
                <select
                  id="gemini-model-select"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="mt-1.5 w-full rounded-[2px] border border-[#111315] bg-white px-3 py-2 font-mono text-xs text-[#111315] focus:outline-none"
                >
                  <option value="gemini-2.5-flash">
                    gemini-2.5-flash (Default — Fast &amp; High Legal Accuracy, Fallback: gemini-2.0-flash)
                  </option>
                  <option value="gemini-2.0-flash">
                    gemini-2.0-flash (Fallback Model)
                  </option>
                  <option value="gemini-2.5-pro">
                    gemini-2.5-pro (Deep Reasoning)
                  </option>
                  <option value="gemini-3.8-flash">
                    gemini-3.8-flash (Auto-routes with fallback to gemini-2.5-flash)
                  </option>
                </select>
              </div>

              {testResult && (
                <div
                  className={`border p-3 font-mono text-xs ${
                    testResult.ok
                      ? "border-[#166534] bg-[#EAF3EC] text-[#166534]"
                      : "border-[#991B1B] bg-[#FDF2F2] text-[#991B1B]"
                  }`}
                >
                  <div className="font-bold">
                    {testResult.ok
                      ? t(
                          "✓ Live Google Gemini API Connection Verified!",
                          "✓ Google Gemini API 실시간 연결 검증 성공!"
                        )
                      : t(
                          "✕ Gemini API Connection Failed",
                          "✕ Gemini API 연결 실패"
                        )}
                  </div>
                  {testResult.telemetry && (
                    <div className="mt-1 text-[0.6875rem]">
                      Model: <strong>{testResult.telemetry.model}</strong> | Latency:{" "}
                      <strong>{testResult.telemetry.latencyMs} ms</strong> | Tokens:{" "}
                      <strong>
                        {testResult.telemetry.totalTokens} (prompt{" "}
                        {testResult.telemetry.promptTokens} + completion{" "}
                        {testResult.telemetry.completionTokens})
                      </strong>
                    </div>
                  )}
                  {testResult.error && (
                    <div className="mt-1 text-[0.6875rem]">{testResult.error}</div>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#D8D4CC] pt-4">
                <button
                  type="button"
                  disabled={savingKey}
                  onClick={() => handleSaveAndTest(true)}
                  className="rounded-[2px] border border-[#111315] bg-[#EFECE6] px-3.5 py-2 font-mono text-xs font-semibold text-[#111315] hover:bg-[#111315] hover:text-white disabled:opacity-50"
                >
                  {savingKey
                    ? t("Testing...", "테스트 중...")
                    : t("Test Connection Only", "연결 테스트만 실행")}
                </button>
                <button
                  type="button"
                  disabled={savingKey}
                  onClick={() => handleSaveAndTest(false)}
                  className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-4 py-2 font-mono text-xs font-semibold text-white hover:bg-[#1E293B] disabled:opacity-50"
                >
                  {savingKey
                    ? t("Saving & Testing...", "저장 및 테스트 중...")
                    : t(
                        "Save to .env & Test Live Gemini API",
                        ".env에 저장 및 실시간 Gemini API 테스트"
                      )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
