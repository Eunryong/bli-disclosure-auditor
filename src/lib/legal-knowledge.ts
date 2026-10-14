import type {
  AuditCaseDTO,
  AuditCheckItemKey,
  ItemCodeRemediationSpec,
  ItemLegalStatuteMapping,
  LegalCureNoticeDraft,
} from "@/types/audit";

/**
 * 3-Jurisdiction (KR / EU / US) statutory & regulatory disclosure provisions mapped to the 5 audit items.
 */
export const LEGAL_STATUTE_MAP: Record<
  AuditCheckItemKey,
  ItemLegalStatuteMapping
> = {
  maxSupplyAndMintability: {
    itemKey: "maxSupplyAndMintability",
    titleKo: "1. 총발행량 상한 및 추가 발행(Mint) 권한",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "대한민국 (가상자산이용자보호법 · DAXA)",
        statuteTitle:
          "「가상자산 이용자 보호 등에 관한 법률」 제10조 제4항 제2호 및 DAXA 거래지원 심사 공통 가이드라인",
        articleRef: "가상자산이용자보호법 제10조 제4항 제2호 (중요사항 거짓 기재·누락 금지) / DAXA 내부통제 기준(발행량 임의 증발·무단 Mint 위험)",
        relevanceSummaryKo:
          "총발행량 상한 및 추가 발행 권한의 존재 여부는 이용자의 투자 판단에 중대한 영향을 미치는 핵심 사항으로, 백서에 '발행량 고정'을 공시하고 실제 컨트랙트에 무제한 mint() 권한을 남겨두는 행위는 중요사항의 거짓 기재 및 거래지원 적격성 결격 사유에 해당할 수 있음.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "유럽연합 (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6(1)-(2) (Fair, Clear & Not Misleading Whitepaper) & Article 15 (Civil Liability for Incomplete/Unfair Whitepaper Information) & Annex I Part D",
        relevanceSummaryKo:
          "MiCA 제6조 및 부속서 I(Annex I)는 총발행량 및 신규 발행 메커니즘을 명확하고 오해의 소지 없이 공시할 의무를 부과하며, 온체인 추가 발행(Mint) 권한을 은폐할 경우 제15조에 따라 보유자에 대한 민사상 손해배상 책임이 발생할 수 있음.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "미국 (SEC CorpFin Disclosure Guidance)",
        statuteTitle:
          "SEC Division of Corporation Finance — Statement on Crypto Asset Offerings & Smart Contract Disclosure Guidance",
        articleRef:
          "Supply Mechanics, Inflation Schedule & Privileged Minting Controls Disclosure Standard",
        relevanceSummaryKo:
          "SEC 기업금융국은 토큰 공급량 상한(Max Cap), 추가 발행 조건 및 단일 관리자에 의한 공급량 변경 권한이 스마트계약 코드로 어떻게 강제되는지 구체적으로 공시할 것을 요구함.",
      },
    },
  },

  transferFee: {
    itemKey: "transferFee",
    titleKo: "2. 전송 수수료율(bps) 및 변경 권한/상한",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "대한민국 (가상자산이용자보호법 · DAXA)",
        statuteTitle:
          "「가상자산 이용자 보호 등에 관한 법률」 제10조 제4항 제2호 및 DAXA 거래지원 심사 공통 가이드라인",
        articleRef: "가상자산이용자보호법 제10조 제4항 제2호 / DAXA 기술적 위험 심사 (과도한 수수료 부과 및 임의 수수료율 변경 함수)",
        relevanceSummaryKo:
          "공시된 수수료율(100 bps)과 달리 온체인에 높은 수수료율(500 bps)을 적용하거나 상한(Cap) 없는 수수료 변경 함수(setTransferFeeBps)를 보유한 경우, 사실상 이용자 자산 편취·매도 차단(Honeypot) 수단으로 악용될 수 있는 중요사항 불일치에 해당함.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "유럽연합 (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6(1) (Fair & Clear Disclosure of Costs/Fees) & Article 15 (Liability for Misleading Fee Structure) & Annex I Part E (Rights and Obligations)",
        relevanceSummaryKo:
          "가상자산 이전 시 부과되는 수수료 및 발행인의 일방적 조건 변경 권한은 이용자의 권리·의무에 관한 필수 공시 항목으로, 상한 없는 수수료 인상 권한 미공시는 불공정·기만적 백서 공시에 해당함.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "미국 (SEC CorpFin Disclosure Guidance)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Transaction Fee Parameters, Mutable Protocol Tax & Admin Parameter Override Disclosure",
        relevanceSummaryKo:
          "스마트계약 내 전송 세금(Transfer Tax/Fee) 파라미터와 관리자가 온체인 setter를 통해 수수료를 최대 100%까지 인상할 수 있는 권한 보유 여부는 중대한 투자 위험 요소로 명시적 공시가 요구됨.",
      },
    },
  },

  transferRestrictions: {
    itemKey: "transferRestrictions",
    titleKo: "3. 거래 일시정지(Pause) 및 지갑 동결(Blacklist) 권한",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "대한민국 (가상자산이용자보호법 · DAXA)",
        statuteTitle:
          "「가상자산 이용자 보호 등에 관한 법률」 제10조 제4항 제2호 및 DAXA 거래지원 심사 공통 가이드라인",
        articleRef: "가상자산이용자보호법 제10조 제4항 제2호 / DAXA 보안성 심사 (임의 거래정지 pause 및 특정 지갑 Blacklist 권한)",
        relevanceSummaryKo:
          "백서에서 검열 저항성 및 지갑 동결 불가(No Pause/No Blacklist)를 주장하면서 실제로는 단일 EOA가 거래 전체를 정지하거나 특정 투자자 지갑을 블랙리스트로 동결할 수 있는 경우, 이용자 재산권 처분을 침해하는 중대한 공시 불일치임.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "유럽연합 (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6(3) & Annex I Part E (Restrictions on Transferability) & Article 15 (Civil Liability for Omission of Transfer Restrictions)",
        relevanceSummaryKo:
          "MiCA는 토큰의 양도성 제한(Restrictions on free transferability) 및 발행인의 거래 중단 권한을 백서 핵심 요약 및 본문에 명시하도록 강제하며, 이를 누락·허위 기재한 경우 직접적인 규제 위반 및 손해배상 사유가 됨.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "미국 (SEC CorpFin Disclosure Guidance)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Transferability Restrictions, Emergency Circuit Breakers & Unilateral Wallet Freeze Authority",
        relevanceSummaryKo:
          "스마트계약 코드에 내장된 전송 제한(pause, blacklist) 기능과 해당 권한을 행사하는 주체(단일 개인 키 vs 다중서명·법원 명령 절차)의 실체를 정확히 공시해야 함.",
      },
    },
  },

  teamLockup: {
    itemKey: "teamLockup",
    titleKo: "4. 팀 물량 지갑 주소 및 락업 해제 시각",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "대한민국 (가상자산이용자보호법 · DAXA)",
        statuteTitle:
          "「가상자산 이용자 보호 등에 관한 법률」 제10조 제4항 제2호 및 DAXA 유통량·락업 관리 가이드라인",
        articleRef: "가상자산이용자보호법 제10조 제4항 제2호 (유통계획·락업 중요사항 거짓 기재 금지) / DAXA 유통량 계획서 및 온체인 락업 검증 기준",
        relevanceSummaryKo:
          "팀·창업자 할당 물량의 온체인 타임락(2028-01-01 해제)이 설정되어 있다고 공시했으나 실제 스마트계약에 락업 조건문이 없어 즉시 전량 매도·유출이 가능한 상태는 국내 거래지원 심사에서 가장 빈번히 문제되는 핵심 위반 유형임.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "유럽연합 (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6 & Annex I Part D (Token Allocation, Lock-up Schemes & Release Schedule) & Article 15 (Civil Liability)",
        relevanceSummaryKo:
          "발행인·창업자 보유 물량의 락업 기간 및 기술적 강제 여부는 시장 공급 충격과 직결되는 핵심 공시 사항으로, 온체인 락업 미구현 상태에서 '스마트계약 강제 락업'을 표방하는 것은 허위 공시에 해당함.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "미국 (SEC CorpFin Disclosure Guidance)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Insider/Founder Vesting Schedules, On-Chain Timelock Enforcement & Dilution Risk Disclosure",
        relevanceSummaryKo:
          "내부자·초기 팀 물량의 매도 제한(Lock-up/Vesting)이 스마트계약 코드로 강제되는지 또는 단순 오프체인 약속에 불과한지 여부를 명확히 구분하여 공시해야 함.",
      },
    },
  },

  upgradeability: {
    itemKey: "upgradeability",
    titleKo: "5. 프록시 업그레이드 가능 여부 및 관리자 권한 구조",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "대한민국 (가상자산이용자보호법 · DAXA)",
        statuteTitle:
          "「가상자산 이용자 보호 등에 관한 법률」 제10조 제4항 제2호 및 DAXA 스마트컨트랙트 거버넌스 심사 기준",
        articleRef: "가상자산이용자보호법 제10조 제4항 제2호 / DAXA 프록시 업그레이드 권한 및 단일 관리자 키(Single Point of Failure) 위험 기준",
        relevanceSummaryKo:
          "불변(Immutable) 컨트랙트 또는 타임락·멀티시그 거버넌스를 공시했으나 실제로는 단일 EOA가 즉시 로직 구현체(logicImplementation)를 교체할 수 있는 구조는 기존 감사 결과를 무력화하는 중대한 지배구조 불일치에 해당함.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "유럽연합 (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6 & Annex I Part F/G (Underlying Technology, Smart Contract Mutability & Governance Controls) & Article 15",
        relevanceSummaryKo:
          "기초 스마트계약의 사후 수정 가능성(Mutability/Upgradeability) 및 이를 통제하는 관리자 권한 집중 위험은 기술·거버넌스 리스크 공시의 핵심 의무 사항임.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "미국 (SEC CorpFin Disclosure Guidance)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Smart Contract Mutability, Proxy Admin Key Custody & Governance Centralization Disclosure",
        relevanceSummaryKo:
          "스마트계약 로직이 사후에 업그레이드될 수 있는지 여부와 단일 개인 키(EOA)가 타임락 없이 로직을 교체할 수 있는 권한 구조는 핵심 거버넌스 공시 대상임.",
      },
    },
  },
};

/**
 * Solidity Code Remediation Diffs (`- Vulnerable MismatchedToken.sol` vs `+ Compliant Defense Patch`)
 * and Whitepaper Redline recommendations for all 5 check items.
 */
export const CODE_REMEDIATION_SPECS: Record<
  AuditCheckItemKey,
  ItemCodeRemediationSpec
> = {
  maxSupplyAndMintability: {
    itemKey: "maxSupplyAndMintability",
    titleKo: "1. 총발행량 상한 및 추가 발행(Mint) 권한",
    titleEn: "Max Supply Cap & Mintability Authority",
    vulnerabilitySummaryKo:
      "MAX_SUPPLY가 type(uint256).max(무제한)로 설정되어 있고 단일 관리자(onlyOwner)가 언제든 호출 가능한 mint() 함수가 열려 있어 무단 추가 발행 공격이 실제로 성공함.",
    vulnerableContractLabel: "MismatchedToken.sol (취약 구현 - 무제한 Mint 허용)",
    remediatedContractLabel: "CompliantToken.sol (방어 패치 - 1억 개 상수 고정 & Mint 제거)",
    vulnerableSolidityCode: `uint256 public totalSupply;
uint256 public constant MAX_SUPPLY = type(uint256).max;
bool public constant mintable = true;
address public owner;

function mint(address to, uint256 amount) external onlyOwner {
    totalSupply += amount;
    balanceOf[to] += amount;
    emit Mint(to, amount);
    emit Transfer(address(0), to, amount);
}`,
    remediatedSolidityCode: `uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
uint256 public immutable totalSupply;
bool public constant mintable = false;
address public constant owner = address(0); // 권한 영구 소각

// mint() 함수 완전 제거: 생성자(constructor)에서만 1회 발행 후 추가 발행 원천 차단`,
    unifiedDiff: `--- a/contracts/MismatchedToken.sol
+++ b/contracts/CompliantToken.sol
@@ -26,11 +19,6 @@
-    uint256 public totalSupply;
-    uint256 public constant MAX_SUPPLY = type(uint256).max;
-    bool public constant mintable = true;
-    address public owner;
-
-    function mint(address to, uint256 amount) external onlyOwner {
-        totalSupply += amount;
-        balanceOf[to] += amount;
-        emit Mint(to, amount);
-    }
+    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
+    uint256 public immutable totalSupply;
+    bool public constant mintable = false;
+    address public constant owner = address(0);
+    // Privileged mint() function permanently removed`,
    whitepaperRedline: {
      disclosedClaimOriginal:
        "총발행량은 100,000,000개로 영구 고정되며 추가 발행(Mint) 기능은 존재하지 않습니다.",
      optionACodeEnforcedText:
        "[코드 패치 채택 시 유지] 총발행량은 100,000,000개로 생성자에서 1회 확정(immutable)되며, mint() 함수 제거 및 owner=address(0) 소각을 통해 추가 발행이 스마트계약 코드로 영구 차단됩니다.",
      optionBDisclosureRiskRedline:
        "[현행 컨트랙트 유지 시 정정 공시] 총발행량 초기값은 100,000,000개이나, 재단 관리자 지갑(owner EOA)이 상한 제한 없이 추가 물량을 발행(mint)할 수 있는 권한을 보유하고 있어 향후 유통량 희석 위험이 존재합니다.",
    },
  },

  transferFee: {
    itemKey: "transferFee",
    titleKo: "2. 전송 수수료율(bps) 및 변경 권한/상한",
    titleEn: "Transfer Fee Rate (bps) & Mutability Cap",
    vulnerabilitySummaryKo:
      "현재 수수료율이 공시(100 bps)의 5배인 500 bps로 배포되어 있으며, setTransferFeeBps()를 통해 최대 10,000 bps(100%)까지 기습 인상이 가능함.",
    vulnerableContractLabel: "MismatchedToken.sol (취약 구현 - 500 bps & 최대 100% 인상 가능)",
    remediatedContractLabel: "CompliantToken.sol (방어 패치 - 100 bps 상수 고정 & setter 제거)",
    vulnerableSolidityCode: `uint256 public transferFeeBps = 500; // 5.00%
uint256 public constant maxTransferFeeBps = 10_000; // 최대 100%!
bool public constant feeMutable = true;

function setTransferFeeBps(uint256 newFeeBps) external onlyOwner {
    if (newFeeBps > maxTransferFeeBps) revert FeeExceedsMax(newFeeBps);
    transferFeeBps = newFeeBps;
}`,
    remediatedSolidityCode: `uint256 public constant transferFeeBps = 100; // 1.00% 영구 고정
uint256 public constant maxTransferFeeBps = 100; // 상한 1.00%
bool public constant feeMutable = false;

// setTransferFeeBps() 함수 제거: 수수료율 사후 인상 불가능`,
    unifiedDiff: `--- a/contracts/MismatchedToken.sol
+++ b/contracts/CompliantToken.sol
@@ -33,9 +25,4 @@
-    uint256 public transferFeeBps = 500;
-    uint256 public constant maxTransferFeeBps = 10_000;
-    bool public constant feeMutable = true;
-
-    function setTransferFeeBps(uint256 newFeeBps) external onlyOwner {
-        if (newFeeBps > maxTransferFeeBps) revert FeeExceedsMax(newFeeBps);
-        transferFeeBps = newFeeBps;
-    }
+    uint256 public constant transferFeeBps = 100;
+    uint256 public constant maxTransferFeeBps = 100;
+    bool public constant feeMutable = false;
+    // Fee setter removed; transfer fee is hardcoded at 100 bps (1.00%)`,
    whitepaperRedline: {
      disclosedClaimOriginal:
        "토큰 전송 수수료는 1.00%(100 bps)로 고정되며 사후에 인상될 수 없습니다.",
      optionACodeEnforcedText:
        "[코드 패치 채택 시 유지] 토큰 전송 수수료는 스마트계약 상수(constant transferFeeBps = 100)로 영구 고정되며, 수수료 변경 함수가 존재하지 않아 사후 인상이 불가능합니다.",
      optionBDisclosureRiskRedline:
        "[현행 컨트랙트 유지 시 정정 공시] 현재 온체인 기본 전송 수수료는 5.00%(500 bps)이며, 관리자(owner)가 setTransferFeeBps()를 통해 최대 100%(10,000 bps)까지 수수료율을 변경할 수 있으므로 고율 수수료 부과 위험이 존재합니다.",
    },
  },

  transferRestrictions: {
    itemKey: "transferRestrictions",
    titleKo: "3. 거래 일시정지(Pause) 및 지갑 동결(Blacklist) 권한",
    titleEn: "Transfer Pause & Address Blacklist Controls",
    vulnerabilitySummaryKo:
      "setPaused() 및 setBlacklisted()가 단일 관리자에게 열려 있어 특정 투자자 지갑을 즉시 동결하거나 전체 전송을 중단시킬 수 있음.",
    vulnerableContractLabel: "MismatchedToken.sol (취약 구현 - 임의 Pause 및 Blacklist 동결)",
    remediatedContractLabel: "CompliantToken.sol (방어 패치 - 거래정지·블랙리스트 제거)",
    vulnerableSolidityCode: `bool public paused = false;
bool public constant pausable = true;
bool public constant blacklistable = true;
mapping(address => bool) public isBlacklisted;

function setBlacklisted(address account, bool blocked) external onlyOwner {
    isBlacklisted[account] = blocked;
}
// In _transfer():
if (paused) revert ContractPaused();
if (isBlacklisted[from] || isBlacklisted[to]) revert AddressBlacklisted(from);`,
    remediatedSolidityCode: `bool public constant paused = false;
bool public constant pausable = false;
bool public constant blacklistable = false;

function isBlacklisted(address) external pure returns (bool) {
    return false;
}
// _transfer() 내 인위적 거래정지·지갑동결 조건문 완전 배제`,
    unifiedDiff: `--- a/contracts/MismatchedToken.sol
+++ b/contracts/CompliantToken.sol
@@ -39,10 +31,4 @@
-    bool public paused = false;
-    bool public constant pausable = true;
-    bool public constant blacklistable = true;
-    mapping(address => bool) public isBlacklisted;
-    function setBlacklisted(address account, bool blocked) external onlyOwner {
-        isBlacklisted[account] = blocked;
-    }
+    bool public constant paused = false;
+    bool public constant pausable = false;
+    bool public constant blacklistable = false;
+    // Unilateral pause & address freeze controls removed`,
    whitepaperRedline: {
      disclosedClaimOriginal:
        "누구도 임의로 거래를 정지(Pause)하거나 특정 지갑을 동결(Blacklist)할 수 없습니다.",
      optionACodeEnforcedText:
        "[코드 패치 채택 시 유지] 스마트계약에 setPaused 및 setBlacklisted 함수가 존재하지 않으며(pausable=false, blacklistable=false), 제3자의 개입 없이 자유로운 토큰 이전이 보장됩니다.",
      optionBDisclosureRiskRedline:
        "[현행 컨트랙트 유지 시 정정 공시] 관리자(owner EOA)는 긴급 상황 또는 규제 준수 목적으로 전체 거래를 일시정지(setPaused)하거나 특정 지갑 주소를 동결(setBlacklisted)하여 자산 이전을 제한할 수 있는 권한을 보유합니다.",
    },
  },

  teamLockup: {
    itemKey: "teamLockup",
    titleKo: "4. 팀 물량 지갑 주소 및 락업 해제 시각",
    titleEn: "Team Allocation Wallet & Lockup Release Timestamp",
    vulnerabilitySummaryKo:
      "teamLockupActive = false, teamLockupReleaseTimestamp = 0으로 배포되었고 _transfer()에 타임락 검증 코드가 없어 팀 물량 2,000만 개가 즉시 외부로 유출 가능함.",
    vulnerableContractLabel: "MismatchedToken.sol (취약 구현 - 온체인 타임락 검증 누락)",
    remediatedContractLabel: "CompliantToken.sol (방어 패치 - 2028-01-01 타임락 강제 적용)",
    vulnerableSolidityCode: `address public teamWallet;
uint256 public constant teamAllocation = 20_000_000 * 10 ** 18;
bool public teamLockupActive = false;
uint256 public teamLockupReleaseTimestamp = 0;

function _transfer(address from, address to, uint256 amount) internal {
    // NOTE: 팀 지갑 락업 해제일 검증 코드가 전혀 없음!
    uint256 fromBalance = balanceOf[from];
    ...
}`,
    remediatedSolidityCode: `address public immutable teamWallet;
uint256 public constant teamAllocation = 20_000_000 * 10 ** 18;
bool public constant teamLockupActive = true;
uint256 public constant teamLockupReleaseTimestamp = 1830297600; // 2028-01-01 UTC

function _transfer(address from, address to, uint256 amount) internal {
    if (from == teamWallet && block.timestamp < teamLockupReleaseTimestamp) {
        revert TeamTokensLockedUntilRelease(teamLockupReleaseTimestamp, block.timestamp);
    }
    ...
}`,
    unifiedDiff: `--- a/contracts/MismatchedToken.sol
+++ b/contracts/CompliantToken.sol
@@ -47,2 +38,2 @@
-    bool public teamLockupActive = false;
-    uint256 public teamLockupReleaseTimestamp = 0;
+    bool public constant teamLockupActive = true;
+    uint256 public constant teamLockupReleaseTimestamp = 1830297600; // 2028-01-01T00:00:00Z
@@ -161,1 +108,3 @@
-    // NOTE: No team lockup check exists here!
+    if (from == teamWallet && block.timestamp < teamLockupReleaseTimestamp) {
+        revert TeamTokensLockedUntilRelease(teamLockupReleaseTimestamp, block.timestamp);
+    }`,
    whitepaperRedline: {
      disclosedClaimOriginal:
        "팀 할당 물량 20,000,000개는 스마트계약 타임락에 의해 2028년 1월 1일 00:00:00 UTC까지 온체인에서 강제 동결됩니다.",
      optionACodeEnforcedText:
        "[코드 패치 채택 시 유지] 팀 할당 지갑(teamWallet) 물량 20,000,000개는 _transfer() 내부 타임락 조건문(block.timestamp < 1830297600)에 의해 2028-01-01 00:00:00 UTC 이전에는 온체인 출금이 원천 차단됩니다.",
      optionBDisclosureRiskRedline:
        "[현행 컨트랙트 유지 시 정정 공시] 팀 할당 물량 20,000,000개는 현재 토큰 스마트계약 내부의 타임락 코드로 동결되어 있지 않으며(teamLockupActive=false), 별도 커스터디 계약 또는 오프체인 내부통제에 의해서만 관리됩니다.",
    },
  },

  upgradeability: {
    itemKey: "upgradeability",
    titleKo: "5. 프록시 업그레이드 가능 여부 및 관리자 권한 구조",
    titleEn: "Proxy Upgradeability & Admin Governance Structure",
    vulnerabilitySummaryKo:
      "upgradeable = true 상태에서 단일 EOA(adminAddress)가 타임락이나 멀티시그 없이 setLogicImplementation()으로 컨트랙트 구현 주소를 즉시 교체할 수 있음.",
    vulnerableContractLabel: "MismatchedToken.sol (취약 구현 - 단일 EOA 임의 로직 교체)",
    remediatedContractLabel: "CompliantToken.sol (방어 패치 - 비업그레이드 불변 구조)",
    vulnerableSolidityCode: `bool public constant upgradeable = true;
address public adminAddress;
address public logicImplementation;

function setLogicImplementation(address newImplementation) external onlyOwner {
    implementationAddress = newImplementation;
    logicImplementation = newImplementation;
    emit ImplementationUpgraded(newImplementation);
}`,
    remediatedSolidityCode: `bool public constant upgradeable = false;
address public constant adminAddress = address(0);
address public constant logicImplementation = address(0);

// setLogicImplementation() 제거: 배포 후 로직 임의 변조 불가 (Immutable)`,
    unifiedDiff: `--- a/contracts/MismatchedToken.sol
+++ b/contracts/CompliantToken.sol
@@ -51,9 +42,4 @@
-    bool public constant upgradeable = true;
-    address public adminAddress;
-    address public logicImplementation;
-    function setLogicImplementation(address newImplementation) external onlyOwner {
-        logicImplementation = newImplementation;
-    }
+    bool public constant upgradeable = false;
+    address public constant adminAddress = address(0);
+    address public constant logicImplementation = address(0);
+    // Unilateral logic upgrade setter removed`,
    whitepaperRedline: {
      disclosedClaimOriginal:
        "본 컨트랙트는 프록시 업그레이드가 불가능한 불변(Immutable) 구조이며 단일 관리자 키가 존재하지 않습니다.",
      optionACodeEnforcedText:
        "[코드 패치 채택 시 유지] 본 컨트랙트는 프록시 위임이나 구현체 변경 함수가 없는 비업그레이드(upgradeable=false, adminAddress=address(0)) 불변 구조로 배포되었습니다.",
      optionBDisclosureRiskRedline:
        "[현행 컨트랙트 유지 시 정정 공시] 본 컨트랙트는 업그레이드 가능(upgradeable=true) 구조로 설계되어 있으며, 현재 단일 관리자 지갑(adminAddress EOA)이 로직 구현체를 변경할 수 있는 권한을 보유하고 있습니다.",
    },
  },
};

/**
 * Generates an authoritative, formal Legal Cure & Explanation Demand Notice draft
 * citing exact on-chain facts, counterfactual breach simulation outcomes, and 3-jurisdiction statutes.
 */
export function generateLegalCureNotice(
  auditCase: AuditCaseDTO
): LegalCureNoticeDraft {
  const items = auditCase.checkItems || [];
  const mismatchedItems = items.filter(
    (i) => i.status === "MISMATCH" || i.status === "NEEDS_HUMAN_REVIEW"
  );
  const simulations =
    auditCase.breachSimulations ||
    auditCase.creWorkflowTrace?.breachSimulations ||
    [];
  const breachSucceededSims = simulations.filter(
    (s) => s.outcome === "BREACH_SUCCEEDED"
  );

  const issuedDateIso = new Date().toISOString().slice(0, 10);
  const docNumber = `BLI-CURE-${issuedDateIso.replace(/-/g, "")}-${auditCase.tokenSymbol.toUpperCase()}`;
  const isCompliant =
    mismatchedItems.length === 0 && breachSucceededSims.length === 0;

  const subjectLineKo = isCompliant
    ? `[적격 확인 통지] ${auditCase.projectName} (${auditCase.tokenSymbol}) 공시 백서 및 스마트계약 정합성 검증 완료 통지서`
    : `[시정 및 소명 요구] ${auditCase.projectName} (${auditCase.tokenSymbol}) 백서 공시 주장 vs. 온체인 스마트계약 불일치(${mismatchedItems.length}건)에 대한 시정요구서 (Legal Cure & Explanation Demand Notice)`;

  const itemFindingsText =
    mismatchedItems.length > 0
      ? mismatchedItems
          .map((item, idx) => {
            const statute = LEGAL_STATUTE_MAP[item.itemKey];
            const rem = CODE_REMEDIATION_SPECS[item.itemKey];
            return [
              `  ${idx + 1}) [${item.titleKo}] — 판정: ${item.status} (심각도: ${item.severity})`,
              `     • 백서 공시 주장 (${item.sectionRef}): "${item.disclosedClaim}"`,
              `     • 온체인 실제 상태 (${item.evidenceFunctionOrSlot}): ${item.onchainState}`,
              `     • 불일치 판단 근거: ${item.rationale}`,
              `     • 관련 법령 기준:`,
              `       - [KR] ${statute.statutes.KR.articleRef}`,
              `       - [EU] ${statute.statutes.EU.articleRef}`,
              `       - [US] ${statute.statutes.US.articleRef}`,
              `     • 권고 시정 조치:`,
              `       - (방안 A - 스마트계약 패치) ${rem.whitepaperRedline.optionACodeEnforcedText}`,
              `       - (방안 B - 백서 정정 공시) ${rem.whitepaperRedline.optionBDisclosureRiskRedline}`,
            ].join("\n");
          })
          .join("\n\n")
      : "  • 5대 핵심 점검 항목 전체에서 백서 공시 주장과 온체인 스마트계약 설정이 100% 일치함(MATCH)이 확인되었습니다.";

  const breachProofText =
    simulations.length > 0
      ? simulations
          .map((sim) => {
            return [
              `  • ${sim.titleKo}: [${sim.badgeText}]`,
              `    - 실행 함수 / Calldata: ${sim.targetFunction} (${sim.calldata.slice(0, 26)}...) | Gas: ${sim.gasUsed}`,
              `    - 실행 전후 상태 변화: ${sim.beforeState}  ==>  ${sim.afterState}`,
              `    - 기술·법무적 함의: ${sim.stateDeltaSummary}`,
            ].join("\n");
          })
          .join("\n")
      : "  • 실행된 온체인 행위 재현 시뮬레이션 내역이 없습니다.";

  const fullNoticeTextKo = [
    `================================================================================`,
    `문서번호: ${docNumber}`,
    `발 신 일: ${issuedDateIso}`,
    `수 신 인: ${auditCase.projectName} 발행 재단 대표이사 및 법무·기술 총괄 책임자 귀하`,
    `발 신 인: 가상자산 공시·스마트계약 정합성 점검 위원회 (법무·컴플라이언스 검토역: ${auditCase.reviewerName || "Compliance Officer"})`,
    `제    목: ${subjectLineKo}`,
    `================================================================================`,
    ``,
    `1. 점검 개요 및 대상 식별 정보`,
    `  • 대상 프로젝트 / 심볼 : ${auditCase.projectName} (${auditCase.tokenSymbol})`,
    `  • 대상 체인 / 컨트랙트 : ${auditCase.chainName} (Chain ID: ${auditCase.chainId}) / ${auditCase.tokenAddress}`,
    `  • 기준 블록 번호       : Block #${auditCase.snapshotBlockNumber ?? "-"}`,
    `  • 공시 백서 원문 해시  : ${auditCase.documentHash}`,
    `  • 감사 리포트 해시     : ${auditCase.reportHash || "앵커링 확정 시 생성"}`,
    `  • 종합 정합성 판정     : ${auditCase.overallStatus} (일치 ${auditCase.matchCount}건 / 불일치 ${auditCase.mismatchCount}건 / 추가검토 ${auditCase.needsReviewCount}건)`,
    ``,
    `2. 항목별 공시 vs. 온체인 정합성 점검 결과 및 적용 법령`,
    itemFindingsText,
    ``,
    `3. 온체인 공시 위반 행위 재현 시뮬레이션(Counterfactual Breach Simulation) 입증 결과`,
    `   (EVM 샌드박스 복제 상태에서 백서 약속 위반 트랜잭션을 실제 실행한 기술적 증거)`,
    breachProofText,
    ``,
    `4. 법무 시정 및 소명 요구 사항 (Action Required)`,
    isCompliant
      ? `  • 본 점검 대상(${auditCase.tokenSymbol})은 5대 핵심 공시 항목 및 4대 위반 행위 재현 시뮬레이션 전 과정에서 백서 공시 약속이 스마트계약 바이트코드로 엄격히 강제되고 있음이 확인되었습니다.`
      : [
          `  귀 재단이 배포한 스마트계약(${auditCase.tokenAddress})은 공시 백서(${auditCase.whitepaperFileName})의 핵심 약정과 중대한 사실적 불일치(${mismatchedItems.length}건)를 포함하고 있으며, 샌드박스 행위 재현 결과 ${breachSucceededSims.length}건의 백서 위반 행위가 코드 제지 없이 실제 성공함이 입증되었습니다.`,
          `  이에 「가상자산 이용자 보호 등에 관한 법률」 제10조 제4항 제2호, EU MiCA Regulation 제6조·제15조 및 DAXA 거래지원 심사 기준에 의거하여 본 통지서 수령일로부터 7영업일 이내에 다음 중 하나의 조치를 이행하고 증빙을 제출할 것을 요구합니다:`,
          `  (1) [기술적 시정] 첨부된 Solidity 방어 패치(Remediation Diff)를 반영하여 무제한 발행·수수료 임의 인상·지갑 동결 권한을 제거하고 온체인 팀 락업(2028-01-01)을 강제한 신규 컨트랙트를 배포하거나 관리자 권한을 타임락/소각 주소로 이전할 것.`,
          `  (2) [공시 정정] 현행 스마트계약 구조를 유지해야 할 불가피한 사유가 있는 경우, 첨부된 백서 정정 문안(Redline Option B)에 따라 관리자 권한 범위와 이용자 위험을 백서 전면에 즉시 정정 공시할 것.`,
        ].join("\n"),
    ``,
    `※ 법적 고지 (Disclaimer): 본 문서는 공시자료의 주장과 온체인 스마트계약 상태 간의 사실적 정합성 대조 결과를 바탕으로 법무·컴플라이언스 담당자의 시정 요구 업무를 지원하기 위해 생성된 기술 증빙 기반 초안이며, 그 자체로 최종 사법 판결이나 법률 자문을 대체하지 않습니다.`,
  ].join("\n");

  return {
    documentNumber: docNumber,
    issuedDateIso,
    recipientProject: auditCase.projectName,
    tokenSymbol: auditCase.tokenSymbol,
    tokenAddress: auditCase.tokenAddress,
    chainId: auditCase.chainId,
    chainName: auditCase.chainName,
    snapshotBlockNumber: auditCase.snapshotBlockNumber ?? 0,
    documentHash: auditCase.documentHash,
    reportHash: auditCase.reportHash || "PENDING_ANCHOR",
    overallStatus: auditCase.overallStatus,
    mismatchCount: auditCase.mismatchCount,
    needsReviewCount: auditCase.needsReviewCount,
    breachSucceededCount: breachSucceededSims.length,
    subjectLineKo,
    fullNoticeTextKo,
  };
}
