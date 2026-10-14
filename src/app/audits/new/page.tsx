"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

interface SamplePreset {
  presetKey: string;
  title: string;
  projectName: string;
  tokenSymbol: string;
  whitepaperFileName: string;
  whitepaperText: string;
  documentHash: string;
  tokenAddress: string;
  chainId: number;
  chainName: string;
  contractFile: string;
}

export default function NewAuditPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [title, setTitle] = useState("");
  const [projectName, setProjectName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [whitepaperFileName, setWhitepaperFileName] = useState(
    "uploaded-whitepaper.md"
  );
  const [whitepaperText, setWhitepaperText] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [chainId, setChainId] = useState(11155111);
  const [chainName, setChainName] = useState("Ethereum Sepolia");
  const [submitting, setSubmitting] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLoadSample(presetKey: "compliant" | "mismatched") {
    try {
      setLoadingPreset(true);
      setErrorMessage(null);
      const res = await fetch("/api/samples");
      const data = await res.json();
      const found = (data.samples as SamplePreset[])?.find(
        (s) => s.presetKey === presetKey
      );
      if (found) {
        setTitle(found.title);
        setProjectName(found.projectName);
        setTokenSymbol(found.tokenSymbol);
        setWhitepaperFileName(found.whitepaperFileName);
        setWhitepaperText(found.whitepaperText);
        setTokenAddress(found.tokenAddress);
        setChainId(found.chainId);
        setChainName(found.chainName);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          t(
            "Failed to load sample preset.",
            "샘플 데이터를 불러오는 중 오류가 발생했습니다."
          )
      );
    } finally {
      setLoadingPreset(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setWhitepaperFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setWhitepaperText(reader.result);
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/audits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          projectName,
          tokenSymbol,
          whitepaperFileName,
          whitepaperText,
          tokenAddress,
          chainId,
          chainName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.error ||
            t("Failed to create audit case.", "점검 건 생성에 실패했습니다.")
        );
      }

      router.push(`/audits/${data.audit.id}/extract`);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          t(
            "An error occurred while saving the audit case.",
            "점검 건 저장 중 오류가 발생했습니다."
          )
      );
      setSubmitting(false);
    }
  }

  const lineCount = whitepaperText
    ? whitepaperText.split(/\r?\n/).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Docket Filing Masthead */}
      <div className="border border-[#111315] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D8D4CC] bg-[#EFECE6] px-6 py-2.5 text-xs">
          <div className="flex items-center gap-3 font-mono text-[0.72rem] text-[#5A6065]">
            <Link
              href="/audits"
              className="font-sans font-semibold text-[#0F172A] underline-offset-4 hover:underline"
            >
              {t(
                "← Back to Audit Ledger (/audits)",
                "← 점검 원장 목록으로 돌아가기 (/audits)"
              )}
            </Link>
            <span className="text-[#D8D4CC]">|</span>
            <span>FORM BLI-101 // NEW DISCLOSURE AUDIT DOCKET INTAKE</span>
          </div>
          <div className="font-mono text-[0.6875rem] text-[#5A6065]">
            FILING AUTHORITY: DIGITAL ASSET COMPLIANCE DESK
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="font-editorial text-2xl font-bold text-[#111315] sm:text-3xl">
              {t(
                "Create New Disclosure vs. Smart Contract Audit Docket",
                "새 공시·스마트계약 불일치 점검 건 생성"
              )}
            </h1>
            <p className="mt-1 text-xs text-[#5A6065]">
              {t(
                "Enter the issuer and target smart contract metadata in the Filing Docket (left) and attach the disclosure whitepaper in Exhibit A (right) to compute the SHA-256 digest and initialize the 5 mandatory audit clause slots in SQLite.",
                "좌측 사건 접수부(Filing Docket Metadata)에 발행사·스마트계약 정보를 기입하고, 우측 원문 시트(Exhibit A)에 공시 백서를 등록하면 SHA-256 해시와 5대 필수 심사 슬롯이 SQLite 원장에 생성됩니다."
              )}
            </p>
          </div>

          {/* Preset Docket Loaders */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loadingPreset}
              onClick={() => handleLoadSample("compliant")}
              className="rounded-[2px] border border-[#166534]/50 bg-[#EAF3EC] px-3.5 py-2 text-xs font-semibold text-[#166534] transition hover:bg-[#166534] hover:text-white disabled:opacity-50"
            >
              {t(
                "Load Sample 1: Compliant Whitepaper (BLIC)",
                "샘플 1 불러오기: 정상 일치 백서 (BLIC)"
              )}
            </button>
            <button
              type="button"
              disabled={loadingPreset}
              onClick={() => handleLoadSample("mismatched")}
              className="rounded-[2px] border border-[#991B1B]/50 bg-[#FDECEC] px-3.5 py-2 text-xs font-semibold text-[#991B1B] transition hover:bg-[#991B1B] hover:text-white disabled:opacity-50"
            >
              {t(
                "Load Sample 2: Mismatched Whitepaper (BLIX)",
                "샘플 2 불러오기: 불일치 백서 (BLIX)"
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="border border-[#991B1B] bg-[#FDECEC] px-5 py-3.5 text-xs font-medium text-[#991B1B]">
          [FILING ERROR] {errorMessage}
        </div>
      )}

      {/* 2-Column Official Filing Docket Sheet */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 border border-[#111315] bg-white lg:grid-cols-12"
      >
        {/* Left Column (5 cols): Filing Metadata & Target Contract Specification */}
        <div className="flex flex-col justify-between border-b border-[#111315] bg-[#EFECE6]/50 lg:col-span-5 lg:border-b-0 lg:border-r">
          <div className="divide-y divide-[#D8D4CC]">
            {/* Part I: Case Identification */}
            <div className="p-6">
              <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-[#5A6065]">
                SECTION I // CASE &amp; ISSUER IDENTIFICATION
              </div>
              <h2 className="mt-1 font-editorial text-lg font-bold text-[#111315]">
                {t(
                  "1. Docket Title & Issuing Entity",
                  "1. 사건 표제 및 발행 주체 명세"
                )}
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="audit-title"
                    className="block text-xs font-semibold text-[#111315]"
                  >
                    {t(
                      "Examination Docket Title *",
                      "점검 건 제목 (Examination Docket Title) *"
                    )}
                  </label>
                  <input
                    id="audit-title"
                    name="title"
                    type="text"
                    required
                    placeholder={t(
                      "e.g., BLI Alpha Protocol Token (BLIX) — Listing Eligibility & Smart Contract Mismatch Audit",
                      "예: BLI Alpha Protocol Token (BLIX) 상장심사 공시·스마트계약 불일치 점검"
                    )}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1.5 w-full rounded-[2px] border border-[#D8D4CC] bg-white px-3 py-2 text-xs text-[#111315] placeholder-[#5A6065]/60 focus:border-[#0F172A] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="project-name"
                      className="block text-xs font-semibold text-[#111315]"
                    >
                      {t("Issuing Project / Foundation *", "발행 프로젝트 / 재단명 *")}
                    </label>
                    <input
                      id="project-name"
                      name="projectName"
                      type="text"
                      required
                      placeholder="e.g., BLI LegalTech Foundation"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="mt-1.5 w-full rounded-[2px] border border-[#D8D4CC] bg-white px-3 py-2 text-xs text-[#111315] placeholder-[#5A6065]/60 focus:border-[#0F172A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="token-symbol"
                      className="block text-xs font-semibold text-[#111315]"
                    >
                      {t("Token Symbol *", "토큰 심볼 *")}
                    </label>
                    <input
                      id="token-symbol"
                      name="tokenSymbol"
                      type="text"
                      required
                      placeholder="BLIC / BLIX"
                      value={tokenSymbol}
                      onChange={(e) => setTokenSymbol(e.target.value)}
                      className="mt-1.5 w-full rounded-[2px] border border-[#D8D4CC] bg-white px-3 py-2 font-mono text-xs font-semibold text-[#111315] placeholder-[#5A6065]/60 focus:border-[#0F172A] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Part II: On-Chain Contract Specification */}
            <div className="p-6">
              <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-[#5A6065]">
                SECTION II // ON-CHAIN TARGET SPECIFICATION
              </div>
              <h2 className="mt-1 font-editorial text-lg font-bold text-[#111315]">
                {t(
                  "2. Target Smart Contract & Network Coordinates",
                  "2. 온체인 스마트계약 및 체인 좌표"
                )}
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="token-address"
                    className="block text-xs font-semibold text-[#111315]"
                  >
                    {t(
                      "Target EVM Smart Contract Address *",
                      "대상 스마트계약 주소 (EVM Contract Address) *"
                    )}
                  </label>
                  <input
                    id="token-address"
                    name="tokenAddress"
                    type="text"
                    required
                    pattern="^0x[a-fA-F0-9]{40}$"
                    placeholder="0x534c51921913a8717Ca2db550b77fFabf168f71e"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="mt-1.5 w-full rounded-[2px] border border-[#D8D4CC] bg-white px-3 py-2 font-mono text-xs text-[#111315] placeholder-[#5A6065]/60 focus:border-[#0F172A] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="chain-select"
                    className="block text-xs font-semibold text-[#111315]"
                  >
                    {t(
                      "Target Blockchain Network (Chain ID) *",
                      "대상 블록체인 네트워크 (Chain ID) *"
                    )}
                  </label>
                  <select
                    id="chain-select"
                    name="chainId"
                    value={chainId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setChainId(id);
                      setChainName(
                        id === 11155111
                          ? "Ethereum Sepolia"
                          : id === 31337
                          ? "Local Anvil / Hardhat"
                          : "Ethereum Mainnet"
                      );
                    }}
                    className="mt-1.5 w-full rounded-[2px] border border-[#D8D4CC] bg-white px-3 py-2 font-mono text-xs text-[#111315] focus:border-[#0F172A] focus:outline-none"
                  >
                    <option value={11155111}>
                      Ethereum Sepolia Testnet (chainId: 11155111)
                    </option>
                    <option value={31337}>
                      Local Anvil / Foundry Testnet (chainId: 31337)
                    </option>
                    <option value={1}>Ethereum Mainnet (chainId: 1)</option>
                  </select>
                </div>

                {/* Reference Deployed Contracts Table */}
                <div className="border border-[#D8D4CC] bg-white p-3 text-[0.6875rem]">
                  <div className="font-mono font-semibold text-[#111315]">
                    REFERENCE SEPOLIA DEPLOYMENTS (CHAIN ID: 11155111)
                  </div>
                  <div className="mt-1.5 space-y-1 font-mono text-[#5A6065]">
                    <div>
                      <span className="font-bold text-[#166534]">[BLIC]</span>{" "}
                      <code>0x534c51921913a8717Ca2db550b77fFabf168f71e</code>
                    </div>
                    <div>
                      <span className="font-bold text-[#991B1B]">[BLIX]</span>{" "}
                      <code>0xbbE3c849D90c63645F917Be84a5b454FE858186F</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Part III: Source Document Metadata */}
            <div className="p-6">
              <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-[#5A6065]">
                SECTION III // EXHIBIT A ATTACHMENT METADATA
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-[#111315]">
                    {t("File Name:", "파일명:")}
                  </span>
                  <input
                    type="text"
                    aria-label={t("Document file name", "등록 파일명")}
                    value={whitepaperFileName}
                    onChange={(e) => setWhitepaperFileName(e.target.value)}
                    className="rounded-[2px] border border-[#D8D4CC] bg-white px-2.5 py-1 font-mono text-xs text-[#111315]"
                  />
                </div>

                <label className="cursor-pointer rounded-[2px] border border-[#111315] bg-white px-3 py-1.5 text-xs font-semibold text-[#111315] transition hover:bg-[#0F172A] hover:text-white">
                  {t(
                    "Upload Local File (.md, .txt)",
                    "로컬 문서(.md, .txt) 업로드"
                  )}
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Bottom Filing Submission Bar */}
          <div className="border-t border-[#111315] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <Link
                href="/audits"
                className="rounded-[2px] border border-[#D8D4CC] bg-[#EFECE6] px-4 py-2.5 text-xs font-semibold text-[#111315] hover:border-[#111315]"
              >
                {t("Cancel (/audits)", "취소 (/audits)")}
              </Link>
              <button
                type="submit"
                disabled={submitting}
                enterKeyHint="next"
                className="rounded-[2px] border border-[#0F172A] bg-[#0F172A] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1E293B] disabled:opacity-50"
              >
                {submitting
                  ? t(
                      "Registering Docket in SQLite...",
                      "SQLite 원장에 사건 등록 중..."
                    )
                  : t(
                      "Save to DB & Proceed to 5-Clause Extraction →",
                      "DB 저장 및 5대 항목 추출 단계로 이동 →"
                    )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Archival Whitepaper Manuscript Sheet */}
        <div className="flex flex-col justify-between bg-white lg:col-span-7">
          <div className="border-b border-[#D8D4CC] bg-[#F7F6F2] px-6 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[0.6875rem] font-bold uppercase tracking-wider text-[#5A6065]">
                  EXHIBIT A // DISCLOSURE WHITEPAPER MANUSCRIPT SHEET
                </div>
                <label
                  htmlFor="whitepaper-text"
                  className="font-editorial text-base font-bold text-[#111315]"
                >
                  {t(
                    "Disclosure Whitepaper Full Text (Markdown / Text) *",
                    "공시 백서 원문 (Markdown / Text) *"
                  )}
                </label>
              </div>
              <div className="font-mono text-[0.6875rem] text-[#5A6065]">
                LINES: {lineCount} · CHARS: {whitepaperText.length.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <textarea
              id="whitepaper-text"
              name="whitepaperText"
              required
              rows={22}
              placeholder={t(
                "Paste the full disclosure whitepaper text here, or click 'Load Sample 1: Compliant Whitepaper (BLIC)' or 'Load Sample 2: Mismatched Whitepaper (BLIX)' above.",
                "백서 원문을 이 시트에 붙여넣거나 상단의 '샘플 1 불러오기: 정상 일치 백서 (BLIC)' 또는 '샘플 2 불러오기: 불일치 백서 (BLIX)' 버튼을 클릭하세요."
              )}
              value={whitepaperText}
              onChange={(e) => setWhitepaperText(e.target.value)}
              className="h-full min-h-[460px] w-full rounded-[2px] border border-[#D8D4CC] bg-[#FAF9F5] p-5 font-mono text-xs leading-relaxed text-[#111315] placeholder-[#5A6065]/60 focus:border-[#0F172A] focus:outline-none"
            />
          </div>

          <div className="border-t border-[#D8D4CC] bg-[#EFECE6] px-6 py-3 font-mono text-[0.6875rem] text-[#5A6065]">
            MANDATORY EXAMINATION SCOPE: [§01 MAX_SUPPLY &amp; MINT] · [§02 TRANSFER_FEE] · [§03 PAUSE &amp; BLACKLIST] · [§04 TEAM_VESTING] · [§05 PROXY_UPGRADEABILITY]
          </div>
        </div>
      </form>
    </div>
  );
}
