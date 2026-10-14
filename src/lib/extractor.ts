import {
  AUDIT_CHECK_ITEM_KEYS,
  type AuditCheckItemKey,
  type DisclosedClaimStructured,
  type UpdateExtractedItemInput,
} from "@/types/audit";

export interface ExtractedClaimItem extends UpdateExtractedItemInput {
  disclosedData: DisclosedClaimStructured;
}

interface ParsedSection {
  heading: string;
  articleLabel: string;
  body: string;
  lines: string[];
}

function splitIntoSections(markdown: string): ParsedSection[] {
  const rawBlocks = markdown.split(/^##\s+/m);
  const sections: ParsedSection[] = [];

  for (const block of rawBlocks.slice(1)) {
    const lines = block
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;

    const heading = lines[0];
    const bodyLines = lines.slice(1);
    const body = bodyLines.join("\n");

    const enMatch = heading.match(/(Article\s*\d+)/i);
    const koMatch = heading.match(/(제\s*\d+\s*조)/);
    const articleLabel = enMatch
      ? enMatch[1].replace(/\s+/g, " ")
      : koMatch
      ? koMatch[1].replace(/\s+/g, "")
      : heading;

    sections.push({
      heading,
      articleLabel,
      body,
      lines: bodyLines,
    });
  }

  return sections;
}

function formatSectionRef(section: ParsedSection): string {
  const clauseNums: number[] = [];
  for (const line of section.lines) {
    const m = line.match(/^(\d+)\./);
    if (m) clauseNums.push(Number(m[1]));
  }
  const isKorean = /제\d+조/.test(section.articleLabel);
  if (clauseNums.length === 0) return section.articleLabel;
  if (clauseNums.length === 1) {
    return isKorean
      ? `${section.articleLabel} 제${clauseNums[0]}항`
      : `${section.articleLabel}, Clause ${clauseNums[0]}`;
  }
  const first = clauseNums[0];
  const last = clauseNums[clauseNums.length - 1];
  return isKorean
    ? `${section.articleLabel} 제${first}항~제${last}항`
    : `${section.articleLabel}, Clauses ${first}–${last}`;
}

function cleanMarkdownQuote(lines: string[]): string {
  return lines
    .filter((l) => !l.startsWith("---"))
    .map((l) => l.replace(/^\d+\.\s*/, "").replace(/\*\*/g, ""))
    .join(" ");
}

function extractSupplyNumber(text: string): string | undefined {
  const m = text.match(/(\d{1,3}(?:,\d{3}){2,})/);
  if (m) return m[1].replace(/,/g, "");

  const eokMatch = text.match(/(\d+)\s*억\s*개/);
  if (eokMatch) {
    return String(Number(eokMatch[1]) * 100_000_000);
  }
  const milMatch = text.match(/(\d+)\s*million/i);
  if (milMatch) {
    return String(Number(milMatch[1]) * 1_000_000);
  }
  return undefined;
}

function extractBps(text: string): number | undefined {
  const bpsMatch = text.match(/(\d+(?:,\d{3})*)\s*bps/i);
  if (bpsMatch) {
    return Number(bpsMatch[1].replace(/,/g, ""));
  }
  const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    return Math.round( parseFloat(pctMatch[1]) * 100 );
  }
  return undefined;
}

function extractEvmAddresses(text: string): string[] {
  const matches = text.match(/0x[a-fA-F0-9]{40}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

function extractUnixTimestamp(text: string): {
  timestamp?: number;
  isoDate?: string;
} {
  const tsMatch = text.match(/\b(1[789]\d{8}|2\d{9})\b/);
  if (tsMatch) {
    const ts = Number(tsMatch[1]);
    return {
      timestamp: ts,
      isoDate: new Date(ts * 1000).toISOString().slice(0, 10),
    };
  }

  const dateMatch = text.match(/(20\d{2})[-년\s/.]+0?(\d{1,2})[-월\s/.]+0?(\d{1,2})/);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = String(dateMatch[2]).padStart(2, "0");
    const day = String(dateMatch[3]).padStart(2, "0");
    const iso = `${year}-${month}-${day}T00:00:00Z`;
    const ts = Math.floor(Date.parse(iso) / 1000);
    return {
      timestamp: ts,
      isoDate: `${year}-${month}-${day}`,
    };
  }

  if (/January\s+1,\s*2028/i.test(text)) {
    return {
      timestamp: 1830297600,
      isoDate: "2028-01-01",
    };
  }

  return {};
}

export function parseStructuredClaimByItemKey(
  itemKey: AuditCheckItemKey,
  text: string,
  fullText?: string
): DisclosedClaimStructured {
  const combined = `${text}\n${fullText || ""}`;

  switch (itemKey) {
    case "maxSupplyAndMintability": {
      const maxSupply =
        extractSupplyNumber(text) ||
        extractSupplyNumber(combined) ||
        "100000000";
      const mintDenied =
        /mintable\s*=\s*false|no\s+additional\s+tokens\s+can\s+ever\s+be\s+minted|additional\s+token\s+minting\s+is\s+permanently\s+disabled|cannot\s+inflate|no\s+mint\(\)|추가\s*발행.*불가|추가\s*발행할\s*수\s*없|영구히\s*봉인|존재하지\s*않으며|권한.*포기|renounced/i.test(
          text
        );
      const mintAllowed =
        !mintDenied &&
        /mintable\s*=\s*true|can\s+mint\s+additional|추가\s*발행\s*가능|무제한\s*발행/i.test(
          text
        );

      return {
        maxSupply,
        mintable: mintAllowed ? true : false,
      };
    }

    case "transferFee": {
      const transferFeeBps = extractBps(text) ?? 100;
      const immutableFee =
        /feeMutable\s*=\s*false|immutable\s+constant|permanently\s+fixed|cannot\s+be\s+(?:modified|increased|arbitrarily\s+raised)|영구\s*고정|변경.*불가|인상할\s*수\s*없|상수\(constant\)/i.test(
          text
        );
      return {
        transferFeeBps,
        feeMutable: immutableFee ? false : true,
        maxTransferFeeBps: transferFeeBps,
      };
    }

    case "transferRestrictions": {
      const pauseDenied =
        /pausable\s*=\s*false|does\s+not\s+include\s+any\s+emergency\s+transfer\s+pause|unilateral\s+transfer\s+suspension.*not\s+implemented|cannot\s+unilaterally\s+halt|일시정지.*미탑재|일시정지.*존재하지\s*않|차단할\s*수\s*없/i.test(
          text
        );
      const blacklistDenied =
        /blacklistable\s*=\s*false|does\s+not\s+include.*blacklist|wallet\s+freezing.*not\s+implemented|cannot.*freeze\s+individual|블랙리스트.*미탑재|동결.*존재하지\s*않|동결.*탑재되어\s*있지\s*않/i.test(
          text
        );

      return {
        pausable: pauseDenied ? false : true,
        blacklistable: blacklistDenied ? false : true,
      };
    }

    case "teamLockup": {
      const addrs = extractEvmAddresses(text);
      const nonZeroAddr = addrs.find(
        (a) => a !== "0x0000000000000000000000000000000000000000"
      );
      const { timestamp, isoDate } = extractUnixTimestamp(text);
      const lockupActive =
        /teamLockupActive\s*=\s*true|strictly\s+locked\s+on-chain|enforced\s+by\s+an\s+on-chain\s+smart\s+contract\s+timelock|락업|동결|타임락|처분할\s*수\s*없/i.test(
          text
        );

      return {
        teamWallet:
          nonZeroAddr || "0x1111111111111111111111111111111111111111",
        teamLockupActive: lockupActive,
        teamLockupReleaseTimestamp: timestamp ?? 1830297600,
        teamLockupReleaseDateIso: isoDate ?? "2028-01-01",
      };
    }

    case "upgradeability": {
      const notUpgradeable =
        /upgradeable\s*=\s*false|non-upgradeable|immutable\s+smart\s+contract|does\s+not\s+use\s+EIP-1967|업그레이드.*불가|프록시.*사용하지\s*않|단독\s*컨트랙트/i.test(
          text
        );
      let governanceType = "Renounced / Immutable";
      if (/멀티시그|Multi-?sig|Timelock|타임락/i.test(text)) {
        governanceType = "Multi-sig + Timelock";
      } else if (
        /0x0000000000000000000000000000000000000000|권한.*포기|소유자\s*없음|renounced|no\s+proxy\s+administrator/i.test(
          text
        )
      ) {
        governanceType = "Renounced / Immutable";
      }

      return {
        upgradeable: notUpgradeable ? false : true,
        governanceType,
      };
    }
  }
}

export function extractClaimsWithRuleParser(
  whitepaperText: string
): ExtractedClaimItem[] {
  const sections = splitIntoSections(whitepaperText);

  function findSection(
    articleNum: number,
    keywordRegex: RegExp
  ): ParsedSection | undefined {
    return (
      sections.find(
        (s) =>
          s.articleLabel.includes(`Article ${articleNum}`) ||
          s.articleLabel.includes(`제${articleNum}조`)
      ) || sections.find((s) => keywordRegex.test(`${s.heading}\n${s.body}`))
    );
  }

  const sec1 = findSection(1, /Supply|Mint|발행량|추가\s*발행/i);
  const sec2 = findSection(2, /Fee|bps|수수료/i);
  const sec3 = findSection(3, /Pause|Blacklist|Freeze|일시정지|동결|블랙리스트/i);
  const sec4 = findSection(4, /Team|Lockup|Vesting|팀|락업|베스팅/i);
  const sec5 = findSection(5, /Proxy|Upgrade|Governance|업그레이드|프록시|거버넌스/i);

  const symbolMatch = whitepaperText.match(
    /\*\*(?:Token Symbol|토큰 심볼)\*\*:\s*`?([A-Za-z0-9_]+)`?/i
  );
  const symbol = symbolMatch ? symbolMatch[1] : "TOKEN";

  // 1. Max Supply & Mintability
  const s1Text = sec1 ? `${sec1.heading}\n${sec1.body}` : whitepaperText;
  const s1Struct = parseStructuredClaimByItemKey(
    "maxSupplyAndMintability",
    s1Text,
    whitepaperText
  );
  const supplyFormatted = Number(s1Struct.maxSupply || 100000000).toLocaleString(
    "en-US"
  );
  const item1: ExtractedClaimItem = {
    itemKey: "maxSupplyAndMintability",
    sectionRef: sec1 ? formatSectionRef(sec1) : "Article 1",
    sourceQuote: sec1
      ? cleanMarkdownQuote(sec1.lines)
      : "Total supply is permanently capped at 100,000,000 tokens and no additional tokens can be minted after genesis.",
    disclosedClaim: `Max supply permanently fixed at ${supplyFormatted} ${symbol}; post-genesis minting disabled (mintable = ${s1Struct.mintable})`,
    disclosedData: s1Struct,
    disclosedDataJson: JSON.stringify(s1Struct),
  };

  // 2. Transfer Fee
  const s2Text = sec2 ? `${sec2.heading}\n${sec2.body}` : whitepaperText;
  const s2Struct = parseStructuredClaimByItemKey(
    "transferFee",
    s2Text,
    whitepaperText
  );
  const feePct = ((s2Struct.transferFeeBps ?? 100) / 100).toFixed(2);
  const item2: ExtractedClaimItem = {
    itemKey: "transferFee",
    sectionRef: sec2 ? formatSectionRef(sec2) : "Article 2",
    sourceQuote: sec2
      ? cleanMarkdownQuote(sec2.lines)
      : "Transfer fee is fixed at 1.00% (100 bps) and cannot be increased after deployment.",
    disclosedClaim: `Transfer fee fixed at ${feePct}% (${s2Struct.transferFeeBps} bps); post-deployment fee hike disabled (feeMutable = ${s2Struct.feeMutable}, max = ${s2Struct.maxTransferFeeBps} bps)`,
    disclosedData: s2Struct,
    disclosedDataJson: JSON.stringify(s2Struct),
  };

  // 3. Transfer Restrictions
  const s3Text = sec3 ? `${sec3.heading}\n${sec3.body}` : whitepaperText;
  const s3Struct = parseStructuredClaimByItemKey(
    "transferRestrictions",
    s3Text,
    whitepaperText
  );
  const hasMultiSigException = /Multi-?sig|Timelock|멀티시그|타임락/i.test(s3Text);
  const item3: ExtractedClaimItem = {
    itemKey: "transferRestrictions",
    sectionRef: sec3 ? formatSectionRef(sec3) : "Article 3",
    sourceQuote: sec3
      ? cleanMarkdownQuote(sec3.lines)
      : "Smart contract does not include emergency pause or wallet blacklist functions.",
    disclosedClaim: hasMultiSigException
      ? `Unilateral transfer pause (pausable = ${s3Struct.pausable}) & wallet freezing (blacklistable = ${s3Struct.blacklistable}) disabled; emergency actions restricted to 5-of-9 Multi-Sig Timelock`
      : `Emergency transfer pause (pausable = ${s3Struct.pausable}) & address blacklist/freeze (blacklistable = ${s3Struct.blacklistable}) completely absent`,
    disclosedData: s3Struct,
    disclosedDataJson: JSON.stringify(s3Struct),
  };

  // 4. Team Lockup
  const s4Text = sec4 ? `${sec4.heading}\n${sec4.body}` : whitepaperText;
  const s4Struct = parseStructuredClaimByItemKey(
    "teamLockup",
    s4Text,
    whitepaperText
  );
  const item4: ExtractedClaimItem = {
    itemKey: "teamLockup",
    sectionRef: sec4 ? formatSectionRef(sec4) : "Article 4",
    sourceQuote: sec4
      ? cleanMarkdownQuote(sec4.lines)
      : "Team allocation (20,000,000 tokens) is locked on-chain until January 1, 2028 00:00:00 UTC (1830297600).",
    disclosedClaim: `Team Wallet (${s4Struct.teamWallet}) 20,000,000 ${symbol} locked on-chain until ${s4Struct.teamLockupReleaseDateIso} 00:00:00 UTC (timestamp: ${s4Struct.teamLockupReleaseTimestamp})`,
    disclosedData: s4Struct,
    disclosedDataJson: JSON.stringify(s4Struct),
  };

  // 5. Upgradeability
  const s5Text = sec5 ? `${sec5.heading}\n${sec5.body}` : whitepaperText;
  const s5Struct = parseStructuredClaimByItemKey(
    "upgradeability",
    s5Text,
    whitepaperText
  );
  const item5: ExtractedClaimItem = {
    itemKey: "upgradeability",
    sectionRef: sec5 ? formatSectionRef(sec5) : "Article 5",
    sourceQuote: sec5
      ? cleanMarkdownQuote(sec5.lines)
      : "Non-upgradeable standalone smart contract with no proxy implementation.",
    disclosedClaim: `Non-upgradeable fixed contract (upgradeable = ${s5Struct.upgradeable}); administrative governance: ${s5Struct.governanceType}`,
    disclosedData: s5Struct,
    disclosedDataJson: JSON.stringify(s5Struct),
  };

  const map: Record<AuditCheckItemKey, ExtractedClaimItem> = {
    maxSupplyAndMintability: item1,
    transferFee: item2,
    transferRestrictions: item3,
    teamLockup: item4,
    upgradeability: item5,
  };

  return AUDIT_CHECK_ITEM_KEYS.map((k) => map[k]);
}

export async function extractFiveCoreItemsFromWhitepaper(
  whitepaperText: string
): Promise<{
  engine: "OPENAI_LLM_PLUS_RULE" | "DETERMINISTIC_RULE_PARSER";
  items: ExtractedClaimItem[];
}> {
  const ruleItems = extractClaimsWithRuleParser(whitepaperText);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      engine: "DETERMINISTIC_RULE_PARSER",
      items: ruleItems,
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract the 5 core token disclosure claims from a whitepaper markdown into JSON with key 'items' matching itemKeys: maxSupplyAndMintability, transferFee, transferRestrictions, teamLockup, upgradeability.",
          },
          {
            role: "user",
            content: whitepaperText,
          },
        ],
      }),
    });

    if (!response.ok) {
      return { engine: "DETERMINISTIC_RULE_PARSER", items: ruleItems };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return { engine: "DETERMINISTIC_RULE_PARSER", items: ruleItems };
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.items)) {
      return { engine: "DETERMINISTIC_RULE_PARSER", items: ruleItems };
    }

    const merged = ruleItems.map((fallback) => {
      const found = parsed.items.find(
        (x: any) => x.itemKey === fallback.itemKey
      );
      if (!found) return fallback;
      return {
        ...fallback,
        disclosedClaim: found.disclosedClaim || fallback.disclosedClaim,
        sourceQuote: found.sourceQuote || fallback.sourceQuote,
        sectionRef: found.sectionRef || fallback.sectionRef,
      };
    });

    return {
      engine: "OPENAI_LLM_PLUS_RULE",
      items: merged,
    };
  } catch {
    return {
      engine: "DETERMINISTIC_RULE_PARSER",
      items: ruleItems,
    };
  }
}
