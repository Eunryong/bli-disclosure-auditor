# BLI Compliant Utility Token (BLIC) — Official Digital Asset Disclosure Whitepaper (v1.0)

- **Issuing Entity**: BLI LegalTech Foundation
- **Token Symbol**: `BLIC`
- **Target Network**: Ethereum Sepolia (Chain ID: `11155111`)
- **Contract Address**: `0x534c51921913a8717Ca2db550b77fFabf168f71e`
- **Filing Date**: October 15, 2025

---

## Article 1 (Total Supply Cap & Mintability Authority)
1. The maximum and initial total supply of `BLIC` is permanently fixed at **100,000,000 BLIC** (100 million tokens, 18 decimals).
2. All 100,000,000 BLIC tokens are minted once at contract deployment, and **no additional tokens can ever be minted after genesis (`mintable = false`)**.
3. The smart contract contains no `mint()` function and all administrative ownership privileges have been permanently renounced (`owner = 0x0000000000000000000000000000000000000000`), ensuring zero dilution risk for token holders.

## Article 2 (Transfer Fee Rate & Mutability Cap)
1. On-chain transfers of `BLIC` incur a fixed ecosystem maintenance fee of **1.00% (100 bps, `transferFeeBps = 100`)**.
2. The transfer fee rate is hardcoded as an immutable constant in the smart contract (`feeMutable = false`, `maxTransferFeeBps = 100`), and **cannot be modified or increased after deployment**.
3. Neither the Foundation nor any third party possesses any setter function (`setTransferFeeBps` absent) to raise transfer fees.

## Article 3 (Transfer Pause & Address Blacklist Controls)
1. To guarantee censorship resistance and uninterrupted settlement, the `BLIC` smart contract **does not include any emergency transfer pause (`pausable = false`, `paused = false`) or wallet freezing/blacklist (`blacklistable = false`) functions**.
2. No issuer, administrator, or external account can unilaterally halt token trading or freeze individual investor balances on-chain.

## Article 4 (Team Allocation Wallet & On-Chain Lockup Schedule)
1. The Founding Team & Core Contributors allocation of **20,000,000 BLIC (20% of total supply)** is held in the designated Team Allocation Wallet (`0x1111111111111111111111111111111111111111`).
2. This team allocation is strictly locked on-chain (`teamLockupActive = true`) until **January 1, 2028 at 00:00:00 UTC (Unix Timestamp `1830297600`)**.
3. Any transfer attempt from `teamWallet` prior to `teamLockupReleaseTimestamp (1830297600)` is automatically reverted by the smart contract's `_transfer` enforcement logic.

## Article 5 (Proxy Upgradeability & Administrative Governance Structure)
1. The `BLIC` token is deployed as a **standalone, non-upgradeable immutable smart contract (`upgradeable = false`)** and does not use EIP-1967 or UUPS proxy delegation (`logicImplementation = 0x0000000000000000000000000000000000000000`).
2. There is no proxy administrator (`adminAddress = 0x0000000000000000000000000000000000000000`), making post-deployment logic replacement technically impossible.
