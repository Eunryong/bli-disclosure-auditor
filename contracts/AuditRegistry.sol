// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AuditRegistry
 * @notice Minimal on-chain integrity registry for anchoring Disclosure vs. Smart Contract Audit snapshots.
 * @dev Privacy & RegTech by Design:
 *      - NEVER stores raw whitepaper text, legal review notes, or personally identifiable information (PII) on-chain.
 *      - ONLY anchors cryptographic hashes and factual snapshot metadata:
 *        (documentHash, tokenAddress, chainId, blockNumber, mismatchCount, reportHash).
 */
contract AuditRegistry {
    struct AuditAnchor {
        bytes32 documentHash;   // SHA-256 hash of the disclosed whitepaper document
        address tokenAddress;   // Audited smart contract address
        uint256 chainId;        // Target chain ID where on-chain state was inspected
        uint256 blockNumber;    // Block number of the on-chain state snapshot
        uint8 mismatchCount;    // Number of MISMATCH items confirmed in the audit (0..5)
        bytes32 reportHash;     // SHA-256 / Keccak-256 hash of the signed compliance review report
        address auditor;        // Address that submitted the anchor transaction
        uint64 anchoredAt;      // Block timestamp when the anchor was recorded
    }

    // Lookup by reportHash => AuditAnchor
    mapping(bytes32 => AuditAnchor) private _anchorsByReportHash;
    // Ordered list of all anchored reportHashes for enumeration
    bytes32[] private _reportHashes;

    event AuditAnchored(
        bytes32 indexed reportHash,
        bytes32 indexed documentHash,
        address indexed tokenAddress,
        uint256 chainId,
        uint256 blockNumber,
        uint8 mismatchCount,
        address auditor,
        uint64 anchoredAt
    );

    error EmptyDocumentHash();
    error EmptyReportHash();
    error InvalidTokenAddress();
    error ReportAlreadyAnchored(bytes32 reportHash);

    /**
     * @notice Anchors a finalized compliance audit snapshot on-chain.
     * @param documentHash SHA-256 digest of the disclosure document
     * @param tokenAddress Audited token smart contract address
     * @param chainId Chain ID of the inspected token contract
     * @param blockNumber Snapshot block height used for CRE comparison
     * @param mismatchCount Number of detected mismatches (0..5)
     * @param reportHash Cryptographic digest of the finalized audit report JSON
     */
    function recordAudit(
        bytes32 documentHash,
        address tokenAddress,
        uint256 chainId,
        uint256 blockNumber,
        uint8 mismatchCount,
        bytes32 reportHash
    ) external returns (uint256 anchorIndex) {
        if (documentHash == bytes32(0)) revert EmptyDocumentHash();
        if (reportHash == bytes32(0)) revert EmptyReportHash();
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        if (_anchorsByReportHash[reportHash].anchoredAt != 0) {
            revert ReportAlreadyAnchored(reportHash);
        }

        uint64 timestamp = uint64(block.timestamp);

        AuditAnchor memory anchor = AuditAnchor({
            documentHash: documentHash,
            tokenAddress: tokenAddress,
            chainId: chainId,
            blockNumber: blockNumber,
            mismatchCount: mismatchCount,
            reportHash: reportHash,
            auditor: msg.sender,
            anchoredAt: timestamp
        });

        _anchorsByReportHash[reportHash] = anchor;
        _reportHashes.push(reportHash);
        anchorIndex = _reportHashes.length - 1;

        emit AuditAnchored(
            reportHash,
            documentHash,
            tokenAddress,
            chainId,
            blockNumber,
            mismatchCount,
            msg.sender,
            timestamp
        );
    }

    function getAuditAnchor(bytes32 reportHash) external view returns (AuditAnchor memory) {
        return _anchorsByReportHash[reportHash];
    }

    function getAuditCount() external view returns (uint256) {
        return _reportHashes.length;
    }

    function getAuditByIndex(uint256 index) external view returns (AuditAnchor memory) {
        return _anchorsByReportHash[_reportHashes[index]];
    }

    function verifyAnchor(
        bytes32 documentHash,
        address tokenAddress,
        bytes32 reportHash
    ) external view returns (bool exists, uint256 blockNumber, uint8 mismatchCount, uint64 anchoredAt) {
        AuditAnchor memory anchor = _anchorsByReportHash[reportHash];
        if (
            anchor.anchoredAt != 0 &&
            anchor.documentHash == documentHash &&
            anchor.tokenAddress == tokenAddress
        ) {
            return (true, anchor.blockNumber, anchor.mismatchCount, anchor.anchoredAt);
        }
        return (false, 0, 0, 0);
    }
}
