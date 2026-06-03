// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IDailyDrop {
    function getStreak(address _user) external view returns (uint256);
    function getUserData(address _user) external view returns (
        uint256 streak,
        uint256 lastCheckIn,
        uint256 totalCheckIns,
        bool canCheckIn,
        bool canClaim,
        uint256 nextCheckIn
    );
}

/**
 * @title DailyDropShield
 * @notice Proof of Presence verification layer.
 * Any project can call verify() to check if an address is a real active human.
 * A streak = behavioral proof of humanity. No KYC. No passport scan.
 * Just: "this wallet showed up every day."
 */
contract DailyDropShield is Ownable {

    // ─── Storage ──────────────────────────────────────────────────────────────

    IDailyDrop public dailyDropCelo;
    IDailyDrop public dailyDropBase;

    // Projects registered to use Shield API on-chain
    mapping(address => bool) public registeredProjects;
    mapping(address => string) public projectNames;
    mapping(address => uint256) public projectVerificationCount;

    // Verified humans cache (optional — reduces RPC calls)
    mapping(address => uint256) public lastVerifiedStreak;
    mapping(address => uint256) public lastVerifiedAt;

    // Shield badges — soulbound proof of streak milestones
    mapping(address => uint256) public highestStreak;
    mapping(address => bool)    public badge7;   // 7  days streak
    mapping(address => bool)    public badge30;  // 30 days streak
    mapping(address => bool)    public badge100; // 100 days streak

    // Fees
    uint256 public verificationFee = 0; // Free for now, can be set later
    uint256 public registrationFee = 0;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ProjectRegistered(address indexed project, string name);
    event VerificationRequested(address indexed project, address indexed user, uint256 streak, bool passed);
    event BadgeEarned(address indexed user, uint256 milestone);
    event StreakUpdated(address indexed user, uint256 newStreak);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address _dailyDropCelo,
        address _dailyDropBase
    ) Ownable(msg.sender) {
        dailyDropCelo = IDailyDrop(_dailyDropCelo);
        dailyDropBase = IDailyDrop(_dailyDropBase);
    }

    // ─── Core: Verify ─────────────────────────────────────────────────────────

    /**
     * @notice Verify if a user meets the minimum streak requirement.
     * @param user       The wallet address to verify
     * @param minStreak  Minimum streak required (e.g. 7, 30)
     * @return passed    True if user meets requirement
     * @return streak    The actual streak of the user
     * @return badge     The highest badge level (0=none, 1=7days, 2=30days, 3=100days)
     */
    function verify(
        address user,
        uint256 minStreak
    ) external returns (bool passed, uint256 streak, uint8 badge) {
        streak = _getMaxStreak(user);

        // Update badge if new record
        _updateBadge(user, streak);

        passed = streak >= minStreak;

        // Track stats
        if (registeredProjects[msg.sender]) {
            projectVerificationCount[msg.sender]++;
        }

        // Update cache
        lastVerifiedStreak[user] = streak;
        lastVerifiedAt[user]     = block.timestamp;

        badge = _getBadgeLevel(user);

        emit VerificationRequested(msg.sender, user, streak, passed);
    }

    /**
     * @notice Read-only version of verify (no state changes, free to call)
     */
    function verifyView(
        address user,
        uint256 minStreak
    ) external view returns (bool passed, uint256 streak, uint8 badge) {
        streak = _getMaxStreakView(user);
        passed = streak >= minStreak;
        badge  = _getBadgeLevel(user);
    }

    // ─── Projects ─────────────────────────────────────────────────────────────

    /**
     * @notice Register your project to use DailyDrop Shield
     */
    function registerProject(string calldata name) external payable {
        require(msg.value >= registrationFee, "DailyDropShield: insufficient fee");
        registeredProjects[msg.sender] = true;
        projectNames[msg.sender]       = name;
        emit ProjectRegistered(msg.sender, name);
    }

    // ─── Badges ───────────────────────────────────────────────────────────────

    /**
     * @notice Manually sync and update your badge based on current streak
     */
    function syncBadge() external {
        uint256 streak = _getMaxStreak(msg.sender);
        _updateBadge(msg.sender, streak);
        emit StreakUpdated(msg.sender, streak);
    }

    /**
     * @notice Get the full profile of a user
     */
    function getProfile(address user) external view returns (
        uint256 streak,
        uint256 highest,
        bool b7,
        bool b30,
        bool b100,
        uint8  badgeLevel,
        uint256 cachedAt
    ) {
        streak     = _getMaxStreakView(user);
        highest    = highestStreak[user];
        b7         = badge7[user];
        b30        = badge30[user];
        b100       = badge100[user];
        badgeLevel = _getBadgeLevel(user);
        cachedAt   = lastVerifiedAt[user];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _getMaxStreak(address user) internal view returns (uint256) {
        uint256 celoStreak = 0;
        uint256 baseStreak = 0;

        try dailyDropCelo.getStreak(user) returns (uint256 s) {
            celoStreak = s;
        } catch {}

        try dailyDropBase.getStreak(user) returns (uint256 s) {
            baseStreak = s;
        } catch {}

        return celoStreak > baseStreak ? celoStreak : baseStreak;
    }

    function _getMaxStreakView(address user) internal view returns (uint256) {
        return _getMaxStreak(user);
    }

    function _updateBadge(address user, uint256 streak) internal {
        if (streak > highestStreak[user]) {
            highestStreak[user] = streak;
        }
        if (!badge7[user]   && streak >= 7)   { badge7[user]   = true; emit BadgeEarned(user, 7);   }
        if (!badge30[user]  && streak >= 30)  { badge30[user]  = true; emit BadgeEarned(user, 30);  }
        if (!badge100[user] && streak >= 100) { badge100[user] = true; emit BadgeEarned(user, 100); }
    }

    function _getBadgeLevel(address user) internal view returns (uint8) {
        if (badge100[user]) return 3;
        if (badge30[user])  return 2;
        if (badge7[user])   return 1;
        return 0;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setFees(uint256 _verificationFee, uint256 _registrationFee) external onlyOwner {
        verificationFee = _verificationFee;
        registrationFee = _registrationFee;
    }

    function updateContracts(address _celo, address _base) external onlyOwner {
        dailyDropCelo = IDailyDrop(_celo);
        dailyDropBase = IDailyDrop(_base);
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
