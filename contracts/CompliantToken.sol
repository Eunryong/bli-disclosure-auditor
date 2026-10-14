// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CompliantToken (BLI-C)
 * @notice Demo token that 100% complies with its disclosure whitepaper claims.
 *         - Fixed Max Supply: 100,000,000 * 10^18 (no mint function, mintable = false)
 *         - Fixed Transfer Fee: 100 bps (1.00%, immutable, feeMutable = false)
 *         - No Transfer Restrictions: pausable = false, blacklistable = false
 *         - Enforced On-chain Team Lockup: 20,000,000 tokens locked until 2028-01-01 00:00:00 UTC (1830297600)
 *         - Immutable Governance: non-upgradeable, no privileged admin EOA (owner = address(0))
 */
contract CompliantToken {
    string public constant name = "BLI Compliant Utility Token";
    string public constant symbol = "BLIC";
    uint8 public constant decimals = 18;

    // 1. Max Supply & Mintability (Immutable & Fixed at 100,000,000 BLIC)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10 ** 18;
    uint256 public immutable totalSupply;
    bool public constant mintable = false;
    address public constant owner = address(0); // Ownership permanently renounced at genesis

    // 2. Transfer Fee (Fixed at 100 bps = 1.00%, cannot be modified)
    uint256 public constant transferFeeBps = 100;
    uint256 public constant maxTransferFeeBps = 100;
    bool public constant feeMutable = false;
    address public immutable feeCollector;

    // 3. Transfer Restrictions (No Pause, No Blacklist)
    bool public constant paused = false;
    bool public constant pausable = false;
    bool public constant blacklistable = false;

    // 4. Team Allocation & On-Chain Lockup (20% = 20,000,000 BLIC locked until 2028-01-01 UTC)
    address public immutable teamWallet;
    uint256 public constant teamAllocation = 20_000_000 * 10 ** 18;
    bool public constant teamLockupActive = true;
    uint256 public constant teamLockupReleaseTimestamp = 1830297600; // 2028-01-01T00:00:00Z

    // 5. Upgradeability & Admin Structure (Non-upgradeable standalone contract)
    bool public constant upgradeable = false;
    address public constant adminAddress = address(0);
    address public constant logicImplementation = address(0);

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error TeamTokensLockedUntilRelease(uint256 releaseTimestamp, uint256 currentTimestamp);
    error InsufficientBalance(uint256 available, uint256 required);
    error InsufficientAllowance(uint256 available, uint256 required);
    error InvalidAddress();

    constructor(address _teamWallet, address _treasuryWallet, address _feeCollector) {
        if (_teamWallet == address(0) || _treasuryWallet == address(0) || _feeCollector == address(0)) {
            revert InvalidAddress();
        }
        teamWallet = _teamWallet;
        feeCollector = _feeCollector;
        totalSupply = MAX_SUPPLY;

        uint256 treasuryAllocation = MAX_SUPPLY - teamAllocation;
        balanceOf[_teamWallet] = teamAllocation;
        balanceOf[_treasuryWallet] = treasuryAllocation;

        emit Transfer(address(0), _teamWallet, teamAllocation);
        emit Transfer(address(0), _treasuryWallet, treasuryAllocation);
    }

    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function isBlacklisted(address) external pure returns (bool) {
        return false;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance < amount) {
            revert InsufficientAllowance(currentAllowance, amount);
        }
        unchecked {
            allowance[from][msg.sender] = currentAllowance - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (from == address(0) || to == address(0)) revert InvalidAddress();

        // Enforce on-chain team lockup schedule
        if (from == teamWallet && block.timestamp < teamLockupReleaseTimestamp) {
            revert TeamTokensLockedUntilRelease(teamLockupReleaseTimestamp, block.timestamp);
        }

        uint256 fromBalance = balanceOf[from];
        if (fromBalance < amount) {
            revert InsufficientBalance(fromBalance, amount);
        }

        uint256 feeAmount = (amount * transferFeeBps) / 10_000;
        uint256 netAmount = amount - feeAmount;

        unchecked {
            balanceOf[from] = fromBalance - amount;
            balanceOf[to] += netAmount;
            if (feeAmount > 0) {
                balanceOf[feeCollector] += feeAmount;
            }
        }

        emit Transfer(from, to, netAmount);
        if (feeAmount > 0) {
            emit Transfer(from, feeCollector, feeAmount);
        }
    }
}
