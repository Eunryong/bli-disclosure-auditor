import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title:
    "스마트계약·공시자료(백서) 불일치 점검기 | BLI LegalTech & Chainlink CRE",
  description:
    "가상자산 공시 백서(Disclosure Claim)와 온체인 스마트계약 설정(On-chain Fact) 간의 사실적 불일치를 점검·증빙하는 법무·컴플라이언스 지원 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AppHeader />
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
