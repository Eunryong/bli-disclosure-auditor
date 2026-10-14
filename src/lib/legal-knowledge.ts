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
    titleKo: "1. Max Supply Cap & Mintability Authority",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "South Korea (VAUPA · DAXA Listing Standards)",
        statuteTitle:
          "Virtual Asset User Protection Act (VAUPA) Art. 10(4)(2) & DAXA Joint Listing Review Guidelines",
        articleRef:
          "VAUPA Art. 10(4)(2) (Prohibition of Material Misrepresentation/Omission) / DAXA Supply Control Standard (Unbacked Minting Risk)",
        relevanceSummaryKo:
          "Whether token supply is permanently capped or subject to discretionary minting is a material fact governing investor valuation. Disclosing a 'fixed supply' while retaining an unrenounced, uncapped mint() function constitutes a material misrepresentation and a disqualifying defect under DAXA listing review.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "European Union (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6(1)-(2) (Fair, Clear & Not Misleading Whitepaper) & Article 15 (Civil Liability for Incomplete/Misleading Whitepaper) & Annex I Part D",
        relevanceSummaryKo:
          "MiCA Article 6 and Annex I mandate accurate, non-misleading disclosure of total supply and issuance mechanics. Concealing on-chain minting privileges triggers statutory civil liability to token holders under Article 15.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "United States (SEC CorpFin & Howey Framework)",
        statuteTitle:
          "SEC Division of Corporation Finance — Crypto Asset Offering & Smart Contract Disclosure Guidance",
        articleRef:
          "Supply Mechanics, Inflation Schedule & Privileged Minting Controls Disclosure Standard",
        relevanceSummaryKo:
          "SEC Corporation Finance requires explicit disclosure of maximum supply caps, inflation mechanics, and whether a single administrative key retains authority to dilute token holders via smart contract minting.",
      },
    },
  },

  transferFee: {
    itemKey: "transferFee",
    titleKo: "2. Transfer Fee Rate (bps) & Mutability Cap",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "South Korea (VAUPA · DAXA Listing Standards)",
        statuteTitle:
          "Virtual Asset User Protection Act (VAUPA) Art. 10(4)(2) & DAXA Technical Security Guidelines",
        articleRef:
          "VAUPA Art. 10(4)(2) / DAXA Technical Risk Review (Predatory Fee Extraction & Uncapped Fee Setter)",
        relevanceSummaryKo:
          "Deploying a 500 bps (5.00%) fee when 100 bps (1.00%) was disclosed—coupled with an uncapped setTransferFeeBps() setter allowing up to 10,000 bps (100% confiscation)—creates a severe honeypot/extraction risk and material disclosure breach.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "European Union (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6(1) (Fair & Clear Disclosure of Costs/Fees) & Article 15 (Civil Liability) & Annex I Part E (Rights and Obligations)",
        relevanceSummaryKo:
          "Transfer fees and any unilateral issuer right to modify fee parameters are mandatory Annex I disclosures affecting holder rights. Omitting an uncapped fee-hike function renders the whitepaper unfair and misleading under Article 6.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "United States (SEC CorpFin & Howey Framework)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Transaction Fee Parameters, Mutable Protocol Tax & Admin Parameter Override Disclosure",
        relevanceSummaryKo:
          "On-chain transfer tax parameters and administrative setters capable of increasing transfer fees up to 100% represent material economic risks that must be prominently disclosed to prospective purchasers.",
      },
    },
  },

  transferRestrictions: {
    itemKey: "transferRestrictions",
    titleKo: "3. Transfer Pause & Address Blacklist Controls",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "South Korea (VAUPA · DAXA Listing Standards)",
        statuteTitle:
          "Virtual Asset User Protection Act (VAUPA) Art. 10(4)(2) & DAXA Security Review Standards",
        articleRef:
          "VAUPA Art. 10(4)(2) / DAXA Security Audit Standard (Unilateral Pause & Arbitrary Blacklist Authority)",
        relevanceSummaryKo:
          "Claiming censorship-resistant, non-freezable transfers in the whitepaper while empowering a single EOA to halt all transfers (setPaused) or freeze individual wallets (setBlacklisted) directly impairs user property rights and violates disclosure integrity.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "European Union (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6(3) & Annex I Part E (Restrictions on Transferability) & Article 15 (Civil Liability for Omission of Transfer Restrictions)",
        relevanceSummaryKo:
          "MiCA strictly requires any restrictions on free transferability and issuer circuit-breaker powers to be stated in both the whitepaper summary and main body; omitting them constitutes a direct regulatory breach.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "United States (SEC CorpFin & Howey Framework)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Transferability Restrictions, Emergency Circuit Breakers & Unilateral Wallet Freeze Authority",
        relevanceSummaryKo:
          "Issuers must accurately disclose embedded transfer restriction functions (pause, blacklist) and identify whether such authority is held by a single private key or governed by multi-sig/judicial procedures.",
      },
    },
  },

  teamLockup: {
    itemKey: "teamLockup",
    titleKo: "4. Team Allocation Wallet & Lockup Release Timestamp",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "South Korea (VAUPA · DAXA Listing Standards)",
        statuteTitle:
          "Virtual Asset User Protection Act (VAUPA) Art. 10(4)(2) & DAXA Circulating Supply Guidelines",
        articleRef:
          "VAUPA Art. 10(4)(2) (Misrepresentation of Lockup/Circulation Plan) / DAXA On-Chain Lockup Verification Standard",
        relevanceSummaryKo:
          "Disclosing that 20,000,000 team tokens are locked by smart contract until 2028-01-01 when the deployed contract contains zero timelock checks (teamLockupActive=false) is one of the most severe listing disqualification grounds in Korean exchange reviews.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "European Union (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6 & Annex I Part D (Token Allocation, Lock-up Schemes & Release Schedule) & Article 15 (Civil Liability)",
        relevanceSummaryKo:
          "Founder/team lockup schedules and whether they are technically enforced on-chain directly impact circulating supply risk. Representing an unvested liquid allocation as 'smart-contract timelocked' breaches MiCA Article 6.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "United States (SEC CorpFin & Howey Framework)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Insider/Founder Vesting Schedules, On-Chain Timelock Enforcement & Dilution Risk Disclosure",
        relevanceSummaryKo:
          "Issuers must distinguish between cryptographically enforced on-chain vesting schedules and non-binding off-chain custody undertakings so investors can assess insider liquidation risk.",
      },
    },
  },

  upgradeability: {
    itemKey: "upgradeability",
    titleKo: "5. Proxy Upgradeability & Admin Governance Structure",
    statutes: {
      KR: {
        jurisdiction: "KR",
        flag: "🇰🇷",
        jurisdictionLabelKo: "South Korea (VAUPA · DAXA Listing Standards)",
        statuteTitle:
          "Virtual Asset User Protection Act (VAUPA) Art. 10(4)(2) & DAXA Smart Contract Governance Standards",
        articleRef:
          "VAUPA Art. 10(4)(2) / DAXA Proxy Upgradeability & Single Point of Failure (EOA Admin) Risk Standard",
        relevanceSummaryKo:
          "Disclosing an immutable contract or multi-sig timelock governance while retaining a single EOA admin capable of swapping logicImplementation at will invalidates prior security audits and represents a severe governance mismatch.",
      },
      EU: {
        jurisdiction: "EU",
        flag: "🇪🇺",
        jurisdictionLabelKo: "European Union (MiCA Regulation)",
        statuteTitle:
          "Regulation (EU) 2023/1114 on Markets in Crypto-Assets (MiCA)",
        articleRef:
          "Article 6 & Annex I Part F/G (Underlying Technology, Smart Contract Mutability & Governance Controls) & Article 15",
        relevanceSummaryKo:
          "Post-deployment mutability of underlying smart contracts and concentration of administrative upgrade keys are mandatory technical and governance risk disclosures under MiCA Annex I.",
      },
      US: {
        jurisdiction: "US",
        flag: "🇺🇸",
        jurisdictionLabelKo: "United States (SEC CorpFin & Howey Framework)",
        statuteTitle:
          "SEC Division of Corporation Finance — Digital Asset Disclosure Guidance",
        articleRef:
          "Smart Contract Mutability, Proxy Admin Key Custody & Governance Centralization Disclosure",
        relevanceSummaryKo:
          "Whether smart contract logic can be upgraded post-deployment—and whether a single EOA key can execute upgrades without a timelock—is a core managerial centralization factor under SEC disclosure standards.",
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
    titleKo: "1. Max Supply Cap & Mintability Authority",
    titleEn: "Max Supply Cap & Mintability Authority",
    vulnerabilitySummaryKo:
      "MAX_SUPPLY is set to type(uint256).max (unlimited) and a privileged onlyOwner mint() function remains active, allowing arbitrary supply inflation in counterfactual execution.",
    vulnerableContractLabel: "MismatchedToken.sol (Vulnerable — Uncapped Owner Mint)",
    remediatedContractLabel: "CompliantToken.sol (Remediated — 100M Fixed Cap & Mint Removed)",
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
address public constant owner = address(0); // Ownership permanently renounced

// Privileged mint() function completely removed; supply minted once in constructor`,
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
        "Maximum supply is permanently fixed at 100,000,000 tokens and no additional minting function exists.",
      optionACodeEnforcedText:
        "[Retain Disclosure After Code Patch] Total supply is immutably fixed at 100,000,000 tokens in the constructor, with mint() removed and owner burned to address(0), cryptographically preventing any secondary issuance.",
      optionBDisclosureRiskRedline:
        "[Amend Whitepaper If Retaining Contract] Initial supply is 100,000,000 tokens; however, the Foundation Admin EOA retains an uncapped mint(address,uint256) privilege (MAX_SUPPLY = uint256.max), creating material dilution risk for token holders.",
    },
  },

  transferFee: {
    itemKey: "transferFee",
    titleKo: "2. Transfer Fee Rate (bps) & Mutability Cap",
    titleEn: "Transfer Fee Rate (bps) & Mutability Cap",
    vulnerabilitySummaryKo:
      "Active transfer fee is deployed at 500 bps (5x the disclosed 100 bps), and setTransferFeeBps() allows the owner to hike the transfer tax up to 10,000 bps (100%).",
    vulnerableContractLabel: "MismatchedToken.sol (Vulnerable — 500 bps & Up to 100% Fee Hike)",
    remediatedContractLabel: "CompliantToken.sol (Remediated — Hardcoded 100 bps & Setter Removed)",
    vulnerableSolidityCode: `uint256 public transferFeeBps = 500; // 5.00%
uint256 public constant maxTransferFeeBps = 10_000; // Up to 100%!
bool public constant feeMutable = true;

function setTransferFeeBps(uint256 newFeeBps) external onlyOwner {
    if (newFeeBps > maxTransferFeeBps) revert FeeExceedsMax(newFeeBps);
    transferFeeBps = newFeeBps;
}`,
    remediatedSolidityCode: `uint256 public constant transferFeeBps = 100; // 1.00% permanently fixed
uint256 public constant maxTransferFeeBps = 100; // Hard cap 1.00%
bool public constant feeMutable = false;

// setTransferFeeBps() removed; transfer fee cannot be increased post-deployment`,
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
        "On-chain transfer fee is fixed at 1.00% (100 bps) and cannot be increased post-deployment.",
      optionACodeEnforcedText:
        "[Retain Disclosure After Code Patch] On-chain transfer fee is hardcoded as a Solidity constant (transferFeeBps = 100, feeMutable = false) with no administrative setter function.",
      optionBDisclosureRiskRedline:
        "[Amend Whitepaper If Retaining Contract] Current on-chain transfer fee is 5.00% (500 bps), and the Admin EOA may modify the fee rate up to 100% (10,000 bps) at any time via setTransferFeeBps().",
    },
  },

  transferRestrictions: {
    itemKey: "transferRestrictions",
    titleKo: "3. Transfer Pause & Address Blacklist Controls",
    titleEn: "Transfer Pause & Address Blacklist Controls",
    vulnerabilitySummaryKo:
      "setPaused() and setBlacklisted() are exposed to a single Admin EOA, enabling immediate wallet freezing or global transfer halt.",
    vulnerableContractLabel: "MismatchedToken.sol (Vulnerable — Arbitrary Pause & Blacklist)",
    remediatedContractLabel: "CompliantToken.sol (Remediated — No Pause / No Blacklist)",
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
// No pause or blacklist conditionals in _transfer()`,
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
        "No party can arbitrarily pause token transfers or blacklist individual wallet addresses.",
      optionACodeEnforcedText:
        "[Retain Disclosure After Code Patch] The smart contract contains no setPaused or setBlacklisted functions (pausable=false, blacklistable=false), ensuring permissionless peer-to-peer transfers.",
      optionBDisclosureRiskRedline:
        "[Amend Whitepaper If Retaining Contract] The Admin EOA holds unilateral authority to pause all token transfers (setPaused) or freeze specific wallet addresses (setBlacklisted) without prior notice or judicial order.",
    },
  },

  teamLockup: {
    itemKey: "teamLockup",
    titleKo: "4. Team Allocation Wallet & Lockup Release Timestamp",
    titleEn: "Team Allocation Wallet & Lockup Release Timestamp",
    vulnerabilitySummaryKo:
      "Deployed with teamLockupActive = false and teamLockupReleaseTimestamp = 0, and _transfer() omits any timelock check—allowing all 20,000,000 team tokens to be dumped immediately.",
    vulnerableContractLabel: "MismatchedToken.sol (Vulnerable — Missing On-Chain Timelock)",
    remediatedContractLabel: "CompliantToken.sol (Remediated — Enforced 2028-01-01 Timelock)",
    vulnerableSolidityCode: `address public teamWallet;
uint256 public constant teamAllocation = 20_000_000 * 10 ** 18;
bool public teamLockupActive = false;
uint256 public teamLockupReleaseTimestamp = 0;

function _transfer(address from, address to, uint256 amount) internal {
    // NOTE: No team lockup timestamp check exists in _transfer()!
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
        "The 20,000,000 team token allocation is cryptographically locked on-chain until January 1, 2028 00:00:00 UTC.",
      optionACodeEnforcedText:
        "[Retain Disclosure After Code Patch] Transfers from teamWallet (20,000,000 tokens) are blocked on-chain in _transfer() whenever block.timestamp < 1830297600 (2028-01-01 00:00:00 UTC).",
      optionBDisclosureRiskRedline:
        "[Amend Whitepaper If Retaining Contract] The 20,000,000 team token allocation is NOT subject to an on-chain smart contract timelock (teamLockupActive = false) and relies solely on off-chain internal custody controls.",
    },
  },

  upgradeability: {
    itemKey: "upgradeability",
    titleKo: "5. Proxy Upgradeability & Admin Governance Structure",
    titleEn: "Proxy Upgradeability & Admin Governance Structure",
    vulnerabilitySummaryKo:
      "upgradeable = true and a single EOA (adminAddress) can invoke setLogicImplementation() immediately without a timelock or multi-sig approval.",
    vulnerableContractLabel: "MismatchedToken.sol (Vulnerable — Single EOA Logic Swap)",
    remediatedContractLabel: "CompliantToken.sol (Remediated — Non-Upgradeable Immutable Contract)",
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

// setLogicImplementation() removed; contract logic is immutable post-deployment`,
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
        "The smart contract is non-upgradeable and immutable, or governed strictly by a multi-sig timelock.",
      optionACodeEnforcedText:
        "[Retain Disclosure After Code Patch] The contract is deployed as a standalone non-upgradeable bytecode instance (upgradeable = false, adminAddress = address(0)) with no proxy delegation or logic setter.",
      optionBDisclosureRiskRedline:
        "[Amend Whitepaper If Retaining Contract] The contract is upgradeable (upgradeable = true), and a single Admin EOA (adminAddress) currently holds authority to replace the logic implementation address without a timelock.",
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
    ? `[Notice of Compliance Verification] ${auditCase.projectName} (${auditCase.tokenSymbol}) — Whitepaper Disclosure & Smart Contract Alignment Verified`
    : `[Legal Cure & Explanation Demand Notice] ${auditCase.projectName} (${auditCase.tokenSymbol}) — ${mismatchedItems.length} Material Finding(s) Between Whitepaper Disclosure & Deployed Smart Contract`;

  const itemFindingsText =
    mismatchedItems.length > 0
      ? mismatchedItems
          .map((item, idx) => {
            const statute = LEGAL_STATUTE_MAP[item.itemKey];
            const rem = CODE_REMEDIATION_SPECS[item.itemKey];
            return [
              `  ${idx + 1}) [${item.displayOrder}. ${item.titleEn}] — Verdict: ${item.status} (Severity: ${item.severity})`,
              `     • Disclosed Claim (${item.sectionRef}): "${item.disclosedClaim}"`,
              `     • On-Chain Actual State (${item.evidenceFunctionOrSlot}): ${item.onchainState}`,
              `     • Verification Rationale: ${item.rationale}`,
              `     • Applicable Statutory Citations:`,
              `       - [KR] ${statute.statutes.KR.articleRef}`,
              `       - [EU] ${statute.statutes.EU.articleRef}`,
              `       - [US] ${statute.statutes.US.articleRef}`,
              `     • Required Remediation Options:`,
              `       - (Option A — Smart Contract Patch) ${rem.whitepaperRedline.optionACodeEnforcedText}`,
              `       - (Option B — Whitepaper Redline Amendment) ${rem.whitepaperRedline.optionBDisclosureRiskRedline}`,
            ].join("\n");
          })
          .join("\n\n")
      : "  • All 5 core audit dimensions passed 1:1 verification (MATCH) between the whitepaper disclosure and deployed smart contract state.";

  const breachProofText =
    simulations.length > 0
      ? simulations
          .map((sim) => {
            return [
              `  • ${sim.order}. ${sim.titleEn}: [${sim.badgeText}]`,
              `    - Target Call / Calldata: ${sim.targetFunction} (${sim.calldata.slice(0, 26)}...) | Gas: ${sim.gasUsed}`,
              `    - Pre/Post State Transition: ${sim.beforeState}  ==>  ${sim.afterState}`,
              `    - Technical & Legal Implication: ${sim.stateDeltaSummary}`,
            ].join("\n");
          })
          .join("\n")
      : "  • No counterfactual breach simulations recorded.";

  const fullNoticeTextKo = [
    `================================================================================`,
    `DOCUMENT NO : ${docNumber}`,
    `ISSUED DATE : ${issuedDateIso}`,
    `TO          : Board of Directors, Chief Legal Officer & Head of Protocol Engineering, ${auditCase.projectName}`,
    `FROM        : Digital Asset Disclosure & Smart Contract Compliance Review Committee (Lead Reviewer: ${auditCase.reviewerName || "Compliance Counsel"})`,
    `SUBJECT     : ${subjectLineKo}`,
    `================================================================================`,
    ``,
    `1. AUDIT IDENTIFICATION & ON-CHAIN SNAPSHOT METADATA`,
    `  • Project / Token Symbol : ${auditCase.projectName} (${auditCase.tokenSymbol})`,
    `  • Target Network / Addr  : ${auditCase.chainName} (Chain ID: ${auditCase.chainId}) / ${auditCase.tokenAddress}`,
    `  • Reference Block Height : Block #${auditCase.snapshotBlockNumber ?? "-"}`,
    `  • Whitepaper SHA-256     : ${auditCase.documentHash}`,
    `  • Audit Report Hash      : ${auditCase.reportHash || "Generated upon AuditRegistry anchoring"}`,
    `  • Overall Audit Verdict  : ${auditCase.overallStatus} (MATCH: ${auditCase.matchCount} / MISMATCH: ${auditCase.mismatchCount} / NEEDS_HUMAN_REVIEW: ${auditCase.needsReviewCount})`,
    ``,
    `2. ITEMIZED DISCLOSURE VS. ON-CHAIN FINDINGS & STATUTORY MAPPING`,
    itemFindingsText,
    ``,
    `3. COUNTERFACTUAL BREACH SIMULATION EVIDENCE (FORKED EVM EXECUTION PROOF)`,
    `   (Deterministic sandbox execution of whitepaper-violating transactions against live contract bytecode)`,
    breachProofText,
    ``,
    `4. DEMAND FOR TECHNICAL REMEDIATION OR DISCLOSURE AMENDMENT (ACTION REQUIRED)`,
    isCompliant
      ? `  • The target token contract (${auditCase.tokenSymbol}) is verified to enforce all 5 core whitepaper commitments at the EVM bytecode level, blocking all 4 counterfactual breach attempts.`
      : [
          `  The deployed smart contract (${auditCase.tokenAddress}) exhibits ${mismatchedItems.length} material finding(s) contradicting the published whitepaper (${auditCase.whitepaperFileName}), and counterfactual EVM execution proved that ${breachSucceededSims.length} whitepaper-violating transaction(s) succeeded without code-level defense.`,
          `  Pursuant to South Korea VAUPA Article 10(4)(2), EU MiCA Regulation Articles 6 & 15, US SEC Corporation Finance Digital Asset Disclosure Guidance, and DAXA Listing Review Standards, the Issuer is hereby required within seven (7) business days of receipt to execute one of the following cures and submit cryptographic proof:`,
          `  (1) [Technical Remediation] Deploy a patched token contract (or execute an irreversible governance timelock/renouncement transaction) incorporating the attached Solidity Remediation Diff—eliminating uncapped minting, arbitrary fee hikes, and unilateral blacklist powers, and enforcing the 2028-01-01 on-chain team timelock.`,
          `  (2) [Whitepaper Redline Amendment] Where retaining the current contract architecture is operationally necessary, immediately publish a restated whitepaper incorporating Redline Option B above, prominently disclosing all retained EOA admin privileges and holder dilution/freeze risks.`,
        ].join("\n"),
    ``,
    `※ LEGAL DISCLAIMER: This instrument is a fact-grounded compliance review notice generated from deterministic comparisons between disclosure claims and on-chain smart contract states to support legal and listing review workflows; it does not constitute a final judicial ruling.`,
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
