# DoraHacks BUIDL Submission Package & Demo Video Guide

이 문서는 **BLI Legal Tech Hackathon 2**의 **DoraHacks BUIDL 제출 폼**에 그대로 복사·붙여넣기 할 수 있는 항목별 텍스트와 **2분 30초 데모 영상 촬영 시나리오(화면 동선 + 한/영 내레이션 대본)**를 정리한 제출 가이드입니다.

---

## Part 1. DoraHacks BUIDL Submission Form (Copy & Paste)

### 1. Project Name
```text
Disclosure vs. Smart Contract Mismatch Auditor (스마트계약·공시자료 불일치 점검기)
```

### 2. Track, Bounty & Repository Link
- **Primary Track:** `LegalTech & RegTech`
- **Target Bounty:** `Chainlink CRE — Best workflow with CRE (2x $1,000)`
- **GitHub Repository:** `https://github.com/Eunryong/bli-disclosure-auditor`

### 3. One-Line Tagline (Short Pitch - Max 140 chars)
```text
Chainlink CRE workflow that cross-examines whitepaper claims against live EVM smart contracts and anchors SHA-256 compliance evidence on-chain.
```

### 4. Elevator Pitch (Short Summary)
```text
Token issuers frequently publish whitepapers promising fixed token supply, 0% transfer tax, no wallet freeze privileges, locked team tokens, and immutable contracts—while deploying smart contracts with hidden minting rights, mutable fees, blacklists, or upgradeable proxies.

Disclosure vs. Smart Contract Mismatch Auditor is a LegalTech & RegTech compliance evidence platform orchestrated by a 4-stage Chainlink Runtime Environment (CRE) workflow. Beyond static view calls, it runs Adversarial On-Chain Breach Simulations (executing actual exploit calls against forked EVM state to prove whether code blocks or permits whitepaper violations), maps discrepancies to KR/EU/US regulatory statutes with Solidity vs. Whitepaper remediation diffs, reaches DON consensus, and anchors tamper-evident SHA-256 report hashes on-chain via AuditRegistry.sol.
```

### 5. Full BUIDL Description (Markdown for DoraHacks Description Field)
```markdown
## Problem Statement
Under global digital asset frameworks (EU MiCA, Korean Virtual Asset User Protection Act, and exchange listing standards), legal and compliance teams must verify whether a token issuer's public disclosure (whitepaper) matches the actual deployed smart contract. Manually cross-checking prose whitepaper clauses against Solidity bytecode and storage slots is slow, error-prone, and lacks verifiable audit trails.

## Solution Overview
**Disclosure vs. Smart Contract Mismatch Auditor** is a compliance evidence tool (strictly non-legal-advice) that automates the 1:1 factual cross-examination between off-chain whitepapers and on-chain smart contracts across **5 separated workflow pages** backed by **SQLite persistence (`prisma/dev.db`)** and **Chainlink Runtime Environment (CRE)**:

1. **`/audits` (Audit Repository):** Tracks all ongoing and anchored compliance audits with SHA-256 document hashes and mismatch KPIs.
2. **`/audits/new` (Case Registration):** Uploads raw whitepapers (`.md`/`.txt`), computes deterministic `documentHash`, and binds target EVM contract address & chain ID.
3. **`/audits/[id]/extract` (Off-Chain Claim Extraction):** Uses structured AI / deterministic rule extraction to pull the **5 core disclosure claims**, exact quotes (`sourceQuote`), and section references (`sectionRef`), with full human-in-the-loop editing.
4. **`/audits/[id]/compare` (Chainlink CRE 4-Stage Workflow, Adversarial Breach Simulation & 1:1 Comparison):**
   - **Step 1 (`capabilities.http.client`):** Fetches off-chain whitepaper claims & SHA-256 digest.
   - **Step 2 (`capabilities.blockchain.evm.read` + Counterfactual EVM Sandbox):** Reads 16 EVM functions (`totalSupply`, `MAX_SUPPLY`, `mintable`, `transferFeeBps`, `feeMutable`, `pausable`, `blacklistable`, `teamWallet`, `teamAllocation`, `teamLockupActive`, `teamLockupReleaseTimestamp`, `upgradeable`, `adminAddress`, `logicImplementation`, etc.) + raw EIP-1967 implementation storage slot (`0x360894...bbc`), and executes **4 Adversarial On-Chain Breach Simulations** (`mint`, `setTransferFeeBps(5000)`, `setBlacklisted` + `transfer`, and premature `teamWallet.transfer`) on cloned EVM state.
   - **Step 3 (`capabilities.compute.consensus`):** Executes OCR3-BFT DON consensus (`4/4 nodes (quorum >= 3)`) to evaluate `MATCH` / `MISMATCH` / `NEEDS_HUMAN_REVIEW`, attach **Multi-Jurisdiction Legal Mapping (KR/EU/US)** & **Solidity Remediation Diffs**, and compute a deterministic `reportHash`.
   - **Step 4 (`capabilities.blockchain.evm.write`):** Generates `AuditRegistry.recordAudit` payload and verifies on-chain integrity.
5. **`/audits/[id]/review` (Legal Sign-Off, Automated Legal Cure Notice & On-Chain Hash Anchoring):** Generates an **Automated Legal Cure Notice (법무 소명 및 시정 권고서)**, allows legal counsel to record item-by-item review notes, finalize statuses, execute `AuditRegistry.recordAudit()` on-chain, verify `verifyAnchor() === true`, and export JSON/PDF compliance evidence packages.

## Two Key Differentiating Pillars

### Pillar 1: Adversarial On-Chain Breach Simulation (Counterfactual EVM Sandbox)
Instead of relying solely on static `eth_call` getters, CRE Step 2 forks the contract's live EVM state into an isolated sandbox (`@ethereumjs/evm` state checkpoint) and dispatches **4 adversarial transactions** that deliberately attempt to violate the whitepaper's promises:
- **Unauthorized Supply Inflation:** `mint(attacker, 10,000,000 * 10^18)` -> Reverts (`DEFENDED`) on `CompliantToken (BLIC)` vs. succeeds (`BREACH_SUCCEEDED`, inflating supply from `100M` to `110M`) on `MismatchedToken (BLIX)`.
- **Predatory 50% Tax Hike:** `setTransferFeeBps(5000)` -> Reverts (`DEFENDED`) on `BLIC` vs. succeeds (`BREACH_SUCCEEDED`, hiking tax to `50%`) on `BLIX`.
- **Arbitrary Holder Freeze:** `setBlacklisted(holder, true)` + `transfer(100)` -> Reverts (`DEFENDED`) on `BLIC` vs. freezes holder transfers (`BREACH_SUCCEEDED`) on `BLIX`.
- **Premature Team Token Dump:** `teamWallet.transfer(marketBuyer, 1,000,000 * 10^18)` -> Blocked by on-chain lockup (`DEFENDED`) on `BLIC` vs. dumps immediately (`BREACH_SUCCEEDED`) on `BLIX`.

### Pillar 2: Multi-Jurisdiction Legal Mapping (KR / EU / US), Solidity Remediation Diff & Automated Legal Cure Notice
- **3-Jurisdiction Regulatory Mapping:** Maps each technical mismatch to review checkpoints under **South Korea** (가상자산이용자보호법 제10조 제4항 제2호 & DAXA 상장심사 가이드라인), **European Union** (MiCA Regulation (EU) 2023/1114 Articles 6 & 15), and **United States** (SEC CorpFin Framework for Investment Contract Analysis of Digital Assets).
- **Actionable Dual-Track Remediation (`- MismatchedToken.sol` vs `+ CompliantToken.sol`):** Provides exact Solidity code patches (Option A: Re-deploy/patch contract) alongside ready-to-insert Whitepaper Redline Clauses (Option B: Amend risk disclosure).
- **One-Click Legal Cure Notice Generator:** Automatically drafts a formal Korean/English Legal Cure Notice & Exchange Listing Review Memo on `/audits/[id]/review` summarizing all detected mismatches, successful breach simulations, and remediation options.

## Chainlink CRE Bounty Integration (`cre-workflow/`)
- **Manifest & Config:** `cre-workflow/workflow.yaml` & `cre-workflow/config.json`
- **Orchestrator Module:** `cre-workflow/src/index.ts`
- **CLI Simulation (`npm run cre:simulate`):** Runs the 4-stage CRE workflow end-to-end against both `CompliantToken (BLIC)` and `MismatchedToken (BLIX)`, outputting step latencies, 4 adversarial breach simulation results, DON consensus digests, and deterministic report hashes.

## Live Ethereum Sepolia Deployments (`chainId: 11155111`)
- **CompliantToken (`BLIC`):** `https://sepolia.etherscan.io/address/0x534c51921913a8717Ca2db550b77fFabf168f71e`
- **MismatchedToken (`BLIX`):** `https://sepolia.etherscan.io/address/0xbbE3c849D90c63645F917Be84a5b454FE858186F`
- **AuditRegistry:** `https://sepolia.etherscan.io/address/0x5B0547C68bc608E6A9b94C515B5B66215981856c`
- **Anchored Audit Tx:** `https://sepolia.etherscan.io/tx/0x36850fc9853adf71484870098cec806002a786b1a61d26536bda8175a12fb788`
```

### 6. Tech Stack Tags
```text
Next.js 15 (App Router), TypeScript, Chainlink CRE, Solidity 0.8.28, Viem, EthereumJS EVM, Prisma ORM, SQLite, Tailwind CSS
```

### 7. Reproducibility & Verification Commands
```bash
npm install
npm run contracts:deploy
npm run db:seed
npm run cre:simulate
npm run test:e2e
npm run dev   # Opens on http://localhost:3300 (redirects to /audits)
```

---

## Part 2. 2분 30초 데모 영상 촬영 가이드 (2m 30s Demo Video Script)

### 촬영 전 사전 준비 (Pre-Flight Checklist)
1. 터미널 창 1개: `npm run dev` 실행 후 브라우저에서 `http://localhost:3300` 접속 (`/audits`로 자동 리다이렉트 확인)
2. 터미널 창 2개째(분할 또는 탭): `npm run cre:simulate` 실행 대기 상태

---

### 타임라인별 화면 동선 및 내레이션 대본 (2분 30초 구성)

#### [0:00 ~ 0:25] 1단계: 문제 정의 및 `/audits` 대시보드 소개 (`http://localhost:3300/audits`)
- **화면 동선:**
  - `http://localhost:3300` 접속 → `/audits` 페이지 표시
  - 상단 LegalTech & RegTech 면책 배너("위법 여부 자동 판정 도구가 아닌 사실 불일치 증빙 도구")와 SQLite에 저장된 2건의 시연 케이스(`BLIC` 정상 일치 건, `BLIX` 4건 불일치 건) 및 Sepolia Etherscan 외부 링크를 마우스로 짚어줌.
- **내레이션 (KR):**
  > "안녕하세요. 저희는 가상자산 백서의 공시 약속과 실제 배포된 스마트계약 설정 간의 불일치를 검증하는 **스마트계약·공시자료 불일치 점검기**를 구현했습니다. 이 도구는 위법성을 자동 판정하는 대신, 법무·컴플라이언스 담당자가 백서 주장과 온체인 사실을 1:1로 대조하고 증빙 해시를 온체인에 앵커링할 수 있도록 설계된 멀티 페이지 증빙 플랫폼입니다."
- **Narration (EN Subtitle):**
  > "Welcome to the Disclosure vs. Smart Contract Mismatch Auditor. Rather than offering automated legal advice, our multi-page platform empowers compliance teams to cross-examine whitepaper claims against live on-chain smart contract states and anchor tamper-evident audit hashes on-chain."

---

#### [0:25 ~ 0:50] 2단계: 새 점검 건 등록 (`/audits/new`)
- **화면 동선:**
  - 우측 상단 **`새 점검 건 생성 (/audits/new)`** 버튼 클릭 → `/audits/new` 이동
  - 상단 **`샘플 2 불러오기: 불일치 백서 (BLIX)`** 버튼 클릭 → 백서 원문 마크다운과 `MismatchedToken` 컨트랙트 주소(`0xbbE3c849...`)가 자동 입력됨을 보여줌.
  - 하단 **`DB 저장 및 5대 항목 추출 단계로 이동`** 버튼 클릭 → SQLite DB에 신규 케이스 생성 후 `/audits/[id]/extract`로 이동.
- **내레이션 (KR):**
  > "`/audits/new` 페이지에서 점검 대상 백서 파일과 스마트계약 주소를 등록합니다. '불일치 백서 샘플(BLIX)'을 불러와 저장하면, 백서 원문 전체와 SHA-256 문서 해시(`documentHash`)가 SQLite 데이터베이스에 영구 저장되며 추출 단계 페이지로 이동합니다."
- **Narration (EN Subtitle):**
  > "On `/audits/new`, we load the BLIX whitepaper and target contract address. Submitting computes the SHA-256 `documentHash`, persists the case in SQLite, and routes to the extraction workspace."

---

#### [0:50 ~ 1:15] 3단계: 백서 원문 보기 및 5대 핵심 항목 추출·보정 (`/audits/[id]/extract`)
- **화면 동선:**
  - 상단 **`백서 5대 핵심 항목 AI 자동 추출`** 버튼 클릭
  - 좌측 백서 원문 뷰어와 우측 5대 필수 항목(`최대 발행량`, `전송 수수료`, `블랙리스트/일시정지`, `팀 물량 락업`, `업그레이드 가능 여부`)에 추출된 공시 주장(`disclosedClaim`), 원문 인용구(`sourceQuote`), 조항 번호(`sectionRef`)를 보여줌.
  - 항목 하나를 살짝 수정한 뒤 **`DB 저장 후 온체인 대조 단계로 이동`** 클릭 → `/audits/[id]/compare`로 이동.
- **내레이션 (KR):**
  > "`/extract` 페이지에서는 백서 원문으로부터 5대 핵심 공시 항목의 주장 값과 인용 문장, 조항 위치를 자동 추출합니다. BLIX 백서는 추가 발행 불가, 전송세 0%, 임의 동결 불가, 팀 물량 36개월 온체인 락업, 업그레이드 불가를 약속하고 있습니다. 담당자가 내용을 검수·저장한 뒤 Chainlink CRE 대조 단계로 이동합니다."
- **Narration (EN Subtitle):**
  > "On `/extract`, the system extracts the 5 mandatory claims, verbatim quotes, and section references from the whitepaper. After human verification, we save to SQLite and proceed to the Chainlink CRE comparison stage."

---

#### [1:15 ~ 1:55] 4단계: Chainlink CRE 4단계 워크플로, 온체인 배신 행위 재현 시뮬레이션 & 3개국 법령·코드 패치 대조 (`/audits/[id]/compare`)
- **화면 동선:**
  - 먼저 터미널 창을 잠깐 띄워 `npm run cre:simulate` 실행 결과를 보여줌 (`cre-workflow/workflow.yaml` 기반 Step 1~4 실행 시간, 4대 배신 시뮬레이션 `DEFENDED` vs `BREACH_SUCCEEDED` 표, OCR3-BFT `4/4 nodes (quorum >= 3)` DON 합의 다이제스트).
  - 브라우저 `/audits/[id]/compare`에서 **`Chainlink CRE 워크플로 실행`** 버튼 클릭 후, **`Counterfactual Breach Simulation (백서 약속 위반 행위 재현 시뮬레이터)`** 섹션에서 1,000만 개 무단 발행·50% 기습 세율 인상·지갑 동결·팀 물량 조기 매도의 4건이 모두 `BREACH_SUCCEEDED`로 뚫리는 상태 변화 증거(전후 수치, 가스량, calldata)를 보여줌.
  - 이어서 아래 항목 카드의 **`글로벌 3개국 규제 매핑 (KR/EU/US) 및 시정 조치 가이드`** 아코디언을 펼쳐 한국 가상자산이용자보호법·EU MiCA·미국 SEC 체크포인트와 `- MismatchedToken.sol` vs `+ CompliantToken.sol` 코드 패치 Diff를 강조.
- **내레이션 (KR):**
  > "핵심 오케스트레이션 레이어인 **Chainlink CRE 워크플로**입니다. 단순 view 함수 조회에 그치지 않고, 복제된 EVM 샌드박스에서 1,000만 개 무단 추가 발행, 50% 수수료 기습 인상, 특정 지갑 동결, 팀 물량 즉시 처분이라는 4가지 배신 트랜잭션을 직접 실행합니다. 정상 토큰 BLIC은 코드 수준에서 모두 Revert로 방어하지만, BLIX는 4건 모두 위반 행위가 실제로 성공하는 결정적 증거를 포착합니다. 또한 각 불일치 항목마다 한국·EU MiCA·미국 SEC 법령 체크포인트와 Solidity 수정 Diff 및 백서 정정 문안을 동시에 제시합니다."
- **Narration (EN Subtitle):**
  > "Beyond reading view functions, our Chainlink CRE workflow runs 4 Adversarial Breach Simulations in a forked EVM sandbox—proving that BLIX allows 10M unauthorized minting, a 50% tax hike, wallet freezing, and premature team token dumps. Each finding maps directly to KR, EU MiCA, and US SEC checkpoints alongside exact Solidity remediation diffs and whitepaper redlines."

---

#### [1:55 ~ 2:30] 5단계: 법무 소명 권고서 자동 생성, `AuditRegistry` 온체인 해시 앵커링 및 증빙 리포트 내보내기 (`/audits/[id]/review`)
- **화면 동선:**
  - 우측 상단 **`법무 검토 및 온체인 앵커링으로 이동`** 클릭 → `/audits/[id]/review` 진입
  - **`법무 소명 및 시정 권고서 초안 자동 생성`** 버튼을 클릭해 불일치 4건·배신 시뮬레이션 결과·3개국 법령 근거가 담긴 공식 소명 요구서가 즉시 작성됨을 보여줌.
  - **`온체인 앵커링 실행 (recordAudit & verifyAnchor)`** 버튼 클릭 → 녹색 배지 **`verifyAnchor() === true (온체인 검증 완료)`**와 Sepolia Etherscan 링크, **`인쇄/PDF용 리포트 뷰`** 및 **`증빙 패키지(JSON) 다운로드`**를 차례로 보여주며 마무리.
- **내레이션 (KR):**
  > "마지막 `/review` 페이지에서는 원클릭으로 **법무 소명 및 시정 권고서 초안**을 자동 생성하고 최종 판정을 확정합니다. 온체인 앵커링을 실행하면 민감 정보 노출 없이 오직 SHA-256 문서 해시와 리포트 해시만 `AuditRegistry.sol`에 기록되며, `verifyAnchor() === true`로 무결성이 검증됩니다. 완료된 결과는 JSON 증빙 패키지와 인쇄용 PDF 리포트로 즉시 내보낼 수 있습니다. 감사합니다."
- **Narration (EN Subtitle):**
  > "Finally, on `/review`, legal counsel auto-generates a formal Legal Cure Notice, finalizes review notes, and anchors the SHA-256 `documentHash` and `reportHash` on `AuditRegistry.sol` with zero PII exposure—verified live via `verifyAnchor() === true` and exported as a complete JSON/PDF evidence package. Thank you!"
