/**
 * Common domain types for the Disclosure vs. Smart Contract Mismatch Auditor
 * (BLI Legal Tech Hackathon 2 — LegalTech & RegTech / Chainlink CRE Bounty)
 */

export type AuditStage =
  | "CREATED"
  | "EXTRACTED"
  | "COMPARED"
  | "REVIEWED"
  | "ANCHORED";

export type AuditComparisonStatus =
  | "PENDING"
  | "MATCH"
  | "MISMATCH"
  | "NEEDS_HUMAN_REVIEW";

export type AuditSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * The 5 mandatory comparison dimensions between disclosure whitepaper and on-chain state.
 */
export type AuditCheckItemKey =
  | "maxSupplyAndMintability"
  | "transferFee"
  | "transferRestrictions"
  | "teamLockup"
  | "upgradeability";

export const AUDIT_CHECK_ITEM_KEYS: readonly AuditCheckItemKey[] = [
  "maxSupplyAndMintability",
  "transferFee",
  "transferRestrictions",
  "teamLockup",
  "upgradeability",
] as const;

export interface AuditCheckItemMetadata {
  key: AuditCheckItemKey;
  order: number;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  defaultEvidenceFunctions: string;
}

export const AUDIT_CHECK_ITEM_METADATA: Record<
  AuditCheckItemKey,
  AuditCheckItemMetadata
> = {
  maxSupplyAndMintability: {
    key: "maxSupplyAndMintability",
    order: 1,
    titleKo: "1. 총발행량 상한 및 추가 발행(Mint) 권한",
    titleEn: "Max Supply Cap & Mintability Authority",
    descriptionKo:
      "백서에 공시된 총발행량 상한(Fixed Cap)과 실제 컨트랙트의 totalSupply, maxSupply 및 mint() 호출 가능 권한 존재 여부를 대조합니다.",
    defaultEvidenceFunctions: "totalSupply(), maxSupply(), mintable(), owner()",
  },
  transferFee: {
    key: "transferFee",
    order: 2,
    titleKo: "2. 전송 수수료율(bps) 및 변경 권한/상한",
    titleEn: "Transfer Fee Rate (bps) & Mutability Cap",
    descriptionKo:
      "백서에 기재된 토큰 전송 수수료율(bps)과 수수료 변경 가능 여부·상한선(Max Fee Cap)을 온체인 상태변수 및 setter 함수와 대조합니다.",
    defaultEvidenceFunctions:
      "transferFeeBps(), maxTransferFeeBps(), feeMutable()",
  },
  transferRestrictions: {
    key: "transferRestrictions",
    order: 3,
    titleKo: "3. 거래 일시정지(Pause) 및 지갑 동결(Blacklist) 권한",
    titleEn: "Transfer Pause & Address Blacklist Controls",
    descriptionKo:
      "거래 일시정지(pause) 및 특정 주소 자산 동결(blacklist) 기능의 존재 여부와 해당 권한의 행사 주체(단일 EOA vs 멀티시그)를 확인합니다.",
    defaultEvidenceFunctions:
      "paused(), pausable(), blacklistable(), owner()",
  },
  teamLockup: {
    key: "teamLockup",
    order: 4,
    titleKo: "4. 팀 물량 지갑 주소 및 락업 해제 시각",
    titleEn: "Team Allocation Wallet & Lockup Release Timestamp",
    descriptionKo:
      "공시된 팀/창업자 할당 물량의 락업 적용 여부, 락업 지갑 주소, 온체인 타임락 해제 시각(teamLockupReleaseTimestamp)을 검증합니다.",
    defaultEvidenceFunctions:
      "teamWallet(), teamLockupActive(), teamLockupReleaseTimestamp()",
  },
  upgradeability: {
    key: "upgradeability",
    order: 5,
    titleKo: "5. 프록시 업그레이드 가능 여부 및 관리자 권한 구조",
    titleEn: "Proxy Upgradeability & Admin Governance Structure",
    descriptionKo:
      "컨트랙트 로직 임의 변경(Proxy Upgradeability / EIP-1967 슬롯) 가능 여부와 관리자 권한(Renounced / Timelock / 단일 EOA) 구조를 점검합니다.",
    defaultEvidenceFunctions:
      "upgradeable(), adminAddress(), EIP-1967 Implementation Slot (0x3608...)",
  },
};

export interface DisclosedClaimStructured {
  maxSupply?: string;
  mintable?: boolean;
  transferFeeBps?: number;
  feeMutable?: boolean;
  maxTransferFeeBps?: number;
  pausable?: boolean;
  blacklistable?: boolean;
  teamWallet?: string;
  teamLockupActive?: boolean;
  teamLockupReleaseTimestamp?: number;
  teamLockupReleaseDateIso?: string;
  upgradeable?: boolean;
  governanceType?: string;
  [key: string]: unknown;
}

export interface OnchainStateStructured {
  totalSupply?: string;
  maxSupply?: string;
  mintable?: boolean;
  ownerAddress?: string;
  transferFeeBps?: number;
  maxTransferFeeBps?: number;
  feeMutable?: boolean;
  paused?: boolean;
  pausable?: boolean;
  blacklistable?: boolean;
  teamWallet?: string;
  teamLockupActive?: boolean;
  teamLockupReleaseTimestamp?: number;
  upgradeable?: boolean;
  adminAddress?: string;
  eip1967Implementation?: string;
  blockNumber?: number;
  [key: string]: unknown;
}

export interface AuditCheckItemDTO {
  id: string;
  auditCaseId: string;
  itemKey: AuditCheckItemKey;
  displayOrder: number;
  titleKo: string;
  titleEn: string;
  // Disclosed Claim
  disclosedClaim: string;
  sourceQuote: string;
  sectionRef: string;
  disclosedDataJson: string | null;
  // On-Chain Fact
  onchainState: string;
  evidenceFunctionOrSlot: string;
  onchainDataJson: string | null;
  // Comparison Result
  status: AuditComparisonStatus;
  severity: AuditSeverity;
  rationale: string;
  // Human Review
  reviewerNote: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnchainAnchorVerification {
  verified: boolean;
  auditRegistryAddress: string;
  anchorTxHash: string;
  blockNumber: number;
  anchoredAtTimestamp: number;
  auditor: string;
  documentHash: string;
  tokenAddress: string;
  chainId: number;
  mismatchCount: number;
  reportHash: string;
  recordAuditCalldata?: string;
  verifyAnchorCalldata?: string;
  verifyAnchorRawResult?: string;
}

export interface CreWorkflowStepTrace {
  stepNumber: 1 | 2 | 3 | 4;
  stepId:
    | "step_1_offchain_disclosure_fetch"
    | "step_2_onchain_evm_read"
    | "step_3_don_consensus_eval"
    | "step_4_audit_registry_write";
  title: string;
  capability: string;
  status: "SUCCESS" | "ERROR";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  summary: string;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
}

export interface CreDonConsensusOutput {
  donId: string;
  protocol: string;
  nodeCount: number;
  quorumRequired: number;
  quorumReached: number;
  consensusDigest: string;
  reportHash: string;
  nodeSignatures: Array<{
    nodeId: string;
    operator: string;
    signerAddress: string;
    observationHash: string;
    signature: string;
  }>;
}

export type BreachSimulationOutcome = "DEFENDED" | "BREACH_SUCCEEDED";

export interface CounterfactualBreachSimulation {
  scenarioId:
    | "breach_1_unauthorized_mint"
    | "breach_2_fee_hike_50pct"
    | "breach_3_investor_wallet_freeze"
    | "breach_4_premature_team_dump";
  order: 1 | 2 | 3 | 4;
  itemKey: AuditCheckItemKey;
  titleKo: string;
  titleEn: string;
  whitepaperPromiseKo: string;
  adversarialActionKo: string;
  callerAddress: string;
  callerRole: string;
  targetFunction: string;
  calldata: string;
  secondaryCalldata?: string;
  outcome: BreachSimulationOutcome;
  badgeText: "DEFENDED / BLOCKED_BY_CODE" | "BREACH_SUCCEEDED";
  txReverted: boolean;
  revertReason: string | null;
  returnDataHex: string;
  gasUsed: string;
  beforeState: string;
  afterState: string;
  stateDeltaSummary: string;
  legalImpactKo: string;
}

export interface JurisdictionStatuteCitation {
  jurisdiction: "KR" | "EU" | "US";
  flag: string;
  jurisdictionLabelKo: string;
  statuteTitle: string;
  articleRef: string;
  relevanceSummaryKo: string;
}

export interface ItemLegalStatuteMapping {
  itemKey: AuditCheckItemKey;
  titleKo: string;
  statutes: {
    KR: JurisdictionStatuteCitation;
    EU: JurisdictionStatuteCitation;
    US: JurisdictionStatuteCitation;
  };
}

export interface ItemCodeRemediationSpec {
  itemKey: AuditCheckItemKey;
  titleKo: string;
  titleEn: string;
  vulnerabilitySummaryKo: string;
  vulnerableContractLabel: string;
  remediatedContractLabel: string;
  vulnerableSolidityCode: string;
  remediatedSolidityCode: string;
  unifiedDiff: string;
  whitepaperRedline: {
    disclosedClaimOriginal: string;
    optionACodeEnforcedText: string;
    optionBDisclosureRiskRedline: string;
  };
}

export interface LegalCureNoticeDraft {
  documentNumber: string;
  issuedDateIso: string;
  recipientProject: string;
  tokenSymbol: string;
  tokenAddress: string;
  chainId: number;
  chainName: string;
  snapshotBlockNumber: number;
  documentHash: string;
  reportHash: string;
  overallStatus: AuditComparisonStatus;
  mismatchCount: number;
  needsReviewCount: number;
  breachSucceededCount: number;
  subjectLineKo: string;
  fullNoticeTextKo: string;
}

export interface HallucinationGuardrailReport {
  passed: boolean;
  badgeText: string;
  quoteGrounded: boolean;
  factsLocked: boolean;
  statutesWhitelisted: boolean;
  humanGateEnforced: boolean;
  signoffStatus: "AI_DRAFT_VERIFIED" | "COUNSEL_ANCHORED";
  verifiedAt: string;
  guards: {
    guard1QuoteGrounding: {
      passed: boolean;
      checkedQuotesCount: number;
      exactMatchedCount: number;
      restoredExactSpanCount: number;
      detail: string;
    };
    guard2FactLock: {
      passed: boolean;
      lockedParametersCount: number;
      overriddenDriftCount: number;
      lockedAnchors: string[];
      detail: string;
    };
    guard3StatuteWhitelist: {
      passed: boolean;
      whitelistedStatutesCount: number;
      blockedFabricatedCitationsCount: number;
      allowedStatutes: string[];
      detail: string;
    };
    guard4HumanSignoffGate: {
      passed: boolean;
      signoffStatus: "AI_DRAFT_VERIFIED" | "COUNSEL_ANCHORED";
      requiresCounselApprovalBeforeAnchor: boolean;
      detail: string;
    };
  };
}

export interface GeminiCallMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  liveApiCalled: boolean;
  invokedAt?: string;
  task?:
    | "step_1_extract"
    | "step_2_cre_compare"
    | "step_3_legal_review"
    | "connection_test";
  fallbackReason?: string;
  fallbackNote?: string;
  guardrail?: HallucinationGuardrailReport;
}

export interface CreWorkflowExecutionTrace {
  workflowRunId: string;
  workflowName: string;
  workflowVersion: string;
  manifestPath: string;
  cliBinaryDetected: boolean;
  runtimeEngine: "chainlink-cre-cli" | "chainlink-cre-local-simulator";
  auditCaseId: string;
  tokenSymbol: string;
  tokenAddress: string;
  chainId: number;
  chainName: string;
  snapshotBlockNumber: number;
  documentHash: string;
  overallStatus: AuditComparisonStatus;
  counts: {
    matchCount: number;
    mismatchCount: number;
    needsReviewCount: number;
  };
  consensus: CreDonConsensusOutput;
  auditRegistryPayload: {
    auditRegistryAddress: string;
    functionSignature: string;
    recordAuditCalldata: string;
    verifyAnchorCalldata: string;
    reportHash: string;
  };
  breachSimulations?: CounterfactualBreachSimulation[];
  geminiTelemetry?: {
    step1?: GeminiCallMetadata;
    step3?: GeminiCallMetadata;
  };
  totalDurationMs: number;
  executedAt: string;
  steps: CreWorkflowStepTrace[];
}

export interface AuditCaseDTO {
  id: string;
  title: string;
  projectName: string;
  tokenSymbol: string;
  whitepaperFileName: string;
  whitepaperText: string;
  documentHash: string;
  tokenAddress: string;
  chainId: number;
  chainName: string;
  stage: AuditStage;
  snapshotBlockNumber: number | null;
  onchainSnapshotJson: string | null;
  creWorkflowRunId: string | null;
  creWorkflowTrace?: CreWorkflowExecutionTrace | null;
  breachSimulations?: CounterfactualBreachSimulation[] | null;
  geminiTelemetry?: {
    extract?: GeminiCallMetadata;
    compare?: GeminiCallMetadata;
    review?: GeminiCallMetadata;
  } | null;
  aiCureNoticeText?: string | null;
  mismatchCount: number;
  needsReviewCount: number;
  matchCount: number;
  overallStatus: AuditComparisonStatus;
  overallSummary: string | null;
  reviewerName: string | null;
  reportHash: string | null;
  auditRegistryAddress: string | null;
  anchorTxHash: string | null;
  anchoredAt: string | null;
  anchorVerification?: OnchainAnchorVerification | null;
  createdAt: string;
  updatedAt: string;
  checkItems?: AuditCheckItemDTO[];
}

export interface CreateAuditCaseInput {
  title: string;
  projectName: string;
  tokenSymbol?: string;
  whitepaperFileName: string;
  whitepaperText: string;
  tokenAddress: string;
  chainId: number;
  chainName?: string;
}

export interface UpdateExtractedItemInput {
  itemKey: AuditCheckItemKey;
  disclosedClaim: string;
  sourceQuote: string;
  sectionRef: string;
  disclosedDataJson?: string | null;
}

export interface UpdateReviewItemInput {
  itemKey: AuditCheckItemKey;
  status: AuditComparisonStatus;
  reviewerNote: string;
}

export interface WorkflowStepDefinition {
  stepNumber: number;
  key: "list" | "new" | "extract" | "compare" | "review";
  labelKo: string;
  labelEn: string;
  hrefPattern: string;
  description: string;
}

export const AUDIT_CASE_STEP_DEFINITIONS: readonly WorkflowStepDefinition[] = [
  {
    stepNumber: 1,
    key: "new",
    labelKo: "1. 백서·컨트랙트 등록",
    labelEn: "1. Register Disclosure & Contract",
    hrefPattern: "/audits/new",
    description: "공시 백서 원문(SHA-256) 및 대상 스마트계약 주소 등록",
  },
  {
    stepNumber: 2,
    key: "extract",
    labelKo: "2. 5대 핵심 항목 추출/검증",
    labelEn: "2. Extract 5 Core Claims",
    hrefPattern: "/audits/[id]/extract",
    description: "백서 원문에서 5대 핵심 공시 주장 및 근거 문구 추출·보정",
  },
  {
    stepNumber: 3,
    key: "compare",
    labelKo: "3. Chainlink CRE 온체인 대조",
    labelEn: "3. Chainlink CRE On-chain Compare",
    hrefPattern: "/audits/[id]/compare",
    description: "Chainlink CRE 워크플로 실행 및 백서 주장 vs 온체인 Fact 1:1 대조",
  },
  {
    stepNumber: 4,
    key: "review",
    labelKo: "4. 법무 검토 및 온체인 앵커링",
    labelEn: "4. Legal Review & Hash Anchoring",
    hrefPattern: "/audits/[id]/review",
    description: "컴플라이언스 담당자 의견 확정, AuditRegistry 해시 앵커링 및 리포트 반출",
  },
] as const;
