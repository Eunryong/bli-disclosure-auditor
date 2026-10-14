// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MismatchedToken (BLI-X)
 * @notice Demo token whose whitepaper falsely claims:
 *         - "Fixed supply of 100,000,000 tokens with no additional minting"
 *         - "Fixed 1% (100 bps) transfer fee that cannot be raised"
 *         - "Permissionless transfers with no pause or address freeze/blacklist controls"
 *         - "20,000,000 team allocation locked on-chain until 2028-01-01 UTC"
 *         - "Immutable contract governed by multi-sig / timelock without proxy upgradeability"
 *
 *         Actual On-Chain Facts (Intentional Mismatches for Legal/Compliance Demo):
 *         1. Mintability: `mintable = true`, un-capped `mint(address,uint256)` callable by single EOA `owner`.
 *         2. Transfer Fee: `transferFeeBps = 500` (5.00%), `maxTransferFeeBps = 10000` (up to 100%), mutable via `setTransferFeeBps`.
 *         3. Restrictions: `pausable = true`, `blacklistable = true`; `owner` can freeze any user wallet or pause all trading.
 *         4. Team Lockup: `teamLockupActive = false`, `teamLockupReleaseTimestamp = 0` (no lockup enforced in `_transfer`).
 *         5. Upgradeability & Governance: `upgradeable = true`, single EOA `adminAddress` can swap logic target via `setLogicImplementation`.
 */
contract MismatchedToken {
    string public constant name = "BLI Alpha Protocol Token";
    string public constant symbol = "BLIX";
    uint8 public constant decimals = 18;

    // 1. Supply & Mintability (Uncapped & Open Minting by Single EOA)
    uint256 public totalSupply;
    uint256 public constant MAX_SUPPLY = type(uint256).max; // Uncapped! Whitepaper claims 100,000,000 cap
    uint256 public constant maxSupply = type(uint256).max;
    bool public constant mintable = true;                   // Minting enabled! Whitepaper claims no minting
    address public owner;

    // 2. Transfer Fee (Set to 500 bps = 5%, modifiable up to 10,000 bps = 100%)
    uint256 public transferFeeBps = 500;                    // 5.00%! Whitepaper claims fixed 100 bps (1.00%)
    uint256 public constant maxTransferFeeBps = 10_000;     // No cap protection!
    bool public constant feeMutable = true;
    address public feeCollector;

    // 3. Transfer Restrictions (Pause & Blacklist controlled by Single EOA)
    bool public paused = false;
    bool public constant pausable = true;                   // Pausable! Whitepaper claims no pause capability
    bool public constant blacklistable = true;              // Blacklistable! Whitepaper claims no address freeze
    mapping(address => bool) public isBlacklisted;

    // 4. Team Lockup (Not enforced on-chain!)
    address public teamWallet;
    uint256 public constant teamAllocation = 20_000_000 * 10 ** 18;
    bool public teamLockupActive = false;                   // False! Whitepaper claims active on-chain lockup
    uint256 public teamLockupReleaseTimestamp = 0;          // 0 (Unlocked immediately)! Whitepaper claims 1830297600

    // 5. Upgradeability & Admin Structure (Mutable implementation slot controlled by single EOA)
    bool public constant upgradeable = true;
    address public adminAddress;
    address public implementationAddress;
    address public logicImplementation;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event TransferFeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event PausedStateChanged(bool isPaused);
    event BlacklistUpdated(address indexed account, bool isBlocked);
    event ImplementationUpgraded(address indexed newImplementation);

    error OnlyOwner();
    error ContractPaused();
    error AddressBlacklisted(address account);
    error FeeExceedsMax(uint256 requestedBps);
    error InsufficientBalance(uint256 available, uint256 required);
    error InsufficientAllowance(uint256 available, uint256 required);

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    constructor(address _teamWallet, address _treasuryWallet, address _feeCollector) {
        owner = msg.sender;
        adminAddress = msg.sender;
        teamWallet = _teamWallet;
        feeCollector = _feeCollector;
        implementationAddress = 0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF;
        logicImplementation = 0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF;

        uint256 initialSupply = 100_000_000 * 10 ** 18;
        totalSupply = initialSupply;

        uint256 treasuryAllocation = initialSupply - teamAllocation;
        balanceOf[_teamWallet] = teamAllocation;
        balanceOf[_treasuryWallet] = treasuryAllocation;

        emit Transfer(address(0), _teamWallet, teamAllocation);
        emit Transfer(address(0), _treasuryWallet, treasuryAllocation);
    }

    // Privileged arbitrary mint function (contradicts fixed-supply whitepaper claim)
    function mint(address to, uint256 amount) external onlyOwner {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }

    // Privileged arbitrary fee setter (contradicts fixed 100 bps whitepaper claim)
    function setTransferFeeBps(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > maxTransferFeeBps) revert FeeExceedsMax(newFeeBps);
        uint256 oldFee = transferFeeBps;
        transferFeeBps = newFeeBps;
        emit TransferFeeUpdated(oldFee, newFeeBps);
    }

    // Privileged pause toggle (contradicts permissionless / unstoppable transfer claim)
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedStateChanged(_paused);
    }

    // Privileged wallet freeze (contradicts no-blacklist claim)
    function setBlacklisted(address account, bool blocked) external onlyOwner {
        isBlacklisted[account] = blocked;
        emit BlacklistUpdated(account, blocked);
    }

    // Privileged implementation override without timelock/multisig
    function setLogicImplementation(address newImplementation) external onlyOwner {
        implementationAddress = newImplementation;
        logicImplementation = newImplementation;
        emit ImplementationUpgraded(newImplementation);
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
        if (paused) revert ContractPaused();
        if (isBlacklisted[from]) revert AddressBlacklisted(from);
        if (isBlacklisted[to]) revert AddressBlacklisted(to);

        // NOTE: No team lockup check exists here despite whitepaper claim!
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
