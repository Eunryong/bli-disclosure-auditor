"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Sparkles,
  Upload,
  Layers,
} from "lucide-react";

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
        err?.message || "샘플 데이터를 불러오는 중 오류가 발생했습니다."
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
        throw new Error(data.error || "점검 건 생성에 실패했습니다.");
      }

      router.push(`/audits/${data.audit.id}/extract`);
    } catch (err: any) {
      setErrorMessage(err?.message || "점검 건 저장 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <Link
            href="/audits"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            점검 건 목록으로 돌아가기 (/audits)
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            새 공시·스마트계약 불일치 점검 건 생성
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            가상자산 공시 백서 원문(SHA-256 자동 계산)과 점검 대상 스마트계약 주소·체인 정보를 SQLite DB에 영구 등록합니다.
          </p>
        </div>

        {/* Sample Preset Loader Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={loadingPreset}
            onClick={() => handleLoadSample("compliant")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            샘플 1 불러오기: 정상 일치 백서 (BLIC)
          </button>
          <button
            type="button"
            disabled={loadingPreset}
            onClick={() => handleLoadSample("mismatched")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3.5 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            샘플 2 불러오기: 불일치 백서 (BLIX)
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/75 p-6 shadow-lg"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="audit-title"
              className="block text-sm font-medium text-slate-200"
            >
              점검 건 제목 (Audit Case Title) *
            </label>
            <input
              id="audit-title"
              name="title"
              type="text"
              required
              placeholder="예: BLI Alpha Protocol Token (BLIX) 상장심사 공시·스마트계약 불일치 점검"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="token-symbol"
              className="block text-sm font-medium text-slate-200"
            >
              토큰 심볼 (Symbol) *
            </label>
            <input
              id="token-symbol"
              name="tokenSymbol"
              type="text"
              required
              placeholder="예: BLIC 또는 BLIX"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-slate-200"
            >
              발행 프로젝트 / 재단명 *
            </label>
            <input
              id="project-name"
              name="projectName"
              type="text"
              required
              placeholder="예: BLI LegalTech Foundation"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="token-address"
              className="block text-sm font-medium text-slate-200"
            >
              대상 스마트계약 주소 (Contract Address) *
            </label>
            <input
              id="token-address"
              name="tokenAddress"
              type="text"
              required
              pattern="^0x[a-fA-F0-9]{40}$"
              placeholder="0x5FbDB2315678afecb367f032d93F642f64180aa3"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="chain-select"
              className="block text-sm font-medium text-slate-200"
            >
              대상 블록체인 네트워크 (Chain ID) *
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
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
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
        </div>

        {/* Whitepaper Upload & Raw Text Editor */}
        <div className="space-y-3 border-t border-slate-800 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label
                htmlFor="whitepaper-text"
                className="block text-sm font-medium text-slate-200"
              >
                공시 백서 원문 (Markdown / Text) *
              </label>
              <p className="text-xs text-slate-400">
                저장 시 백서 원문 전체와 SHA-256 해시(documentHash) 및 5대 핵심 비교 항목 슬롯이 SQLite DB에 생성됩니다.
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700">
              <Upload className="h-3.5 w-3.5 text-blue-400" />
              로컬 문서 파일(.md, .txt) 불러오기
              <input
                type="file"
                accept=".md,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>등록 파일명:</span>
            <input
              type="text"
              aria-label="등록 파일명"
              value={whitepaperFileName}
              onChange={(e) => setWhitepaperFileName(e.target.value)}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-1 font-mono text-xs text-slate-200"
            />
          </div>

          <textarea
            id="whitepaper-text"
            name="whitepaperText"
            required
            rows={14}
            placeholder="백서 원문을 붙여넣거나 상단의 '샘플 1 불러오기(BLIC)' 또는 '샘플 2 불러오기(BLIX)' 버튼을 클릭하세요."
            value={whitepaperText}
            onChange={(e) => setWhitepaperText(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Layers className="h-4 w-4 text-blue-400" />
            <span>
              배포된 시연용 컨트랙트: 정상(<code>0x5FbDB2315678afecb367f032d93F642f64180aa3</code>, CompliantToken.sol) / 불일치(<code>0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512</code>, MismatchedToken.sol)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/audits"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={submitting}
              enterKeyHint="next"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting
                ? "SQLite DB에 저장 중..."
                : "DB 저장 및 5대 항목 추출 단계로 이동"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
