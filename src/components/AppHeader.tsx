"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeader() {
  const pathname = usePathname();

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
            <span>JURISDICTIONS: KR · EU (MiCA) · US (SEC)</span>
          </div>
          <div className="text-[0.6875rem] text-[#5A6065]">
            <strong className="font-semibold text-[#111315]">
              법률 자문 면책 고지(Non-Legal-Advice):
            </strong>{" "}
            본 시스템은 위법 여부를 자동 판정하지 않으며, 공시 백서(Claim)와 온체인 계약(Fact) 간의 사실적 불일치를 추출·증빙합니다.
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
                스마트계약·공시자료(백서) 불일치 점검 원장
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[0.6875rem] tracking-tight text-[#5A6065]">
              DISCLOSURE VS. SMART CONTRACT MISMATCH AUDITOR · ON-CHAIN FORENSIC &amp; LEGAL WORKSPACE
            </p>
          </Link>
        </div>

        <nav aria-label="전역 메뉴" className="flex items-center gap-2">
          <Link
            href="/audits"
            className={`inline-flex items-center gap-2 rounded-[2px] border px-3.5 py-2 text-xs font-semibold transition ${
              pathname === "/audits"
                ? "border-[#111315] bg-[#EFECE6] text-[#111315]"
                : "border-[#D8D4CC] bg-white text-[#5A6065] hover:border-[#111315] hover:text-[#111315]"
            }`}
          >
            <span className="font-mono text-[0.6875rem] text-[#5A6065]">01</span>
            점검 원장 목록 (/audits)
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
            새 점검 건 생성 (/audits/new)
          </Link>
        </nav>
      </div>
    </header>
  );
}
