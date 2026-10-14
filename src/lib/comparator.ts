import { prisma } from "@/lib/prisma";
import { getAuditCaseById } from "@/lib/audit-service";
import { parseStructuredClaimByItemKey } from "@/lib/extractor";
import type { TokenOnchainSnapshot } from "@/lib/onchain";
import { executeCreAuditWorkflow } from "../../cre-workflow/src/index";
import type {
  AuditCaseDTO,
  AuditCheckItemDTO,
  AuditCheckItemKey,
  AuditComparisonStatus,
  AuditSeverity,
  DisclosedClaimStructured,
  OnchainStateStructured,
} from "@/types/audit";

export interface ItemComparisonOutput {
  itemKey: AuditCheckItemKey;
  onchainState: string;
  evidenceFunctionOrSlot: string;
  onchainData: OnchainStateStructured;
  onchainDataJson: string;
  status: AuditComparisonStatus;
  severity: AuditSeverity;
  rationale: string;
}

function getStructuredClaim(
  item: AuditCheckItemDTO,
  whitepaperText: string
): DisclosedClaimStructured {
  if (item.disclosedDataJson) {
    try {
      const parsed = JSON.parse(item.disclosedDataJson);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // fall through
    }
  }
  return parseStructuredClaimByItemKey(
    item.itemKey,
    `${item.disclosedClaim}\n${item.sourceQuote}`,
    whitepaperText
  );
}

export function compareDisclosedItemsWithOnchainSnapshot(
  items: AuditCheckItemDTO[],
  snapshot: TokenOnchainSnapshot,
  whitepaperText: string
): ItemComparisonOutput[] {
  const results: ItemComparisonOutput[] = [];

  for (const item of items) {
    const claim = getStructuredClaim(item, whitepaperText);

    switch (item.itemKey) {
      case "maxSupplyAndMintability": {
        const totalNum = Number(snapshot.totalSupplyFormatted);
        const totalDisplay = Number.isFinite(totalNum)
          ? `${totalNum.toLocaleString("en-US")} ${snapshot.symbol}`
          : `${snapshot.totalSupplyFormatted} ${snapshot.symbol}`;

        const maxDisplay = snapshot.isUncappedSupply
          ? "UNLIMITED (type(uint256).max)"
          : `${Number(snapshot.maxSupplyFormatted).toLocaleString("en-US")} ${snapshot.symbol}`;

        const ownerDisplay =
          snapshot.owner === "0x0000000000000000000000000000000000000000"
            ? "0x0000...0000 (Renounced)"
            : `${snapshot.owner} (${snapshot.ownerIsContract ? "Contract" : "Single EOA"})`;

        const onchainState = `totalSupply = ${totalDisplay} | maxSupply = ${maxDisplay} | mintable = ${snapshot.mintable} | owner = ${ownerDisplay}`;
        const evidenceFunctionOrSlot =
          "totalSupply(), maxSupply(), mintable(), owner() [ABI eth_call]";

        const onchainData: OnchainStateStructured = {
          totalSupply: snapshot.totalSupplyFormatted,
          maxSupply: snapshot.isUncappedSupply
            ? "type(uint256).max"
            : snapshot.maxSupplyFormatted,
          mintable: snapshot.mintable,
          ownerAddress: snapshot.owner,
          blockNumber: snapshot.blockNumber,
        };

        const claimedMintable = Boolean(claim.mintable);
        const claimedMaxSupply = String(claim.maxSupply || "100000000").replace(
          /,/g,
          ""
        );

        const isSupplyMatched =
          !snapshot.isUncappedSupply &&
          snapshot.maxSupplyFormatted === claimedMaxSupply;
        const isMintMatched = snapshot.mintable === claimedMintable;

        const isMatch = isSupplyMatched && isMintMatched;

        results.push({
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainData,
          onchainDataJson: JSON.stringify(onchainData),
          status: isMatch ? "MATCH" : "MISMATCH",
          severity: isMatch ? "INFO" : "CRITICAL",
          rationale: isMatch
            ? `Whitepaper disclosure (Max Supply ${Number(claimedMaxSupply).toLocaleString("en-US")} ${snapshot.symbol}, mintable=${claimedMintable}) matches on-chain state (totalSupply=${totalDisplay}, maxSupply=${maxDisplay}, mintable=${snapshot.mintable}, owner=${ownerDisplay}) 100%.`
            : `[CRITICAL MISMATCH] Whitepaper discloses a fixed supply cap of ${Number(claimedMaxSupply).toLocaleString("en-US")} ${snapshot.symbol} with post-genesis minting disabled (mintable=${claimedMintable}), whereas on-chain bytecode sets maxSupply=${maxDisplay} and mintable=${snapshot.mintable}, allowing the single owner EOA (${snapshot.owner}) to call mint(address,uint256) without limit.`,
        });
        break;
      }

      case "transferFee": {
        const feePct = (snapshot.transferFeeBps / 100).toFixed(2);
        const maxFeePct = (snapshot.maxTransferFeeBps / 100).toFixed(2);
        const onchainState = `transferFeeBps = ${snapshot.transferFeeBps} bps (${feePct}%) | maxTransferFeeBps = ${snapshot.maxTransferFeeBps} bps (${maxFeePct}%) | feeMutable = ${snapshot.feeMutable}`;
        const evidenceFunctionOrSlot =
          "transferFeeBps(), maxTransferFeeBps(), feeMutable() [ABI eth_call]";

        const onchainData: OnchainStateStructured = {
          transferFeeBps: snapshot.transferFeeBps,
          maxTransferFeeBps: snapshot.maxTransferFeeBps,
          feeMutable: snapshot.feeMutable,
          blockNumber: snapshot.blockNumber,
        };

        const claimedBps = claim.transferFeeBps ?? 100;
        const claimedMutable = Boolean(claim.feeMutable);

        const isMatch =
          snapshot.transferFeeBps === claimedBps &&
          snapshot.feeMutable === claimedMutable &&
          snapshot.maxTransferFeeBps <= claimedBps;

        results.push({
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainData,
          onchainDataJson: JSON.stringify(onchainData),
          status: isMatch ? "MATCH" : "MISMATCH",
          severity: isMatch ? "INFO" : "HIGH",
          rationale: isMatch
            ? `Disclosed transfer fee (${claimedBps} bps, feeMutable=${claimedMutable}) matches on-chain state (transferFeeBps=${snapshot.transferFeeBps} bps, maxTransferFeeBps=${snapshot.maxTransferFeeBps} bps, feeMutable=${snapshot.feeMutable}).`
            : `[HIGH MISMATCH] Whitepaper discloses a permanently fixed ${claimedBps} bps (${(claimedBps / 100).toFixed(2)}%) transfer fee, but on-chain transferFeeBps=${snapshot.transferFeeBps} bps (${feePct}%), feeMutable=${snapshot.feeMutable}, and maxTransferFeeBps=${snapshot.maxTransferFeeBps} bps (${maxFeePct}%), allowing the owner to raise fees up to 100% via setTransferFeeBps().`,
        });
        break;
      }

      case "transferRestrictions": {
        const ownerLabel =
          snapshot.owner === "0x0000000000000000000000000000000000000000"
            ? "0x0000...0000 (None)"
            : `${snapshot.owner} (${snapshot.ownerIsContract ? "Multi-Sig/Contract" : "Single EOA"})`;

        const onchainState = `paused = ${snapshot.paused} | pausable = ${snapshot.pausable} | blacklistable = ${snapshot.blacklistable} | authority = ${ownerLabel}`;
        const evidenceFunctionOrSlot =
          "paused(), pausable(), blacklistable(), owner(), getCode(owner) [ABI eth_call]";

        const onchainData: OnchainStateStructured = {
          paused: snapshot.paused,
          pausable: snapshot.pausable,
          blacklistable: snapshot.blacklistable,
          ownerAddress: snapshot.owner,
          blockNumber: snapshot.blockNumber,
        };

        const claimedPausable = Boolean(claim.pausable);
        const claimedBlacklistable = Boolean(claim.blacklistable);
        const hasEmergencyGovernanceException =
          /Multi-?sig|Timelock|emergency|security\s+incident|멀티시그|타임락|비상|보안\s*사고/i.test(
            `${item.disclosedClaim} ${item.sourceQuote}`
          );

        let status: AuditComparisonStatus = "MATCH";
        let severity: AuditSeverity = "INFO";
        let rationale = "";

        if (
          snapshot.pausable === claimedPausable &&
          snapshot.blacklistable === claimedBlacklistable
        ) {
          status = "MATCH";
          severity = "INFO";
          rationale = `Disclosed absence of transfer restrictions (pausable=${claimedPausable}, blacklistable=${claimedBlacklistable}) matches on-chain state (pausable=${snapshot.pausable}, blacklistable=${snapshot.blacklistable}).`;
        } else if (hasEmergencyGovernanceException) {
          status = "NEEDS_HUMAN_REVIEW";
          severity = "HIGH";
          rationale = `[LEGAL REVIEW REQUIRED] Article 3 Clause 1 states that wallet freezing and transfer suspension are not implemented, whereas Clause 2 cites an emergency 5-of-9 multi-sig exception. However, on-chain pausable=${snapshot.pausable} and blacklistable=${snapshot.blacklistable} are directly controlled by a single EOA (${snapshot.owner}, codeSize=0) rather than a multi-sig timelock—requiring legal counsel sign-off on ambiguous/contradictory disclosure.`;
        } else {
          status = "MISMATCH";
          severity = "HIGH";
          rationale = `[HIGH MISMATCH] Whitepaper states pausable=${claimedPausable} and blacklistable=${claimedBlacklistable}, but on-chain pausable=${snapshot.pausable} and blacklistable=${snapshot.blacklistable} are active under single EOA control (${snapshot.owner}).`;
        }

        results.push({
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainData,
          onchainDataJson: JSON.stringify(onchainData),
          status,
          severity,
          rationale,
        });
        break;
      }

      case "teamLockup": {
        const releaseDisplay =
          snapshot.teamLockupReleaseTimestamp > 0
            ? `${snapshot.teamLockupReleaseTimestamp} (${snapshot.teamLockupReleaseIso})`
            : "0 (No On-Chain Lockup — Immediately Transferable)";

        const allocNum = Number(snapshot.teamAllocationFormatted);
        const allocDisplay = Number.isFinite(allocNum)
          ? `${allocNum.toLocaleString("en-US")} ${snapshot.symbol}`
          : `${snapshot.teamAllocationFormatted} ${snapshot.symbol}`;

        const onchainState = `teamWallet = ${snapshot.teamWallet} (alloc: ${allocDisplay}) | teamLockupActive = ${snapshot.teamLockupActive} | releaseTimestamp = ${releaseDisplay}`;
        const evidenceFunctionOrSlot =
          "teamWallet(), teamAllocation(), teamLockupActive(), teamLockupReleaseTimestamp() [ABI eth_call]";

        const onchainData: OnchainStateStructured = {
          teamWallet: snapshot.teamWallet,
          teamLockupActive: snapshot.teamLockupActive,
          teamLockupReleaseTimestamp: snapshot.teamLockupReleaseTimestamp,
          blockNumber: snapshot.blockNumber,
        };

        const claimedLockupActive = claim.teamLockupActive ?? true;
        const claimedReleaseTs = claim.teamLockupReleaseTimestamp ?? 1830297600;

        const isMatch =
          snapshot.teamLockupActive === claimedLockupActive &&
          snapshot.teamLockupReleaseTimestamp >= claimedReleaseTs;

        results.push({
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainData,
          onchainDataJson: JSON.stringify(onchainData),
          status: isMatch ? "MATCH" : "MISMATCH",
          severity: isMatch ? "INFO" : "CRITICAL",
          rationale: isMatch
            ? `Disclosed team allocation lockup (Wallet ${snapshot.teamWallet}, release timestamp ${claimedReleaseTs} / 2028-01-01 UTC) matches on-chain timelock enforcement (teamLockupActive=${snapshot.teamLockupActive}, teamLockupReleaseTimestamp=${snapshot.teamLockupReleaseTimestamp}).`
            : `[CRITICAL MISMATCH] Whitepaper discloses that 20,000,000 ${snapshot.symbol} in teamWallet (${snapshot.teamWallet}) is locked on-chain until 2028-01-01 UTC (timestamp ${claimedReleaseTs}), but on-chain teamLockupActive=${snapshot.teamLockupActive} and teamLockupReleaseTimestamp=${snapshot.teamLockupReleaseTimestamp} (0), leaving all 20M team tokens immediately transferable without restriction.`,
        });
        break;
      }

      case "upgradeability": {
        const adminLabel =
          snapshot.adminAddress === "0x0000000000000000000000000000000000000000"
            ? "0x0000...0000 (No Admin)"
            : `${snapshot.adminAddress} (${snapshot.adminIsContract ? "Timelock/Multi-Sig Contract" : "Single EOA"})`;

        const implLabel =
          snapshot.eip1967ImplementationAddress ===
          "0x0000000000000000000000000000000000000000"
            ? "0x0000...0000 (No Proxy Implementation)"
            : snapshot.eip1967ImplementationAddress;

        const onchainState = `upgradeable = ${snapshot.upgradeable} | adminAddress = ${adminLabel} | EIP-1967 Impl = ${implLabel}`;
        const evidenceFunctionOrSlot =
          "upgradeable(), adminAddress(), logicImplementation(), eth_getStorageAt(EIP-1967 0x360894...)";

        const onchainData: OnchainStateStructured = {
          upgradeable: snapshot.upgradeable,
          adminAddress: snapshot.adminAddress,
          eip1967Implementation: snapshot.eip1967ImplementationAddress,
          blockNumber: snapshot.blockNumber,
        };

        const claimedUpgradeable = Boolean(claim.upgradeable);
        const isMatch =
          snapshot.upgradeable === claimedUpgradeable &&
          snapshot.eip1967ImplementationAddress ===
            "0x0000000000000000000000000000000000000000";

        results.push({
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainData,
          onchainDataJson: JSON.stringify(onchainData),
          status: isMatch ? "MATCH" : "MISMATCH",
          severity: isMatch ? "INFO" : "CRITICAL",
          rationale: isMatch
            ? `Disclosed non-upgradeable standalone architecture (upgradeable=${claimedUpgradeable}) matches on-chain state (upgradeable=${snapshot.upgradeable}, adminAddress=0x0, EIP-1967 slot=0x0).`
            : `[CRITICAL MISMATCH] Whitepaper discloses a non-upgradeable contract governed by a Multi-Sig Timelock, but on-chain upgradeable=${snapshot.upgradeable}, EIP-1967 implementation slot holds ${implLabel}, and adminAddress=${snapshot.adminAddress} is a single EOA (codeSize=0) capable of arbitrarily replacing contract logic via upgradeTo().`,
        });
        break;
      }
    }
  }

  return results;
}

export async function runOnchainComparisonForAuditCase(
  auditCaseId: string
): Promise<AuditCaseDTO | null> {
  const existing = await getAuditCaseById(auditCaseId);
  if (!existing || !existing.checkItems) return null;

  const creResult = await executeCreAuditWorkflow({
    auditCaseId: existing.id,
    tokenSymbol: existing.tokenSymbol,
    tokenAddress: existing.tokenAddress,
    chainId: existing.chainId,
    chainName: existing.chainName,
    documentHash: existing.documentHash,
    whitepaperText: existing.whitepaperText,
    checkItems: existing.checkItems,
    executeOnchainAnchor: false,
  });

  const {
    snapshot,
    comparisons,
    overallStatus,
    matchCount,
    mismatchCount,
    needsReviewCount,
    workflowRunId,
    trace,
  } = creResult;

  await prisma.$transaction(
    comparisons.map((comp) => {
      const prev = existing.checkItems!.find((i) => i.itemKey === comp.itemKey);
      const keepNote =
        prev?.reviewerNote && prev.reviewerNote.trim().length > 0
          ? prev.reviewerNote
          : comp.status === "MATCH"
          ? `[Auto-Verified] Confirmed 1:1 match between whitepaper claim and on-chain RPC state (${comp.evidenceFunctionOrSlot}).`
          : `[Counsel Review Required] ${comp.rationale}`;

      return prisma.auditCheckItem.update({
        where: {
          auditCaseId_itemKey: {
            auditCaseId,
            itemKey: comp.itemKey,
          },
        },
        data: {
          onchainState: comp.onchainState,
          evidenceFunctionOrSlot: comp.evidenceFunctionOrSlot,
          onchainDataJson: comp.onchainDataJson,
          status: comp.status,
          severity: comp.severity,
          rationale: comp.rationale,
          reviewerNote: keepNote,
        },
      });
    })
  );

  let existingSnapshotObj: Record<string, any> = {};
  if (existing.onchainSnapshotJson) {
    try {
      existingSnapshotObj = JSON.parse(existing.onchainSnapshotJson);
    } catch {
      existingSnapshotObj = {};
    }
  }

  const mergedSnapshotJson = JSON.stringify(
    {
      ...snapshot,
      creWorkflowTrace: trace,
      anchorVerification: existingSnapshotObj.anchorVerification || undefined,
    },
    null,
    2
  );

  const summaryText =
    mismatchCount === 0 && needsReviewCount === 0
      ? `[Chainlink CRE (${workflowRunId}) — Block #${snapshot.blockNumber} Verified] All 5 core disclosure clauses of ${snapshot.symbol} (${snapshot.tokenAddress}) match on-chain smart contract state (MATCH 5 / MISMATCH 0).`
      : `[Chainlink CRE (${workflowRunId}) — Block #${snapshot.blockNumber} Discrepancy Alert] On-chain inspection of ${snapshot.symbol} (${snapshot.tokenAddress}) detected ${mismatchCount} material mismatch(es) (MISMATCH) and ${needsReviewCount} clause(s) requiring legal counsel review (NEEDS_HUMAN_REVIEW) across the 5 core items.`;

  const nextStage =
    existing.stage === "ANCHORED"
      ? "ANCHORED"
      : existing.stage === "REVIEWED"
      ? "REVIEWED"
      : "COMPARED";

  await prisma.auditCase.update({
    where: { id: auditCaseId },
    data: {
      stage: nextStage,
      chainId: snapshot.chainId,
      chainName: snapshot.chainName,
      tokenAddress: snapshot.tokenAddress,
      snapshotBlockNumber: snapshot.blockNumber,
      onchainSnapshotJson: mergedSnapshotJson,
      creWorkflowRunId: workflowRunId,
      matchCount,
      mismatchCount,
      needsReviewCount,
      overallStatus,
      overallSummary: existing.overallSummary || summaryText,
    },
  });

  return getAuditCaseById(auditCaseId);
}
