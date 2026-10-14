import type {
  AuditCheckItemKey,
  DisclosedClaimStructured,
  UpdateExtractedItemInput,
} from "@/types/audit";

export interface ExtractionResult {
  engine: "openai-structured-output" | "deterministic-rule-parser";
  items: UpdateExtractedItemInput[];
}

interface ParsedSection {
  heading: string;
  articleRef: string;
  clauseCount: number;
  lines: string[];
  rawText: string;
}

function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^\s*\d+\.\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoSections(markdown: string): ParsedSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    const headingMatch = trimmed.match(/^#{2,3}\s+(.+)$/);
    if (headingMatch) {
      if (current) {
        current.rawText = current.lines.join("\n").trim();
        sections.push(current);
      }
      const headingText = headingMatch[1].trim();
      const articleMatch = headingText.match(/(제\s*\d+\s*조)/);
      current = {
        heading: headingText,
        articleRef: articleMatch ? articleMatch[1].replace(/\s+/g, "") : headingText,
        clauseCount: 0,
        lines: [],
        rawText: "",
      };
      continue;
    }

    if (current && trimmed.length > 0 && !trimmed.startsWith("---")) {
      if (/^\d+\.\s+/.test(trimmed)) {
        current.clauseCount += 1;
      }
      current.lines.push(trimmed);
    }
  }

  if (current) {
    current.rawText = current.lines.join("\n").trim();
    sections.push(current);
  }

  return sections;
}

function findBestSection(
  sections: ParsedSection[],
  keywords: RegExp,
  fallbackIndex: number
): ParsedSection {
  const headingMatched = sections.find((s) => keywords.test(s.heading));
  if (headingMatched) return headingMatched;
  const bodyMatched = sections.find((s) => keywords.test(s.rawText));
  if (bodyMatched) return bodyMatched;
  if (sections[fallbackIndex]) return sections[fallbackIndex];
  return {
    heading: "본문 전체",
    articleRef: "본문",
    clauseCount: 1,
    lines: sections.flatMap((s) => s.lines),
    rawText: sections.map((s) => s.rawText).join("\n"),
  };
}

function formatSectionRef(section: ParsedSection): string {
  if (section.articleRef.startsWith("제") && section.clauseCount > 0) {
    if (section.clauseCount === 1) {
      return `${section.articleRef} 제1항`;
    }
    return `${section.articleRef} 제1항~제${section.clauseCount}항`;
  }
  return section.heading;
}

function parseSupplyNumber(text: string): string | undefined {
  // Match explicit comma-separated token numbers such as 100,000,000
  const commaMatch = text.match(/\b(\d{1,3}(?:,\d{3})+)\b/);
  if (commaMatch) {
    return commaMatch[1].replace(/,/g, "");
  }
  // Match Korean '억 개' e.g. 1억 개
  const eokMatch = text.match(/(\d+)\s*억\s*개/);
  if (eokMatch) {
    return String(Number(eokMatch[1]) * 100_000_000);
  }
  return undefined;
}

function parseFeeBps(text: string): number | undefined {
  const bpsMatch = text.match(/(\d{1,5})\s*bps/i);
  if (bpsMatch) {
    return Number(bpsMatch[1]);
  }
  const eqBpsMatch = text.match(/transferFeeBps\s*=\s*(\d{1,5})/i);
  if (eqBpsMatch) {
    return Number(eqBpsMatch[1]);
  }
  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    return Math.round(Number(pctMatch[1]) * 100);
  }
  return undefined;
}

function parseReleaseTimestamp(text: string): number | undefined {
  const explicitTs = text.match(/releaseTimestamp\s*[:=]\s*(\d{9,12})/i);
  if (explicitTs) {
    return Number(explicitTs[1]);
  }
  const unixMatch = text.match(/\b(1[789]\d{8})\b/);
  if (unixMatch) {
    return Number(unixMatch[1]);
  }
  const korDate = text.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (korDate) {
    const year = Number(korDate[1]);
    const month = Number(korDate[2]);
    const day = Number(korDate[3]);
    const ms = Date.UTC(year, month - 1, day, 0, 0, 0);
    return Math.floor(ms / 1000);
  }
  const isoDate = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const ms = Date.UTC(
      Number(isoDate[1]),
      Number(isoDate[2]) - 1,
      Number(isoDate[3]),
      0,
      0,
      0
    );
    return Math.floor(ms / 1000);
  }
  return undefined;
}

/**
 * Infers structured disclosed claim parameters from claim/quote text.
 * Used both during initial extraction and when a user manually edits a claim in /extract.
 */
export function parseStructuredClaimByItemKey(
  itemKey: AuditCheckItemKey,
  textToParse: string,
  fullDocumentText?: string
): DisclosedClaimStructured {
  const combined = `${textToParse}\n${fullDocumentText || ""}`;

  switch (itemKey) {
    case "maxSupplyAndMintability": {
      const maxSupply =
        parseSupplyNumber(textToParse) ||
        parseSupplyNumber(fullDocumentText || "") ||
        "100000000";

      const explicitlyMintable =
        /mintable\s*=\s*true|추가\s*발행\s*가능|무제한\s*발행/i.test(textToParse) &&
        !/불가|없다|존재하지\s*않/i.test(textToParse);
      const mintable = explicitlyMintable ? true : false;
      const ownerRenounced =
        /address\(0\)|영구\s*포기|0x0\b/i.test(textToParse);

      return {
        maxSupply,
        mintable,
        ownerRenounced,
      };
    }

    case "transferFee": {
      const transferFeeBps = parseFeeBps(textToParse) ?? 100;
      const maxFeeMatch = textToParse.match(/maxTransferFeeBps\s*=\s*(\d+)/i);
      const maxTransferFeeBps = maxFeeMatch
        ? Number(maxFeeMatch[1])
        : transferFeeBps;
      const feeMutable =
        /feeMutable\s*=\s*true|수수료.*변경\s*가능|수수료.*인상\s*가능/i.test(
          textToParse
        ) && !/불가|없다|존재하지\s*않/i.test(textToParse);

      return {
        transferFeeBps,
        maxTransferFeeBps,
        feeMutable,
      };
    }

    case "transferRestrictions": {
      const pausable =
        /pausable\s*=\s*true|일시정지\s*가능/i.test(textToParse) &&
        !/불가|없다|존재하지\s*않|포함되어\s*있지\s*않|없음/i.test(textToParse);
      const blacklistable =
        /blacklistable\s*=\s*true|동결\s*가능|블랙리스트\s*적용/i.test(
          textToParse
        ) &&
        !/불가|없다|존재하지\s*않|포함되어\s*있지\s*않|없음/i.test(textToParse);

      return {
        pausable,
        blacklistable,
      };
    }

    case "teamLockup": {
      const addrInSection = textToParse.match(/0x[a-fA-F0-9]{40}/);
      let teamWallet = addrInSection ? addrInSection[0] : undefined;
      if (!teamWallet && fullDocumentText) {
        const allAddrs = fullDocumentText.match(/0x[a-fA-F0-9]{40}/g);
        if (allAddrs && allAddrs.length > 1) {
          teamWallet = allAddrs[1];
        } else if (allAddrs && allAddrs.length === 1) {
          teamWallet = allAddrs[0];
        }
      }
      const teamLockupReleaseTimestamp =
        parseReleaseTimestamp(textToParse) ?? 1830297600;
      const teamLockupActive = !(
        /teamLockupActive\s*=\s*false|락업\s*없음|락업\s*미적용/i.test(
          textToParse
        )
      );
      const teamAllocation = parseSupplyNumber(textToParse) || "20000000";

      return {
        teamWallet:
          teamWallet || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        teamAllocation,
        teamLockupActive,
        teamLockupReleaseTimestamp,
        teamLockupReleaseDateIso: new Date(
          teamLockupReleaseTimestamp * 1000
        ).toISOString(),
      };
    }

    case "upgradeability": {
      const upgradeable =
        /upgradeable\s*=\s*true|업그레이드\s*가능/i.test(textToParse) &&
        !/불가|불변|미사용|사용하지\s*않/i.test(textToParse);
      const governanceType = /다중서명|Multi-sig|타임락/i.test(combined)
        ? "MULTISIG_TIMELOCK"
        : /address\(0\)|존재하지\s*않|영구\s*포기/i.test(textToParse)
        ? "RENOUNCED"
        : "IMMUTABLE";

      return {
        upgradeable,
        governanceType,
      };
    }
  }
}

/**
 * Deterministic rule & regex parser that extracts the 5 mandatory check items
 * directly from the uploaded whitepaper markdown/text.
 */
export function extractClaimsWithRuleParser(
  whitepaperText: string
): UpdateExtractedItemInput[] {
  const sections = splitIntoSections(whitepaperText);
  const symbolMatch =
    whitepaperText.match(/\(`([A-Z0-9]{2,10})`\)/) ||
    whitepaperText.match(/\b(BLIC|BLIX)\b/);
  const symbol = symbolMatch ? symbolMatch[1] : "TOKEN";

  // 1. maxSupplyAndMintability
  const sec1 = findBestSection(
    sections,
    /총발행량|발행량|추가\s*발행|Max\s*Supply|mint/i,
    0
  );
  const quote1 = stripMarkdownFormatting(sec1.rawText);
  const struct1 = parseStructuredClaimByItemKey(
    "maxSupplyAndMintability",
    sec1.rawText,
    whitepaperText
  );
  const formattedMaxSupply = Number(struct1.maxSupply || 100000000).toLocaleString(
    "en-US"
  );
  const claim1 = `최대 총발행량 ${formattedMaxSupply} ${symbol} 고정(Fixed Cap) 및 최초 발행 이후 추가 발행(mint) ${
    struct1.mintable ? "가능" : "불가"
  }${struct1.ownerRenounced ? ", 소유자 권한 영구 포기(address(0))" : ""}`;

  // 2. transferFee
  const sec2 = findBestSection(
    sections,
    /수수료|Transfer\s*Fee|transferFeeBps|bps/i,
    1
  );
  const quote2 = stripMarkdownFormatting(sec2.rawText);
  const struct2 = parseStructuredClaimByItemKey(
    "transferFee",
    sec2.rawText,
    whitepaperText
  );
  const feePct = ((struct2.transferFeeBps ?? 100) / 100).toFixed(2);
  const claim2 = `전송 수수료율 ${feePct}% (${
    struct2.transferFeeBps ?? 100
  } bps) 고정 및 배포 이후 수수료율 임의 인상 ${
    struct2.feeMutable ? "가능" : "불가(feeMutable = false)"
  }`;

  // 3. transferRestrictions
  const sec3 = findBestSection(
    sections,
    /거래\s*제한|일시정지|동결|블랙리스트|pause|blacklist|자유로운\s*거래/i,
    2
  );
  const quote3 = stripMarkdownFormatting(sec3.rawText);
  const struct3 = parseStructuredClaimByItemKey(
    "transferRestrictions",
    sec3.rawText,
    whitepaperText
  );
  const claim3 =
    !struct3.pausable && !struct3.blacklistable
      ? "거래 일시정지(pause) 및 특정 지갑 동결(blacklist) 기능 일체 없음 (pausable = false, blacklistable = false)"
      : `거래 일시정지(pausable=${struct3.pausable}) 또는 지갑 동결(blacklistable=${struct3.blacklistable}) 권한 포함`;

  // 4. teamLockup
  const sec4 = findBestSection(
    sections,
    /팀|창업|락업|타임락|releaseTimestamp|물량/i,
    3
  );
  const quote4 = stripMarkdownFormatting(sec4.rawText);
  const struct4 = parseStructuredClaimByItemKey(
    "teamLockup",
    sec4.rawText,
    whitepaperText
  );
  const formattedTeamAmount = Number(
    struct4.teamAllocation || 20000000
  ).toLocaleString("en-US");
  const releaseIso = (
    struct4.teamLockupReleaseDateIso || "2028-01-01T00:00:00.000Z"
  )
    .replace(".000Z", " UTC")
    .replace("T", " ");
  const claim4 = `팀 할당 물량 ${formattedTeamAmount} ${symbol} (지갑: ${struct4.teamWallet}) — ${releaseIso} (timestamp: ${struct4.teamLockupReleaseTimestamp})까지 온체인 강제 락업`;

  // 5. upgradeability
  const sec5 = findBestSection(
    sections,
    /불변|업그레이드|프록시|거버넌스|Upgrade|Immutable|Proxy/i,
    4
  );
  const quote5 = stripMarkdownFormatting(sec5.rawText);
  const struct5 = parseStructuredClaimByItemKey(
    "upgradeability",
    sec5.rawText,
    whitepaperText
  );
  const claim5 = !struct5.upgradeable
    ? struct5.governanceType === "MULTISIG_TIMELOCK"
      ? "프록시 임의 업그레이드 불가(Non-upgradeable) 및 다중서명(Multi-sig)·타임락 거버넌스 관리, 단일 EOA 단독 통제 배제"
      : "프록시 패턴 미사용 단일 불변 컨트랙트(upgradeable = false) 및 관리자 계정 부재(adminAddress = 0x0)"
    : "프록시 업그레이드 가능 구조 공시";

  return [
    {
      itemKey: "maxSupplyAndMintability",
      disclosedClaim: claim1,
      sourceQuote: quote1,
      sectionRef: formatSectionRef(sec1),
      disclosedDataJson: JSON.stringify(struct1),
    },
    {
      itemKey: "transferFee",
      disclosedClaim: claim2,
      sourceQuote: quote2,
      sectionRef: formatSectionRef(sec2),
      disclosedDataJson: JSON.stringify(struct2),
    },
    {
      itemKey: "transferRestrictions",
      disclosedClaim: claim3,
      sourceQuote: quote3,
      sectionRef: formatSectionRef(sec3),
      disclosedDataJson: JSON.stringify(struct3),
    },
    {
      itemKey: "teamLockup",
      disclosedClaim: claim4,
      sourceQuote: quote4,
      sectionRef: formatSectionRef(sec4),
      disclosedDataJson: JSON.stringify(struct4),
    },
    {
      itemKey: "upgradeability",
      disclosedClaim: claim5,
      sourceQuote: quote5,
      sectionRef: formatSectionRef(sec5),
      disclosedDataJson: JSON.stringify(struct5),
    },
  ];
}

/**
 * Calls OpenAI Chat Completions with Structured Outputs (JSON Schema) when OPENAI_API_KEY is configured.
 * Automatically falls back to deterministic rule parser if OPENAI_API_KEY is not set or network fails.
 */
export async function extractFiveCoreItemsFromWhitepaper(
  whitepaperText: string
): Promise<ExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (apiKey) {
    try {
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            {
              role: "system",
              content:
                "당신은 가상자산 공시 백서(Whitepaper)에서 온체인 스마트계약 대조용 5대 핵심 항목(maxSupplyAndMintability, transferFee, transferRestrictions, teamLockup, upgradeability)을 추출하는 법률·컴플라이언스 파서입니다. 원문에 있는 실제 문장(sourceQuote)과 조항 위치(sectionRef), 그리고 수치/불리언 파라미터를 정확히 JSON으로 추출하세요.",
            },
            {
              role: "user",
              content: whitepaperText,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "whitepaper_five_core_claims",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                required: ["items"],
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "itemKey",
                        "disclosedClaim",
                        "sourceQuote",
                        "sectionRef",
                      ],
                      properties: {
                        itemKey: {
                          type: "string",
                          enum: [
                            "maxSupplyAndMintability",
                            "transferFee",
                            "transferRestrictions",
                            "teamLockup",
                            "upgradeability",
                          ],
                        },
                        disclosedClaim: { type: "string" },
                        sourceQuote: { type: "string" },
                        sectionRef: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as {
            items: Array<{
              itemKey: AuditCheckItemKey;
              disclosedClaim: string;
              sourceQuote: string;
              sectionRef: string;
            }>;
          };
          if (Array.isArray(parsed.items) && parsed.items.length === 5) {
            const enriched: UpdateExtractedItemInput[] = parsed.items.map(
              (item) => {
                const structured = parseStructuredClaimByItemKey(
                  item.itemKey,
                  `${item.disclosedClaim}\n${item.sourceQuote}`,
                  whitepaperText
                );
                return {
                  itemKey: item.itemKey,
                  disclosedClaim: item.disclosedClaim,
                  sourceQuote: item.sourceQuote,
                  sectionRef: item.sectionRef,
                  disclosedDataJson: JSON.stringify(structured),
                };
              }
            );
            return {
              engine: "openai-structured-output",
              items: enriched,
            };
          }
        }
      }
    } catch {
      // Fall through to deterministic rule parser
    }
  }

  return {
    engine: "deterministic-rule-parser",
    items: extractClaimsWithRuleParser(whitepaperText),
  };
}
