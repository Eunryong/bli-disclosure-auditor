"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, FilePlus2, ListChecks, Scale } from "lucide-react";

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/audits"
            className="flex items-center gap-2.5 text-slate-100 hover:text-white"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-500/40 bg-blue-600/20 text-blue-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight">
                  스마트계약·공시자료(백서) 불일치 점검기
                </span>
                <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-blue-300">
                  Chainlink CRE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Disclosure vs. Smart Contract Mismatch Auditor · BLI LegalTech &amp; RegTech
              </p>
            </div>
          </Link>
        </div>

        <nav aria-label="전역 메뉴" className="flex items-center gap-2">
          <Link
            href="/audits"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              pathname === "/audits"
                ? "bg-slate-800 text-white"
                : "text-slate-300 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <ListChecks className="h-4 w-4 text-blue-400" />
            점검 건 목록 (/audits)
          </Link>
          <Link
            href="/audits/new"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition ${
              pathname === "/audits/new"
                ? "border-blue-400 bg-blue-600 text-white"
                : "border-blue-500/40 bg-blue-600/20 text-blue-200 hover:bg-blue-600/30"
            }`}
          >
            <FilePlus2 className="h-4 w-4" />
            새 점검 건 생성 (/audits/new)
          </Link>
        </nav>
      </div>

      {/* Non-legal advice compliance notice */}
      <div className="border-t border-slate-800/80 bg-slate-900/60 px-6 py-2">
        <div className="mx-auto flex max-w-7xl items-center gap-2 text-xs text-slate-400">
          <Scale className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>
            <strong>법률 자문 면책 고지(Non-Legal-Advice):</strong> 본 도구는 위법 여부를 자동 판정하지 않으며, 공시 백서의 주장(Disclosed Claim)과 온체인 스마트계약 설정(On-chain Fact) 간의 사실적 불일치를 추출·증빙하여 법무·컴플라이언스 담당자의 검토를 보조합니다.
          </span>
        </div>
      </div>
    </header>
  );
}
