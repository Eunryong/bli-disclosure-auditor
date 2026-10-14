# Disclosure vs. Smart Contract Mismatch Auditor
**스마트계약·공시자료(백서) 정합성 및 불일치 점검기 (Chainlink CRE 기반 법무·컴플라이언스 증빙 플랫폼)**

> **BLI Legal Tech Hackathon 2** · **Track:** LegalTech & RegTech · **Bounty:** Chainlink CRE (*Best workflow with CRE*)

---

## 1. Executive Summary (One-Line Pitch & Problem Definition)

### English
**One-Line Pitch:**  
An end-to-end **LegalTech & RegTech evidence platform** powered by **Chainlink Runtime Environment (CRE)** that extracts tokenomics/governance claims from off-chain whitepapers, inspects live EVM smart contract states & proxy slots, flags factual discrepancies (`MATCH` / `MISMATCH` / `NEEDS_HUMAN_REVIEW`), and anchors tamper-evident SHA-256 audit digests on-chain via `AuditRegistry.sol`.

**Problem Definition (Why LegalTech & RegTech Needs This):**  
Under emerging digital asset regulations (such as **EU MiCA**, the **Korean Virtual Asset User Protection Act (가상자산이용자보호법)**, and **DAXA Listing Review Guidelines**), token issuers publish whitepapers promising investor protections—such as *"Fixed 100M max supply with minting disabled"*, *"0% transfer tax"*, *"No arbitrary wallet freeze"*, *"36-month on-chain team vesting"*, and *"Non-upgradeable immutable contract"*.  
However, in practice, legal and compliance officers lack automated tooling to verify whether the **actual deployed EVM bytecode and storage slots** honor those prose disclosures, resulting in undetected hidden `mint()` backdoors, mutable transfer taxes, `blacklist()` privileges, unlocked team treasuries, or unannounced EIP-1967 upgrade proxies.

### 국문 요약 (Korean Summary)
- **한 줄 소개:** 가상자산 백서(공시자료)의 5대 핵심 약속(Claim)과 온체인 스마트계약의 실제 코드·스토리지 상태(On-chain Fact)를 **Chainlink CRE 4단계 워크플로**로 1:1 대조하고, 법무·컴플라이언스 담당자의 최종 검토 의견을 거쳐 **SHA-256 증빙 해시만 온체인(`AuditRegistry.sol`)에 앵커링**하는 증빙 도구입니다.
- **핵심 원칙 (Non-Legal-Advice):** 본 시스템은 위법 여부를 자동 판정하거나 법률 자문을 제공하는 도구가 아니며, 공시 주장과 온체인 사실 간의 **객관적 불일치 증빙(Evidence Package)**을 생성해 변호사·컴플라이언스 심사역의 검토를 돕는 의사결정 지원 시스템입니다.

---

## 2. System Architecture (Multi-Page App Router + SQLite + Chainlink CRE + Solidity)

### Mermaid Architecture Diagram

```mermaid
flowchart TB
  subgraph UI["Next.js 15 App Router (5 Separated Step Pages)"]
    P1["1. /audits\nAudit Case List & KPI Dashboard"]
    P2["2. /audits/new\nWhitepaper Upload & Contract Registration"]
    P3["3. /audits/[id]/extract\n5 Core Claims AI/Rule Extraction & Manual Edit"]
    P4["4. /audits/[id]/compare\nChainlink CRE 4-Step Execution & 1:1 Diff"]
    P5["5. /audits/[id]/review\nLegal Sign-Off, On-Chain Anchor & JSON/PDF Export"]
    P1 --> P2 --> P3 --> P4 --> P5
  end

  subgraph Backend["Next.js API Routes & SQLite Persistence (Prisma ORM)"]
    API["/api/audits · /extract · /compare · /review"]
    DB[("SQLite DB\nprisma/dev.db\n(AuditCase + AuditCheckItem)")]
    API <--> DB
  end

  subgraph CRE["Chainlink Runtime Environment (CRE) 4-Stage Workflow (cre-workflow/)"]
    S1["Step 1: Off-Chain Disclosure Fetch\n(capabilities.http.client / LLM)"]
    S2["Step 2: On-Chain EVM State Inspection\n(capabilities.blockchain.evm.read × 16 + EIP-1967)"]
    S3["Step 3: DON Consensus & Evaluation\n(capabilities.compute.consensus · OCR3-BFT)"]
    S4["Step 4: Registry Anchor Readiness\n(capabilities.blockchain.evm.write)"]
    S1 --> S2 --> S3 --> S4
  end

  subgraph EVM["EVM Smart Contracts (Solidity 0.8.28)"]
    C1["CompliantToken.sol (BLIC)\n100% Matches Whitepaper"]
    C2["MismatchedToken.sol (BLIX)\n4 Mismatches + 1 Review Case"]
    C3["AuditRegistry.sol\nrecordAudit() & verifyAnchor()"]
  end

  UI <--> API
  API <--> CRE
  S2 --> C1
  S2 --> C2
  S4 --> C3
```

### ASCII Architecture Overview

```text
+---------------------------------------------------------------------------------------------------+
|                        Next.js 15 Multi-Page App Router (No Single-Page Tabs)                     |
|  [/audits] ---> [/audits/new] ---> [/audits/[id]/extract] ---> [/audits/[id]/compare] ---> [/review]
+-------------------------------------------------+-------------------------------------------------+
                                                  | REST API (/api/audits/...)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                   SQLite Persistent Storage (prisma/dev.db via Prisma ORM)                        |
|  - AuditCase: documentHash (SHA-256), tokenAddress, chainId, onchainSnapshotJson, reportHash      |
|  - AuditCheckItem (5 Core Items): disclosedClaim, sourceQuote, onchainState, status, reviewerNote |
+-------------------------------------------------+-------------------------------------------------+
                                                  | Orchestrated by
                                                  v
+---------------------------------------------------------------------------------------------------+
|                 Chainlink CRE 4-Stage Workflow (cre-workflow/workflow.yaml & src/index.ts)        |
|  [Step 1] Off-chain Whitepaper Claim & SHA-256 Fetch (HTTP / Structured LLM / Rule Parser)        |
|  [Step 2] EVM Read Capability: 16 View Functions + EIP-1967 Proxy Slot (0x360894...bbc)           |
|  [Step 3] DON OCR3-BFT Consensus (4/4 nodes, quorum >= 3): 1:1 Claim vs Fact & reportHash         |
|  [Step 4] On-Chain AuditRegistry.recordAudit() Calldata & verifyAnchor() Integrity Verification   |
+-------------------------------------------------+-------------------------------------------------+
                                                  | ABI eth_call & eth_sendTransaction
                                                  v
+-------------------------------+  +-------------------------------+  +-----------------------------+
| CompliantToken.sol (BLIC)     |  | MismatchedToken.sol (BLIX)    |  | AuditRegistry.sol           |
| 0x534c51921913a8717Ca2db55... |  | 0xbbE3c849D90c63645F917Be8... |  | 0x5B0547C68bc608E6A9b94C... |
+-------------------------------+  +-------------------------------+  +-----------------------------+
```

### Live Ethereum Sepolia Testnet Contracts (`chainId: 11155111`)
- **`CompliantToken.sol (BLIC)`:** [`0x534c51921913a8717Ca2db550b77fFabf168f71e`](https://sepolia.etherscan.io/address/0x534c51921913a8717Ca2db550b77fFabf168f71e)
- **`MismatchedToken.sol (BLIX)`:** [`0xbbE3c849D90c63645F917Be84a5b454FE858186F`](https://sepolia.etherscan.io/address/0xbbE3c849D90c63645F917Be84a5b454FE858186F)
- **`AuditRegistry.sol`:** [`0x5B0547C68bc608E6A9b94C515B5B66215981856c`](https://sepolia.etherscan.io/address/0x5B0547C68bc608E6A9b94C515B5B66215981856c)
- **Sample On-Chain Anchor Tx (`recordAudit`):** [`0x36850fc9853adf71484870098cec806002a786b1a61d26536bda8175a12fb788`](https://sepolia.etherscan.io/tx/0x36850fc9853adf71484870098cec806002a786b1a61d26536bda8175a12fb788)

---

## 3. Five Mandatory Disclosure vs. On-Chain Check Items & Demo Results (`BLIC` vs. `BLIX`)

Every audit case evaluates **5 core regulatory disclosure dimensions** by comparing the extracted whitepaper claim against live EVM contract calls and storage slots:

| # | Item Key (`AuditCheckItemKey`) | Inspection Scope (Whitepaper vs. Smart Contract) | On-Chain Evidence Functions & Storage Slots | Case A: `BLIC` (`CompliantToken.sol`) | Case B: `BLIX` (`MismatchedToken.sol`) |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | `maxSupplyAndMintability` | **Max Supply Cap & Additional Minting Privilege**<br/>(최대 발행량 및 추가 발행 권한) | `totalSupply()`, `MAX_SUPPLY()`, `maxSupply()`, `mintable()`, `owner()` | **`MATCH`**<br/>100M fixed cap, `mintable=false`, `owner=0x0` (renounced) | **`MISMATCH` (HIGH)**<br/>Whitepaper claims 100M fixed cap & no minting, but `mintable=true` & `MAX_SUPPLY=uint256.max` (unlimited) |
| **2** | `transferFee` | **Transfer Tax / Fee Rate & Mutability**<br/>(전송 수수료율 및 임의 변경 권한) | `transferFeeBps()`, `maxTransferFeeBps()`, `feeMutable()` | **`MATCH`**<br/>`transferFeeBps=100` (1.00% fixed as disclosed), `feeMutable=false` | **`MISMATCH` (HIGH)**<br/>Whitepaper claims 0% tax, but `transferFeeBps=500` (**5.00%**) & `feeMutable=true` (up to 100%) |
| **3** | `transferRestrictions` | **Pause & Wallet Blacklist/Freeze Privileges**<br/>(전송 일시정지 및 블랙리스트 동결 권한) | `paused()`, `pausable()`, `blacklistable()`, `owner()` | **`MATCH`**<br/>`pausable=false`, `blacklistable=false` | **`MISMATCH` (HIGH)**<br/>Whitepaper claims unrestricted transfers, but `pausable=true` & `blacklistable=true` |
| **4** | `teamLockup` | **Team/Advisor Token Lockup & Vesting Enforcement**<br/>(팀 물량 락업 및 온체인 베스팅 강제 여부) | `teamWallet()`, `teamAllocation()`, `teamLockupActive()`, `teamLockupReleaseTimestamp()` | **`MATCH`**<br/>`teamLockupActive=true`, locked until `1830297600` (`2028-01-01 UTC`) | **`MISMATCH` (HIGH)**<br/>Whitepaper claims 24-month on-chain lockup until `2028-01-01`, but `teamLockupActive=false` & `releaseTimestamp=0` |
| **5** | `upgradeability` | **Proxy Upgradeability & Logic Replacement Privilege**<br/>(프록시 업그레이드 및 컨트랙트 로직 변경 권한) | `upgradeable()`, `logicImplementation()`, `adminAddress()`, EIP-1967 Slot (`0x360894...bbc`) | **`MATCH`**<br/>`upgradeable=false`, `adminAddress=0x0`, EIP-1967 slot empty | **`NEEDS_HUMAN_REVIEW` (MEDIUM)**<br/>Whitepaper claims immutable contract, but `upgradeable=true` with single-EOA `adminAddress` & active EIP-1967 slot (requires governance timelock review) |

---

## 4. 1-Minute Quickstart & Reproducibility Guide (For Judges)

All commands work out-of-the-box in a local environment without requiring external paid API keys or an external Ethereum node (includes an embedded real EVM bytecode execution engine via `@ethereumjs/evm` + `viem` ABI encoding, while seamlessly connecting to Sepolia/Anvil if `RPC_URL` is configured).

```bash
# 1. Install dependencies
npm install

# 2. Compile & deploy the 3 Solidity contracts (CompliantToken, MismatchedToken, AuditRegistry)
npm run contracts:deploy

# 3. Initialize & seed SQLite database (prisma/dev.db) with BLIC & BLIX cases
npm run db:seed

# 4. Run Chainlink CRE 4-Stage Workflow CLI Simulation (Bounty Verification)
npm run cre:simulate

# 5. Run End-to-End Verification across all 5 Multi-Page Routes & APIs
npm run test:e2e

# 6. Start the Next.js Web Application (http://localhost:3300 -> redirects to /audits)
npm run dev
```

### Multi-Page URL Routes to Explore in Browser
- **`http://localhost:3300/audits`** — Saved audit case repository (`BLIC` & `BLIX` pre-loaded from SQLite)
- **`http://localhost:3300/audits/new`** — Register a new whitepaper (`.md`/`.txt` or 1-click sample loader) & smart contract address
- **`http://localhost:3300/audits/audit-mismatched-blix/extract`** — Inspect raw whitepaper & edit extracted 5 core claims
- **`http://localhost:3300/audits/audit-mismatched-blix/compare`** — Run Chainlink CRE 4-step workflow, inspect DON consensus digest, and view 1:1 claim vs. on-chain state diff
- **`http://localhost:3300/audits/audit-mismatched-blix/review`** — Enter legal counsel notes, execute on-chain `AuditRegistry.recordAudit()`, verify `verifyAnchor() === true`, and export JSON/PDF evidence package

---

## 5. Compliance, Privacy & Non-Legal-Advice Principles

1. **Strict Non-Legal-Advice Positioning:**  
   This platform does **not** issue automated legal opinions or adjudicate statutory illegality. Instead, it flags factual alignments (`MATCH`), factual contradictions (`MISMATCH`), and cases requiring off-chain evidentiary corroboration (`NEEDS_HUMAN_REVIEW`) so that qualified legal and compliance officers can make informed decisions.
2. **Data Minimization & Zero On-Chain PII / Raw Text Storage:**  
   Full whitepaper documents, internal compliance notes, and reviewer names are stored **exclusively off-chain in SQLite (`prisma/dev.db`)**. Only deterministic 32-byte SHA-256 digests (`documentHash` and `reportHash`), contract metadata (`tokenAddress`, `chainId`, `blockNumber`), and `mismatchCount` are anchored on-chain in `AuditRegistry.sol`, ensuring full compliance with data privacy regulations (GDPR / PIPA).
3. **Cryptographic Reproducibility:**  
   Any regulator, exchange listing committee, or external auditor can independently recompute the SHA-256 hash of the whitepaper and the JSON evidence report and call `AuditRegistry.verifyAnchor(anchorId, documentHash, reportHash)` on-chain to confirm `verified === true`.
