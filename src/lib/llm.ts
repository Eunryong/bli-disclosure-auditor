import fs from "node:fs";
import path from "node:path";
import type {
  AuditCheckItemDTO,
  AuditCheckItemKey,
  AuditComparisonStatus,
  CounterfactualBreachSimulation,
  DisclosedClaimStructured,
  GeminiCallMetadata,
} from "@/types/audit";
import { AUDIT_CHECK_ITEM_KEYS } from "@/types/audit";
import { LEGAL_STATUTE_MAP, generateLegalCureNotice } from "@/lib/legal-knowledge";
import {
  createDefaultGuardrailReport,
  verifyAndGuardStep2Rationales,
  verifyAndGuardStep3LegalDraft,
} from "@/lib/hallucination-guard";

const ENV_FILE_PATH = path.join(process.cwd(), ".env");
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
export const FALLBACK_GEMINI_MODEL = "gemini-2.5-flash";

export interface GeminiRuntimeConfig {
  apiKey: string;
  hasApiKey: boolean;
  maskedKey: string;
  model: string;
  fallbackModel: string;
}

function parseEnvFileMap(): Record<string, string> {
  const map: Record<string, string> = {};
  try {
    if (!fs.existsSync(ENV_FILE_PATH)) return map;
    const raw = fs.readFileSync(ENV_FILE_PATH, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      map[key] = val;
    }
  } catch {
    // ignore read errors
  }
  return map;
}

export function maskApiKey(key: string): string {
  const clean = key.trim();
  if (!clean) return "";
  if (clean.length <= 8) return `${clean.slice(0, 2)}****`;
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

/**
 * Dynamically reads GEMINI_API_KEY (or GOOGLE_API_KEY) and GEMINI_MODEL from .env and process.env
 * so changes saved via the Web UI modal take effect immediately without server restart.
 */
export function getGeminiConfig(): GeminiRuntimeConfig {
  const envMap = parseEnvFileMap();
  const apiKey = (
    envMap.GEMINI_API_KEY ||
    envMap.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();

  const model = (
    envMap.GEMINI_MODEL ||
    process.env.GEMINI_MODEL ||
    DEFAULT_GEMINI_MODEL
  ).trim();

  return {
    apiKey,
    hasApiKey: apiKey.length > 0,
    maskedKey: maskApiKey(apiKey),
    model: model || DEFAULT_GEMINI_MODEL,
    fallbackModel: FALLBACK_GEMINI_MODEL,
  };
}

/**
 * Persists GEMINI_API_KEY and GEMINI_MODEL into the project's .env file and updates process.env.
 */
export function saveGeminiConfigToEnv(params: {
  apiKey?: string;
  model?: string;
}): GeminiRuntimeConfig {
  let content = "";
  try {
    if (fs.existsSync(ENV_FILE_PATH)) {
      content = fs.readFileSync(ENV_FILE_PATH, "utf8");
    }
  } catch {
    content = "";
  }

  const current = getGeminiConfig();
  const nextApiKey =
    params.apiKey !== undefined ? params.apiKey.trim() : current.apiKey;
  const nextModel =
    params.model !== undefined && params.model.trim()
      ? params.model.trim()
      : current.model || DEFAULT_GEMINI_MODEL;

  const upsertEnvVar = (src: string, key: string, value: string): string => {
    const escaped = value.replace(/"/g, '\\"');
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(src)) {
      return src.replace(regex, `${key}="${escaped}"`);
    }
    const prefix = src.endsWith("\n") || src.length === 0 ? "" : "\n";
    return `${src}${prefix}${key}="${escaped}"\n`;
  };

  content = upsertEnvVar(content, "GEMINI_API_KEY", nextApiKey);
  content = upsertEnvVar(content, "GEMINI_MODEL", nextModel);

  fs.writeFileSync(ENV_FILE_PATH, content, "utf8");
  process.env.GEMINI_API_KEY = nextApiKey;
  process.env.GEMINI_MODEL = nextModel;

  return getGeminiConfig();
}

export interface CallGeminiLlmParams {
  systemInstruction: string;
  userPrompt: string;
  task: GeminiCallMetadata["task"];
  apiKeyOverride?: string;
  modelOverride?: string;
  temperature?: number;
  responseSchema?: Record<string, unknown>;
}

export interface CallGeminiLlmResult<T = Record<string, any>> {
  ok: boolean;
  parsedJson: T | null;
  rawText: string;
  telemetry: GeminiCallMetadata;
  error?: string;
}

function extractJsonFromText<T = Record<string, any>>(text: string): T | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim()) as T;
      } catch {
        // continue
      }
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Calls the Google Gemini REST API (`v1beta/models/${model}:generateContent`)
 * with deterministic `temperature: 0` and JSON Schema structured output (`responseMimeType: "application/json"`).
 * Automatically falls back from `gemini-3.8-flash` to `gemini-2.5-flash` / `gemini-2.0-flash` if the primary model is unavailable.
 */
export async function callGeminiLlm<T = Record<string, any>>(
  params: CallGeminiLlmParams
): Promise<CallGeminiLlmResult<T>> {
  const startMs = Date.now();
  const config = getGeminiConfig();
  const apiKey = (params.apiKeyOverride ?? config.apiKey).trim();
  const requestedModel =
    (params.modelOverride ?? config.model).trim() || DEFAULT_GEMINI_MODEL;
  const defaultGuardrail = createDefaultGuardrailReport();

  if (!apiKey) {
    return {
      ok: false,
      parsedJson: null,
      rawText: "",
      telemetry: {
        model: `${requestedModel} (API Key Not Configured)`,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: Date.now() - startMs,
        liveApiCalled: false,
        invokedAt: new Date().toISOString(),
        task: params.task,
        fallbackReason:
          "GEMINI_API_KEY is not set. Configure your key via [Gemini AI Key / Guardrail Status] in the top header to enable live Gemini inference.",
        guardrail: defaultGuardrail,
      },
      error: "GEMINI_API_KEY is not configured.",
    };
  }

  const candidateModels = Array.from(
    new Set([
      requestedModel,
      DEFAULT_GEMINI_MODEL,
      FALLBACK_GEMINI_MODEL,
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ])
  );

  let lastError = "Unknown Gemini API error";

  for (const modelName of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const generationConfig: Record<string, unknown> = {
        temperature: params.temperature ?? 0,
        responseMimeType: "application/json",
      };
      if (params.responseSchema) {
        generationConfig.responseSchema = params.responseSchema;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: params.systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: params.userPrompt }],
            },
          ],
          generationConfig,
        }),
      });

      const latencyMs = Math.max(1, Date.now() - startMs);
      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        const apiErrMsg =
          data?.error?.message ||
          `HTTP ${response.status} from Gemini model ${modelName}`;
        lastError = apiErrMsg;
        if (
          response.status === 404 ||
          response.status === 400 ||
          /not found|not supported/i.test(apiErrMsg)
        ) {
          continue;
        }
        return {
          ok: false,
          parsedJson: null,
          rawText: "",
          telemetry: {
            model: requestedModel,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latencyMs,
            liveApiCalled: false,
            invokedAt: new Date().toISOString(),
            task: params.task,
            fallbackReason: apiErrMsg,
            guardrail: defaultGuardrail,
          },
          error: apiErrMsg,
        };
      }

      const candidateText: string =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: any) => p?.text || "")
          .join("\n") || "";

      const usage = data?.usageMetadata || {};
      const promptTokens = Number(usage.promptTokenCount || 0);
      const completionTokens = Number(usage.candidatesTokenCount || 0);
      const totalTokens =
        Number(usage.totalTokenCount || 0) || promptTokens + completionTokens;

      const parsedJson = extractJsonFromText<T>(candidateText);

      return {
        ok: parsedJson !== null,
        parsedJson,
        rawText: candidateText,
        telemetry: {
          model: requestedModel,
          promptTokens,
          completionTokens,
          totalTokens,
          latencyMs,
          liveApiCalled: true,
          invokedAt: new Date().toISOString(),
          task: params.task,
          ...(parsedJson === null
            ? { fallbackReason: "Gemini returned non-JSON text payload" }
            : {}),
          guardrail: defaultGuardrail,
        },
        ...(parsedJson === null
          ? { error: "Failed to parse JSON from Gemini response" }
          : {}),
      };
    } catch (err: any) {
      lastError = err?.message || "Network error calling Gemini API";
    }
  }

  return {
    ok: false,
    parsedJson: null,
    rawText: "",
    telemetry: {
      model: requestedModel,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      latencyMs: Math.max(1, Date.now() - startMs),
      liveApiCalled: false,
      invokedAt: new Date().toISOString(),
      task: params.task,
      fallbackReason: lastError,
      guardrail: defaultGuardrail,
    },
    error: lastError,
  };
}

// ============================================================================
// Step 1: Gemini AI Whitepaper 5-Clause Extraction (Structured JSON Schema)
// ============================================================================
export interface GeminiExtractedClause {
  itemKey: AuditCheckItemKey;
  disclosedClaim: string;
  sourceQuote: string;
  sectionRef: string;
  structured: DisclosedClaimStructured;
}

const STEP1_EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          itemKey: { type: "STRING" },
          disclosedClaim: { type: "STRING" },
          sourceQuote: { type: "STRING" },
          sectionRef: { type: "STRING" },
          structured: {
            type: "OBJECT",
            properties: {
              maxSupply: { type: "STRING" },
              mintable: { type: "BOOLEAN" },
              transferFeeBps: { type: "INTEGER" },
              feeMutable: { type: "BOOLEAN" },
              maxTransferFeeBps: { type: "INTEGER" },
              pausable: { type: "BOOLEAN" },
              blacklistable: { type: "BOOLEAN" },
              teamWallet: { type: "STRING" },
              teamLockupActive: { type: "BOOLEAN" },
              teamLockupReleaseTimestamp: { type: "INTEGER" },
              teamLockupReleaseDateIso: { type: "STRING" },
              upgradeable: { type: "BOOLEAN" },
              governanceType: { type: "STRING" },
            },
          },
        },
        required: ["itemKey", "disclosedClaim", "sourceQuote", "sectionRef"],
      },
    },
  },
  required: ["items"],
};

export async function extractWhitepaperClaimsWithGemini(
  whitepaperText: string
): Promise<{
  ok: boolean;
  items: GeminiExtractedClause[] | null;
  telemetry: GeminiCallMetadata;
}> {
  const systemInstruction = `You are a digital asset regulatory compliance counsel and smart contract forensic auditor operating under a Zero-Hallucination Guardrail.
Analyze the provided Token Disclosure Whitepaper and extract the 5 mandatory audit items.
For each item, identify:
1. "disclosedClaim": A precise English summary of what the whitepaper promises. IMPORTANT: If a clause contains internal contradictions, legal ambiguity, or emergency caveats (e.g., Clause 1 states wallet freeze/pause is not implemented, while Clause 2 reserves a 5-of-9 Multi-Sig emergency freeze exception), explicitly highlight that ambiguity/exception in "disclosedClaim".
2. "sourceQuote": MUST BE an exact verbatim substring excerpted directly from the whitepaper text (do NOT paraphrase or invent words; Guard 1 will reject any non-verbatim quote).
3. "sectionRef": The specific Article and Clause citation (e.g., "Article 1, Clauses 1–3").
4. "structured": Normalized machine-readable parameters matching the JSON schema.`;

  const res = await callGeminiLlm<{ items?: GeminiExtractedClause[] }>({
    systemInstruction,
    userPrompt: `Extract the 5 core disclosure commitments from the following whitepaper:\n\n${whitepaperText}`,
    task: "step_1_extract",
    temperature: 0,
    responseSchema: STEP1_EXTRACTION_SCHEMA,
  });

  if (
    !res.ok ||
    !res.parsedJson ||
    !Array.isArray(res.parsedJson.items) ||
    res.parsedJson.items.length === 0
  ) {
    return {
      ok: false,
      items: null,
      telemetry: res.telemetry,
    };
  }

  const validItems: GeminiExtractedClause[] = [];
  for (const key of AUDIT_CHECK_ITEM_KEYS) {
    const found = res.parsedJson.items.find((i) => i.itemKey === key);
    if (found && found.disclosedClaim) {
      validItems.push({
        itemKey: key,
        disclosedClaim: String(found.disclosedClaim).trim(),
        sourceQuote: String(found.sourceQuote || "").trim(),
        sectionRef: String(found.sectionRef || "").trim(),
        structured:
          found.structured && typeof found.structured === "object"
            ? found.structured
            : {},
      });
    }
  }

  if (validItems.length < 5) {
    return {
      ok: false,
      items: null,
      telemetry: {
        ...res.telemetry,
        fallbackReason: `Gemini returned ${validItems.length}/5 items; supplemented with deterministic parser.`,
      },
    };
  }

  return {
    ok: true,
    items: validItems,
    telemetry: res.telemetry,
  };
}

// ============================================================================
// Step 2: Chainlink CRE + Gemini AI Discrepancy Reasoning (with 4-Layer Guardrail)
// ============================================================================
const STEP2_COMPARE_SCHEMA = {
  type: "OBJECT",
  properties: {
    rationales: {
      type: "OBJECT",
      properties: {
        maxSupplyAndMintability: { type: "STRING" },
        transferFee: { type: "STRING" },
        transferRestrictions: { type: "STRING" },
        teamLockup: { type: "STRING" },
        upgradeability: { type: "STRING" },
      },
      required: [
        "maxSupplyAndMintability",
        "transferFee",
        "transferRestrictions",
        "teamLockup",
        "upgradeability",
      ],
    },
  },
  required: ["rationales"],
};

export async function synthesizeCreComparisonRationalesWithGemini(params: {
  tokenSymbol: string;
  tokenAddress: string;
  blockNumber: number;
  whitepaperText?: string;
  items: Array<{
    itemKey: AuditCheckItemKey;
    disclosedClaim: string;
    sourceQuote: string;
    onchainState: string;
    status: AuditComparisonStatus;
    severity: string;
    defaultRationale: string;
  }>;
  breachSimulations: CounterfactualBreachSimulation[];
}): Promise<{
  rationalesByKey: Partial<Record<AuditCheckItemKey, string>>;
  telemetry: GeminiCallMetadata;
}> {
  const systemInstruction = `You are the AI Legal & Forensic Reasoning Engine inside a Chainlink Runtime Environment (CRE) workflow operating under a 4-Layer Hallucination Guardrail.
You receive:
1. The 5 whitepaper disclosure claims ("disclosedClaim" and "sourceQuote").
2. The empirical on-chain state read from the smart contract at a specific block ("onchainState").
3. The counterfactual breach simulation outcomes ("DEFENDED" vs "BREACH_SUCCEEDED").
4. The locked deterministic compliance status ("MATCH", "MISMATCH", or "NEEDS_HUMAN_REVIEW").

STRICT GUARDRAIL RULES:
- Guard 2 (Fact Lock): Never alter or contradict the deterministic status (MATCH / MISMATCH / NEEDS_HUMAN_REVIEW) or on-chain numbers (100,000,000, 100 bps, 500 bps, 1830297600, contract addresses, blockNumber).
- Guard 3 (Statute Whitelist): If referencing statutes, ONLY cite whitelisted provisions: KR VAUPA Art. 10(4)(2), DAXA Listing Standards, EU MiCA Art. 6 & 15, or US SEC CorpFin Guidance / Rule 10b-5.

For each of the 5 items, write a concise, authoritative 2-3 sentence forensic legal rationale ("rationale") in English.`;

  const userPrompt = JSON.stringify(
    {
      tokenSymbol: params.tokenSymbol,
      tokenAddress: params.tokenAddress,
      blockNumber: params.blockNumber,
      items: params.items,
      breachSimulations: params.breachSimulations.map((b) => ({
        scenarioId: b.scenarioId,
        itemKey: b.itemKey,
        outcome: b.outcome,
        targetFunction: b.targetFunction,
        beforeState: b.beforeState,
        afterState: b.afterState,
        stateDeltaSummary: b.stateDeltaSummary,
      })),
    },
    null,
    2
  );

  const res = await callGeminiLlm<{
    rationales?: Partial<Record<AuditCheckItemKey, string>>;
  }>({
    systemInstruction,
    userPrompt,
    task: "step_2_cre_compare",
    temperature: 0,
    responseSchema: STEP2_COMPARE_SCHEMA,
  });

  const guardResult = verifyAndGuardStep2Rationales({
    whitepaperText:
      params.whitepaperText ||
      params.items.map((i) => i.sourceQuote).join("\n"),
    tokenAddress: params.tokenAddress,
    blockNumber: params.blockNumber,
    items: params.items,
    geminiRationales: res.parsedJson?.rationales || {},
  });

  return {
    rationalesByKey: guardResult.verifiedRationales,
    telemetry: {
      ...res.telemetry,
      guardrail: guardResult.guardrail,
    },
  };
}

// ============================================================================
// Step 3: Gemini AI Legal Opinion, Per-Clause Counsel Notes & Cure Notice Draft
// ============================================================================
const STEP3_REVIEW_SCHEMA = {
  type: "OBJECT",
  properties: {
    overallSummary: { type: "STRING" },
    itemReviewerNotes: {
      type: "OBJECT",
      properties: {
        maxSupplyAndMintability: { type: "STRING" },
        transferFee: { type: "STRING" },
        transferRestrictions: { type: "STRING" },
        teamLockup: { type: "STRING" },
        upgradeability: { type: "STRING" },
      },
      required: [
        "maxSupplyAndMintability",
        "transferFee",
        "transferRestrictions",
        "teamLockup",
        "upgradeability",
      ],
    },
    cureNoticeText: { type: "STRING" },
  },
  required: ["overallSummary", "itemReviewerNotes", "cureNoticeText"],
};

export interface GeminiLegalReviewDraftResult {
  overallSummary: string;
  itemReviewerNotes: Record<AuditCheckItemKey, string>;
  cureNoticeText: string;
  telemetry: GeminiCallMetadata;
}

export async function generateLegalReviewDraftWithGemini(params: {
  auditCaseId: string;
  projectName: string;
  tokenSymbol: string;
  tokenAddress: string;
  chainId: number;
  chainName: string;
  snapshotBlockNumber: number;
  documentHash: string;
  reportHash: string;
  overallStatus: AuditComparisonStatus;
  whitepaperText?: string;
  checkItems: AuditCheckItemDTO[];
  breachSimulations: CounterfactualBreachSimulation[];
  lang?: "en" | "ko";
}): Promise<GeminiLegalReviewDraftResult> {
  const statuteContext = AUDIT_CHECK_ITEM_KEYS.map((key) => ({
    itemKey: key,
    statutes: LEGAL_STATUTE_MAP[key].statutes,
  }));

  const systemInstruction = `You are Senior Digital Asset Regulatory & Smart Contract Forensic Counsel advising a Digital Asset Exchange Listing Committee and Financial Regulator under a strict 4-Layer Hallucination Guardrail.
Based on the provided Chainlink CRE on-chain audit evidence, counterfactual breach simulation proofs, and tri-jurisdictional statutory mapping, generate a comprehensive legal review package in ${
    params.lang === "ko" ? "Korean (한국어)" : "English"
  }.

STRICT GUARDRAIL RULES:
- Guard 2 (Numerical & On-Chain Fact Lock): Do NOT alter any numerical fact (100,000,000, 100 bps, 500 bps, 1830297600, ${
    params.tokenAddress
  }, Block #${params.snapshotBlockNumber}) or verdict status (MATCH / MISMATCH / NEEDS_HUMAN_REVIEW).
- Guard 3 (Closed-World Statute Whitelist): Cite ONLY the whitelisted statutes provided in statutoryFramework:
  * KR: Virtual Asset User Protection Act (VAUPA) Art. 10(4)(2) & DAXA Listing Review Guidelines
  * EU: Regulation (EU) 2023/1114 (MiCA) Article 6 & Article 15 (Annex I)
  * US: SEC Division of Corporation Finance (CorpFin) Digital Asset Disclosure Guidance & Exchange Act Rule 10b-5
  Never invent or cite any other statute numbers.

Generate:
1. "overallSummary": An authoritative 2-paragraph Executive Legal Opinion.
2. "itemReviewerNotes": An object mapping all 5 itemKeys to a 2-3 sentence legal counsel review note citing the exact on-chain findings and whitelisted statutes.
3. "cureNoticeText": A formal, ready-to-issue "NOTICE OF MATERIAL DISCLOSURE-CONTRACT DISCREPANCY & DEMAND FOR CURE" addressed to ${
    params.projectName
  }.`;

  const userPrompt = JSON.stringify(
    {
      projectName: params.projectName,
      tokenSymbol: params.tokenSymbol,
      tokenAddress: params.tokenAddress,
      chainId: params.chainId,
      chainName: params.chainName,
      snapshotBlockNumber: params.snapshotBlockNumber,
      documentHash: params.documentHash,
      reportHash: params.reportHash,
      overallStatus: params.overallStatus,
      checkItems: params.checkItems.map((i) => ({
        itemKey: i.itemKey,
        titleEn: i.titleEn,
        disclosedClaim: i.disclosedClaim,
        sourceQuote: i.sourceQuote,
        sectionRef: i.sectionRef,
        onchainState: i.onchainState,
        status: i.status,
        severity: i.severity,
        rationale: i.rationale,
      })),
      breachSimulations: params.breachSimulations.map((b) => ({
        scenarioId: b.scenarioId,
        itemKey: b.itemKey,
        titleEn: b.titleEn,
        outcome: b.outcome,
        targetFunction: b.targetFunction,
        beforeState: b.beforeState,
        afterState: b.afterState,
        stateDeltaSummary: b.stateDeltaSummary,
      })),
      statutoryFramework: statuteContext,
    },
    null,
    2
  );

  const res = await callGeminiLlm<{
    overallSummary?: string;
    itemReviewerNotes?: Partial<Record<AuditCheckItemKey, string>>;
    cureNoticeText?: string;
  }>({
    systemInstruction,
    userPrompt,
    task: "step_3_legal_review",
    temperature: 0,
    responseSchema: STEP3_REVIEW_SCHEMA,
  });

  const mismatchCount = params.checkItems.filter(
    (i) => i.status === "MISMATCH"
  ).length;
  const needsReviewCount = params.checkItems.filter(
    (i) => i.status === "NEEDS_HUMAN_REVIEW"
  ).length;
  const breachSucceededCount = params.breachSimulations.filter(
    (b) => b.outcome === "BREACH_SUCCEEDED"
  ).length;

  const fallbackCureNotice = generateLegalCureNotice({
    id: params.auditCaseId,
    title: params.projectName,
    projectName: params.projectName,
    tokenSymbol: params.tokenSymbol,
    whitepaperFileName: `${params.tokenSymbol.toLowerCase()}-whitepaper.md`,
    whitepaperText: params.whitepaperText || "",
    documentHash: params.documentHash,
    tokenAddress: params.tokenAddress,
    chainId: params.chainId,
    chainName: params.chainName,
    stage: "COMPARED",
    overallStatus: params.overallStatus,
    mismatchCount,
    needsReviewCount,
    matchCount: params.checkItems.filter((i) => i.status === "MATCH").length,
    snapshotBlockNumber: params.snapshotBlockNumber,
    onchainSnapshotJson: null,
    creWorkflowRunId: null,
    reportHash: params.reportHash,
    auditRegistryAddress: null,
    anchorTxHash: null,
    anchoredAt: null,
    reviewerName: "Senior Legal Counsel, Digital Asset Compliance Desk",
    overallSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    checkItems: params.checkItems,
    breachSimulations: params.breachSimulations,
  });

  const fallbackOverallSummary =
    mismatchCount === 0 && needsReviewCount === 0
      ? `[Executive Legal & Forensic Opinion — ${params.tokenSymbol}] Cross-examination of the registered disclosure whitepaper (SHA-256: ${params.documentHash.slice(0, 18)}...) against on-chain contract ${params.tokenAddress} at Block #${params.snapshotBlockNumber} confirms 100% alignment across all 5 core governance and tokenomics clauses. All 4 counterfactual breach simulations (unauthorized minting, 50% fee hike, investor wallet freeze, and premature team token transfer) reverted at the EVM bytecode level (DEFENDED / BLOCKED_BY_CODE). The asset satisfies technical-disclosure consistency requirements under KR VAUPA Art. 10(4)(2) & DAXA Standards, EU MiCA Art. 6 & 15, and US SEC CorpFin Guidance.`
      : `[Executive Legal & Forensic Opinion — ${params.tokenSymbol} ADVERSE FINDING] Forensic audit of ${params.projectName} (${params.tokenSymbol}, ${params.tokenAddress}) at Block #${params.snapshotBlockNumber} identified ${mismatchCount} material disclosure-contract mismatch(es) (MISMATCH) and ${needsReviewCount} unverified governance exception clause(s) (NEEDS_HUMAN_REVIEW). Counterfactual EVM sandbox simulations proved that ${breachSucceededCount} of 4 adversarial breach scenarios succeeded on-chain despite explicit whitepaper assurances to the contrary. These discrepancies constitute material misrepresentations carrying severe regulatory exposure under South Korea VAUPA Art. 10(4)(2) & DAXA Guidelines, EU MiCA Art. 6 & 15, and US SEC CorpFin Guidance / Rule 10b-5. Immediate issuance of the Formal Cure Notice and smart contract remediation (or whitepaper risk redline disclosure) are required prior to listing or supervisory approval.`;

  const rawItemNotes = {} as Record<AuditCheckItemKey, string>;
  for (const key of AUDIT_CHECK_ITEM_KEYS) {
    const item = params.checkItems.find((i) => i.itemKey === key);
    const statute = LEGAL_STATUTE_MAP[key]?.statutes;
    const aiNote = res.parsedJson?.itemReviewerNotes?.[key];
    if (aiNote && String(aiNote).trim().length > 0) {
      rawItemNotes[key] = String(aiNote).trim();
    } else if (item) {
      rawItemNotes[key] =
        item.status === "MATCH"
          ? `[Counsel Verified — MATCH] On-chain state (${item.onchainState}) strictly enforces the whitepaper commitment (${item.sectionRef}). Compliant with ${statute?.KR.articleRef}, ${statute?.EU.articleRef}, and ${statute?.US.articleRef}.`
          : `[Counsel Adverse Finding — ${item.status}] ${item.rationale} Triggers material disclosure liability under KR (${statute?.KR.articleRef}), EU (${statute?.EU.articleRef}), and US (${statute?.US.articleRef}). Mandatory smart contract remediation or disclosure redline required.`;
    } else {
      rawItemNotes[key] = "";
    }
  }

  const guardResult = verifyAndGuardStep3LegalDraft({
    whitepaperText: params.whitepaperText,
    tokenAddress: params.tokenAddress,
    snapshotBlockNumber: params.snapshotBlockNumber,
    overallStatus: params.overallStatus,
    checkItems: params.checkItems,
    rawOverallSummary: res.parsedJson?.overallSummary || "",
    fallbackOverallSummary,
    rawItemNotes,
    rawCureNoticeText: res.parsedJson?.cureNoticeText || "",
    fallbackCureNoticeText: fallbackCureNotice.fullNoticeTextKo,
  });

  return {
    overallSummary: guardResult.overallSummary,
    itemReviewerNotes: guardResult.itemReviewerNotes,
    cureNoticeText: guardResult.cureNoticeText,
    telemetry: {
      ...res.telemetry,
      guardrail: guardResult.guardrail,
    },
  };
}
