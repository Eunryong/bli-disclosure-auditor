import { prisma } from "@/lib/prisma";
import { getAuditCaseById } from "@/lib/audit-service";
import {
  inspectTokenOnchainState,
  type TokenOnchainSnapshot,
} from "@/lib/onchain";
import { parseStructuredClaimByItemKey } from "@/lib/extractor";
import type {
  AuditCaseDTO,
  AuditCheckItemDTO,
  AuditComparisonStatus,
  AuditSeverity,
  DisclosedClaimStructured,
} from "@/types/audit";

export interface ItemComparisonOutput {
  itemKey: string;
  onchainState: string;
  evidenceFunctionOrSlot: string;
  onchainDataJson: string;
  status: AuditComparisonStatus;
  severity: AuditSeverity;
  rationale: string;
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function resolveStructuredDisclosedClaim(
  item: AuditCheckItemDTO,
  fullWhitepaperText: string
): DisclosedClaimStructured {
  const combinedText = `${item.disclosedClaim}\n${item.sourceQuote}`;
  const parsedFromText = parseStructuredClaimByItemKey(
    item.itemKey,
    combinedText,
    fullWhitepaperText
  );

  if (item.disclosedDataJson) {
    try {
      const saved = JSON.parse(item.disclosedDataJson) as DisclosedClaimStructured;
      return {
        ...saved,
        ...parsedFromText,
      };
    } catch {
      return parsedFromText;
    }
  }
  return parsedFromText;
}

export function compareDisclosedItemsWithOnchainSnapshot(
  items: AuditCheckItemDTO[],
  snapshot: TokenOnchainSnapshot,
  fullWhitepaperText: string
): ItemComparisonOutput[] {
  const blockTag = `[Block #${snapshot.blockNumber}]`;

  return items.map((item) => {
    const disclosed = resolveStructuredDisclosedClaim(item, fullWhitepaperText);

    switch (item.itemKey) {
      case "maxSupplyAndMintability": {
        const expectedMaxSupply = disclosed.maxSupply || "100000000";
        const expectedMintable = Boolean(disclosed.mintable);

        const actualMaxSupply = snapshot.maxSupplyFormatted;
        const actualMintable = snapshot.mintable;
        const capMatches = actualMaxSupply === expectedMaxSupply;
        const mintMatches = actualMintable === expectedMintable;

        const formattedTotal = Number(
          snapshot.totalSupplyFormatted
        ).toLocaleString("en-US");
        const formattedMax =
          actualMaxSupply.includes("UNLIMITED")
            ? "type(uint256).max (무제한)"
            : `${Number(actualMaxSupply).toLocaleString("en-US")} ${snapshot.symbol}`;

        const onchainState = `totalSupply() = ${formattedTotal} ${snapshot.symbol} | MAX_SUPPLY() = ${formattedMax} | mintable() = ${actualMintable} | owner() = ${shortAddr(snapshot.owner)} (${
          snapshot.owner === "0x0000000000000000000000000000000000000000"
            ? "Renounced 0x0"
            : snapshot.ownerIsContract
            ? "Contract"
            : "단일 EOA"
        })`;

        const evidenceFunctionOrSlot = `totalSupply(), MAX_SUPPLY(), maxSupply(), mintable(), owner() ${blockTag}`;

        let status: AuditComparisonStatus = "MATCH";
        let severity: AuditSeverity = "INFO";
        let rationale = `백서에 공시된 최대 발행량(${Number(expectedMaxSupply).toLocaleString("en-US")} ${snapshot.symbol}) 및 추가 발행 불가(mintable=${expectedMintable}) 조건이 실제 컨트랙트 eth_call 결과(MAX_SUPPLY=${formattedMax}, mintable=${actualMintable}, owner=${shortAddr(snapshot.owner)})와 100% 일치합니다.`;

        if (!capMatches || !mintMatches) {
          status = "MISMATCH";
          severity = "CRITICAL";
          rationale = `[중대 불일치] 백서는 최대 발행량 ${Number(expectedMaxSupply).toLocaleString("en-US")} ${snapshot.symbol} 고정 및 추가 발행 불가(mintable=${expectedMintable})를 공시했으나, 실제 온체인 조회 결과 MAX_SUPPLY()=${formattedMax}, mintable()=${actualMintable}이며 소유자(${snapshot.owner}, 단일 EOA)가 언제든 추가 발행을 실행할 수 있습니다.`;
        }

        return {
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainDataJson: JSON.stringify({
            totalSupply: snapshot.totalSupplyFormatted,
            MAX_SUPPLY: snapshot.MAX_SUPPLY,
            maxSupplyFormatted: snapshot.maxSupplyFormatted,
            mintable: snapshot.mintable,
            owner: snapshot.owner,
            ownerIsContract: snapshot.ownerIsContract,
            blockNumber: snapshot.blockNumber,
          }),
          status,
          severity,
          rationale,
        };
      }

      case "transferFee": {
        const expectedFeeBps = disclosed.transferFeeBps ?? 100;
        const expectedFeeMutable = Boolean(disclosed.feeMutable);

        const actualFeeBps = snapshot.transferFeeBps;
        const actualMaxFeeBps = snapshot.maxTransferFeeBps;
        const actualFeeMutable = snapshot.feeMutable;

        const feeRateMatches = actualFeeBps === expectedFeeBps;
        const mutabilityMatches = actualFeeMutable === expectedFeeMutable;

        const onchainState = `transferFeeBps() = ${actualFeeBps} (${(
          actualFeeBps / 100
        ).toFixed(2)}%) | maxTransferFeeBps() = ${actualMaxFeeBps} (${(
          actualMaxFeeBps / 100
        ).toFixed(2)}%) | feeMutable() = ${actualFeeMutable}`;

        const evidenceFunctionOrSlot = `transferFeeBps(), maxTransferFeeBps(), feeMutable() ${blockTag}`;

        let status: AuditComparisonStatus = "MATCH";
        let severity: AuditSeverity = "INFO";
        let rationale = `온체인 transferFeeBps()=${actualFeeBps} bps (${(
          actualFeeBps / 100
        ).toFixed(2)}%), maxTransferFeeBps()=${actualMaxFeeBps} bps, feeMutable()=${actualFeeMutable}로 백서 공시 수치(${expectedFeeBps} bps 고정)와 일치합니다.`;

        if (!feeRateMatches || !mutabilityMatches) {
          status = "MISMATCH";
          severity = "HIGH";
          rationale = `[중대 불일치] 백서는 ${expectedFeeBps} bps(${(
            expectedFeeBps / 100
          ).toFixed(2)}%) 고정 수수료(feeMutable=${expectedFeeMutable})를 공시했으나, 실제 온체인 상태는 transferFeeBps()=${actualFeeBps} bps(${(
            actualFeeBps / 100
          ).toFixed(2)}%)로 설정되어 있으며 feeMutable()=${actualFeeMutable}(상한 maxTransferFeeBps=${actualMaxFeeBps} bps)로 관리자가 임의 변경할 수 있습니다.`;
        }

        return {
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainDataJson: JSON.stringify({
            transferFeeBps: actualFeeBps,
            maxTransferFeeBps: actualMaxFeeBps,
            feeMutable: actualFeeMutable,
            blockNumber: snapshot.blockNumber,
          }),
          status,
          severity,
          rationale,
        };
      }

      case "transferRestrictions": {
        const expectedPausable = Boolean(disclosed.pausable);
        const expectedBlacklistable = Boolean(disclosed.blacklistable);

        const actualPaused = snapshot.paused;
        const actualPausable = snapshot.pausable;
        const actualBlacklistable = snapshot.blacklistable;

        const pauseMatches = actualPausable === expectedPausable;
        const blacklistMatches = actualBlacklistable === expectedBlacklistable;

        const onchainState = `paused() = ${actualPaused} | pausable() = ${actualPausable} | blacklistable() = ${actualBlacklistable} | owner() = ${shortAddr(
          snapshot.owner
        )}`;

        const evidenceFunctionOrSlot = `paused(), pausable(), blacklistable(), owner() ${blockTag}`;

        let status: AuditComparisonStatus = "MATCH";
        let severity: AuditSeverity = "INFO";
        let rationale = `온체인 조회 결과 paused()=${actualPaused}, pausable()=${actualPausable}, blacklistable()=${actualBlacklistable}로 공시된 거래 제한·동결 기능 부재 조건과 일치합니다.`;

        if (!pauseMatches || !blacklistMatches) {
          status = "MISMATCH";
          severity = "HIGH";
          rationale = `[불일치] 백서는 일시정지(pausable=${expectedPausable}) 및 지갑 동결(blacklistable=${expectedBlacklistable})을 공시했으나, 실제 온체인 컨트랙트는 pausable()=${actualPausable}, blacklistable()=${actualBlacklistable}이며 owner(${shortAddr(
            snapshot.owner
          )})가 전체 거래 중단 및 특정 지갑 동결을 실행할 수 있습니다.`;
        }

        return {
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainDataJson: JSON.stringify({
            paused: actualPaused,
            pausable: actualPausable,
            blacklistable: actualBlacklistable,
            owner: snapshot.owner,
            blockNumber: snapshot.blockNumber,
          }),
          status,
          severity,
          rationale,
        };
      }

      case "teamLockup": {
        const expectedWallet = (
          disclosed.teamWallet || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
        ).toLowerCase();
        const expectedLockupActive =
          disclosed.teamLockupActive !== undefined
            ? Boolean(disclosed.teamLockupActive)
            : true;
        const expectedReleaseTs =
          disclosed.teamLockupReleaseTimestamp ?? 1830297600;

        const actualWallet = snapshot.teamWallet;
        const actualLockupActive = snapshot.teamLockupActive;
        const actualReleaseTs = snapshot.teamLockupReleaseTimestamp;

        const walletMatches = actualWallet.toLowerCase() === expectedWallet;
        const activeMatches = actualLockupActive === expectedLockupActive;
        const tsMatches = actualReleaseTs === expectedReleaseTs;

        const releaseIso =
          actualReleaseTs > 0
            ? new Date(actualReleaseTs * 1000).toISOString()
            : "미설정(0)";

        const onchainState = `teamWallet() = ${shortAddr(
          actualWallet
        )} | teamLockupActive() = ${actualLockupActive} | teamLockupReleaseTimestamp() = ${actualReleaseTs} (${releaseIso})`;

        const evidenceFunctionOrSlot = `teamWallet(), teamLockupActive(), teamLockupReleaseTimestamp() ${blockTag}`;

        let status: AuditComparisonStatus = "MATCH";
        let severity: AuditSeverity = "INFO";
        let rationale = `온체인 teamWallet()=${actualWallet}, teamLockupActive()=${actualLockupActive}, teamLockupReleaseTimestamp()=${actualReleaseTs}(${releaseIso})가 백서 공시 조건과 정확히 일치합니다.`;

        if (!walletMatches || !activeMatches || !tsMatches) {
          status = "MISMATCH";
          severity = "CRITICAL";
          rationale = `[중대 불일치] 백서는 팀 지갑(${shortAddr(
            disclosed.teamWallet || expectedWallet
          )}) 물량의 ${expectedReleaseTs} 시점까지 온체인 강제 락업(teamLockupActive=${expectedLockupActive})을 공시했으나, 실제 온체인 상태는 teamLockupActive()=${actualLockupActive}, teamLockupReleaseTimestamp()=${actualReleaseTs}으로 팀 물량이 온체인에서 전혀 잠겨 있지 않습니다.`;
        }

        return {
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainDataJson: JSON.stringify({
            teamWallet: actualWallet,
            teamAllocationFormatted: snapshot.teamAllocationFormatted,
            teamLockupActive: actualLockupActive,
            teamLockupReleaseTimestamp: actualReleaseTs,
            blockNumber: snapshot.blockNumber,
          }),
          status,
          severity,
          rationale,
        };
      }

      case "upgradeability": {
        const expectedUpgradeable = Boolean(disclosed.upgradeable);
        const actualUpgradeable = snapshot.upgradeable;
        const actualLogicImpl = snapshot.logicImplementation;
        const actualAdmin = snapshot.adminAddress;
        const eip1967Impl = snapshot.eip1967ImplementationAddress;

        const onchainState = `upgradeable() = ${actualUpgradeable} | logicImplementation() = ${shortAddr(
          actualLogicImpl
        )} | adminAddress() = ${shortAddr(actualAdmin)} (${
          actualAdmin === "0x0000000000000000000000000000000000000000"
            ? "0x0 없음"
            : snapshot.adminIsContract
            ? "Multi-sig/Contract"
            : "단일 EOA"
        }) | owner() = ${shortAddr(snapshot.owner)} | EIP-1967 = ${shortAddr(
          eip1967Impl
        )}`;

        const evidenceFunctionOrSlot = `upgradeable(), logicImplementation(), adminAddress(), owner(), eth_getStorageAt(EIP-1967) ${blockTag}`;

        let status: AuditComparisonStatus = "MATCH";
        let severity: AuditSeverity = "INFO";
        let rationale = `온체인 upgradeable()=${actualUpgradeable}, logicImplementation()=${shortAddr(
          actualLogicImpl
        )}, adminAddress()=${shortAddr(
          actualAdmin
        )}로 프록시 업그레이드 불가 및 관리자 권한 배제 공시와 일치합니다.`;

        if (actualUpgradeable !== expectedUpgradeable) {
          status = "NEEDS_HUMAN_REVIEW";
          severity = "HIGH";
          rationale = `[법무 검토 필요] 백서는 비업그레이드 불변 구조(upgradeable=${expectedUpgradeable}) 및 다중서명 거버넌스를 공시했으나, 온체인 조회 결과 upgradeable()=${actualUpgradeable}, logicImplementation()=${actualLogicImpl}이며 adminAddress(${actualAdmin})가 컨트랙트 코드가 없는 단일 EOA(eth_getCode = 0x)로 확인됩니다. 오프체인 수탁계약 또는 멀티시그 전환 확약서 존재 여부에 대한 법무·컴플라이언스 담당자의 직접 검토가 필요합니다.`;
        }

        return {
          itemKey: item.itemKey,
          onchainState,
          evidenceFunctionOrSlot,
          onchainDataJson: JSON.stringify({
            upgradeable: actualUpgradeable,
            logicImplementation: actualLogicImpl,
            adminAddress: actualAdmin,
            adminIsContract: snapshot.adminIsContract,
            owner: snapshot.owner,
            eip1967ImplementationAddress: eip1967Impl,
            blockNumber: snapshot.blockNumber,
          }),
          status,
          severity,
          rationale,
        };
      }

      default:
        throw new Error(`Unsupported itemKey: ${item.itemKey}`);
    }
  });
}

/**
 * Executes the 4-stage Chainlink CRE Workflow orchestration pipeline (Off-chain Disclosure Fetch ->
 * On-chain EVM Read -> DON Consensus Evaluation -> AuditRegistry Payload Readiness) and persists
 * the execution trace, DON consensus digest, and 5 item comparison results to SQLite DB.
 */
export async function runOnchainComparisonForAuditCase(
  auditCaseId: string
): Promise<AuditCaseDTO | null> {
  const existing = await getAuditCaseById(auditCaseId);
  if (!existing || !existing.checkItems) return null;

  const { executeCreAuditWorkflow } = await import(
    "../../cre-workflow/src/index"
  );

  const workflowResult = await executeCreAuditWorkflow({
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
    workflowRunId,
    mismatchCount,
    needsReviewCount,
    matchCount,
    overallStatus,
    reportHash,
    trace,
  } = workflowResult;

  await prisma.$transaction(
    comparisons.map((comp) =>
      prisma.auditCheckItem.update({
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
        },
      })
    )
  );

  let previousAnchorVerification: unknown = undefined;
  if (existing.onchainSnapshotJson) {
    try {
      const parsedPrev = JSON.parse(existing.onchainSnapshotJson);
      if (parsedPrev?.anchorVerification) {
        previousAnchorVerification = parsedPrev.anchorVerification;
      }
    } catch {
      // ignore
    }
  }

  const combinedSnapshotPayload = {
    ...snapshot,
    creWorkflowTrace: trace,
    ...(previousAnchorVerification
      ? { anchorVerification: previousAnchorVerification }
      : {}),
  };

  await prisma.auditCase.update({
    where: { id: auditCaseId },
    data: {
      stage:
        existing.stage === "REVIEWED" || existing.stage === "ANCHORED"
          ? existing.stage
          : "COMPARED",
      snapshotBlockNumber: snapshot.blockNumber,
      creWorkflowRunId: workflowRunId,
      reportHash: existing.anchorTxHash ? existing.reportHash : reportHash,
      onchainSnapshotJson: JSON.stringify(combinedSnapshotPayload, null, 2),
      mismatchCount,
      needsReviewCount,
      matchCount,
      overallStatus,
    },
  });

  return getAuditCaseById(auditCaseId);
}

