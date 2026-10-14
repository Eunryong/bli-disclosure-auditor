import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title:
    "Disclosure vs. Smart Contract Mismatch Auditor | BLI LegalTech & Chainlink CRE",
  description:
    "Forensic legal & compliance ledger verifying factual discrepancies between digital asset disclosure whitepapers (Claims) and on-chain smart contracts (Facts) via Chainlink CRE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
        <LanguageProvider>
          <AppHeader />
          <main className="mx-auto max-w-[1400px] px-6 py-8">{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
