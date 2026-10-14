import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title:
    "스마트계약·공시자료(백서) 불일치 점검기 | BLI LegalTech & Chainlink CRE",
  description:
    "가상자산 공시 백서(Disclosure Claim)와 온체인 스마트계약 설정(On-chain Fact) 간의 사실적 불일치를 점검·증빙하는 법무·컴플라이언스 지원 원장",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..600&family=Noto+Serif+KR:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F7F6F2] text-[#111315] antialiased selection:bg-[#0F172A] selection:text-white">
        <AppHeader />
        <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
