# BLI Alpha Protocol Token (BLIX) — Investor Disclosure Whitepaper (v2.1)

- **Issuing Entity**: BLI Alpha Labs Ltd.
- **Token Symbol**: `BLIX`
- **Target Network**: Ethereum Sepolia (Chain ID: `11155111`)
- **Contract Address**: `0xbbE3c849D90c63645F917Be84a5b454FE858186F`
- **Filing Date**: October 15, 2025

---

## Article 1 (Total Supply Cap & Mintability Authority)
1. The total supply of `BLIX` is strictly capped at **100,000,000 BLIX** (100 million tokens, 18 decimals).
2. Following the initial genesis mint of 100,000,000 BLIX, **additional token minting is permanently disabled (`mintable = false`)**, and no administrator or issuer can inflate the token supply under any circumstances.

## Article 2 (Transfer Fee Rate & Mutability Cap)
1. To support protocol sustainability, `BLIX` applies a low, fixed transfer fee of **1.00% (100 bps)** on token transfers.
2. This 1.00% (100 bps) fee rate is **permanently fixed (`feeMutable = false`, `maxTransferFeeBps = 100`)** and cannot be arbitrarily raised by the issuer after launch.

## Article 3 (Transfer Pause & Address Blacklist Controls)
1. `BLIX` is designed as a fully decentralized utility token; therefore, **arbitrary wallet freezing (`blacklistable = false`) and unilateral transfer suspension (`pausable = false`) are not implemented** in the token contract.
2. In the event of an extreme security incident, any temporary protective measure may only be triggered through a decentralized 5-of-9 multi-sig governance timelock rather than a single EOA administrator.

## Article 4 (Team Allocation Wallet & On-Chain Lockup Schedule)
1. The Core Team allocation of **20,000,000 BLIX (20% of total supply)** is deposited into the public Team Allocation Wallet (`0x2222222222222222222222222222222222222222`).
2. The entire 20,000,000 BLIX team allocation is **enforced by an on-chain smart contract timelock (`teamLockupActive = true`) until January 1, 2028 at 00:00:00 UTC (Unix Timestamp `1830297600`)**, preventing any premature token sales before 2028.

## Article 5 (Proxy Upgradeability & Administrative Governance Structure)
1. To ensure complete code immutability, `BLIX` is deployed as a **non-upgradeable fixed smart contract (`upgradeable = false`)** without any proxy implementation slot.
2. All administrative privileges are governed exclusively by a **Community Multi-Sig & 48-Hour Timelock (`Multi-sig + Timelock`)**, and no single Externally Owned Account (EOA) holds unilateral control over contract parameters.
