// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IStreakNFT {
    function mintOrUpdate(address user, uint256 streak, string calldata chain) external;
}

interface IDailyDrop {
    function mintInitial(address to, uint256 amount) external;
}

/**
 * @title StreakMaster
 * @notice Cross-chain source of truth for DailyDrop streak.
 *         Deployed on Base. Receives check-ins from Celo, Base, and Stacks
 *         via authorized relayers.
 */
contract StreakMaster is Ownable, ReentrancyGuard {

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant CHECKIN_INTERVAL  = 20 hours;
    uint256 public constant STREAK_RESET_TIME = 48 hours;
    uint256 public constant STREAK_TARGET     = 7;
    uint256 public constant REWARD_AMOUNT     = 10 * 10 ** 18;

    // ─── State ────────────────────────────────────────────────────────────────
    struct UserData {
        uint256 streak;
        uint256 lastUpdate;
        uint256 totalCheckIns;
        string  lastChain;
        uint256 lastRewardTimestamp;     // NEW: When last reward was claimed
        uint256 cachedStreakValue;       // NEW: Cached streak for quick calculations
        uint256 streakHistoryHash;       // NEW: Hash of previous streaks
    }

    mapping(address => UserData)  private userData;
    mapping(address => bool)      public  relayers;
    mapping(string  => address)   public  dropContracts;
    address public streakNFT;
    mapping(bytes32 => bool) public usedTxProofs;

    // ─── Cached Calculations - Daily Aggregates ───────────────────────────────
    
    // Daily statistics (key = timestamp / 1 day)
    mapping(uint256 => uint256) public dailyCheckIns;      // day -> total check-ins
    mapping(uint256 => uint256) public dailyUniqueUsers;   // day -> unique users
    mapping(uint256 => uint256) public dailyRewards;       // day -> total rewards distributed
    mapping(uint256 => uint256) public dailyAverageStreak; // day -> average streak (cached)
    
    // User streak history for analytics
    mapping(address => uint256[]) public userStreakHistory; // User's streak history
    
    // Global cached statistics
    struct GlobalStats {
        uint256 totalUsers;
        uint256 totalCheckInsProcessed;
        uint256 totalRewardsDistributed;
        uint256 totalRewardAmount;
        uint256 averageStreak;
        uint256 lastUpdateTimestamp;
        uint256 peakConcurrentStreak;    // Highest streak ever
        address peakStreakUser;          // Who had the highest streak
    }
    
    GlobalStats public globalStats;
    
    // Leaderboard cache (top 10)
    struct LeaderboardEntry {
        address user;
        uint256 streak;
        uint256 totalCheckIns;
    }
    
    LeaderboardEntry[10] public topStreaks;  // Fixed size for gas efficiency
    mapping(address => uint256) public userRank;  // Position in leaderboard
    
    // Streak tiers cache
    struct StreakTier {
        uint256 threshold;
        uint256 rewardMultiplier;
        bool specialBadge;
    }
    
    StreakTier[] public streakTiers;
    mapping(address => mapping(uint256 => bool)) public userTierAchieved; // user -> tierIndex -> achieved
    
    // Time-weighted streak (exponential decay for inactive users)
    mapping(address => uint256) public timeWeightedStreak;
    
    // Performance cache for relayers
    mapping(address => uint256) public relayerDailyCalls;     // relayer -> day -> calls
    mapping(address => uint256) public relayerTotalProcessed; // relayer -> total processed

    // ─── Events ───────────────────────────────────────────────────────────────
    event StreakUpdated(address indexed user, uint256 streak, string chain, uint256 timestamp);
    event StreakReset(address indexed user, string reason);
    event RewardTriggered(address indexed user, string chain, uint256 amount);
    event RelayerSet(address indexed relayer, bool active);
    event DropContractSet(string chain, address contractAddr);
    event NFTContractSet(address nftContract);
    
    // NEW: Cached calculation events
    event DailyStatsUpdated(uint256 indexed day, uint256 checkIns, uint256 uniqueUsers, uint256 totalRewards);
    event LeaderboardUpdated(address indexed user, uint256 rank, uint256 streak);
    event TierAchieved(address indexed user, uint256 tierIndex, uint256 streak);
    event GlobalStatsUpdated(uint256 totalUsers, uint256 avgStreak, uint256 peakStreak);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyRelayer() {
        require(relayers[msg.sender] || msg.sender == owner(), "StreakMaster: not a relayer");
        _;
    }

    constructor() Ownable(msg.sender) {
        // Initialize streak tiers
        streakTiers.push(StreakTier(7, 100, false));   // Bronze
        streakTiers.push(StreakTier(14, 150, false));  // Silver
        streakTiers.push(StreakTier(30, 200, true));   // Gold + badge
        streakTiers.push(StreakTier(60, 300, true));   // Platinum + badge
        streakTiers.push(StreakTier(100, 500, true));  // Diamond + badge
        streakTiers.push(StreakTier(365, 1000, true)); // Legendary + badge
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function setRelayer(address relayer, bool active) external onlyOwner {
        relayers[relayer] = active;
        emit RelayerSet(relayer, active);
    }

    function setDropContract(string calldata chain, address contractAddr) external onlyOwner {
        dropContracts[chain] = contractAddr;
        emit DropContractSet(chain, contractAddr);
    }

    function setStreakNFT(address nftContract) external onlyOwner {
        streakNFT = nftContract;
        emit NFTContractSet(nftContract);
    }

    // ─── Core: Called by relayer ─────────────────────────────────────────────
    function updateStreak(
        address user,
        string calldata chain,
        bytes32 txProof
    ) external onlyRelayer nonReentrant {
        require(!usedTxProofs[txProof], "StreakMaster: txProof already used");  
        require(user != address(0), "StreakMaster: zero address");
        require(bytes(chain).length > 0, "StreakMaster: empty chain");
        
        usedTxProofs[txProof] = true;
        UserData storage u = userData[user];
        uint256 now_ = block.timestamp;
        uint256 day = now_ / 1 days;

        // Update relayer stats cache
        relayerDailyCalls[msg.sender] = (relayerDailyCalls[msg.sender] / 1 days == day ? 
                                         relayerDailyCalls[msg.sender] + 1 : 1);
        relayerTotalProcessed[msg.sender]++;

        // Too early for a new check-in
        require(now_ >= u.lastUpdate + CHECKIN_INTERVAL, "StreakMaster: too soon");

        // Reset if too long without check-in
        bool wasReset = false;
        if (u.lastUpdate > 0 && now_ > u.lastUpdate + STREAK_RESET_TIME) {
            u.streak = 0;
            wasReset = true;
            emit StreakReset(user, "timeout");
            
            // Update time-weighted streak on reset
            _updateTimeWeightedStreak(user, u.streak);
        }

        // Store old streak for tier checking
        uint256 oldStreak = u.streak;
        
        // Update
        u.streak += 1;
        u.lastUpdate = now_;
        u.totalCheckIns += 1;
        u.lastChain = chain;
        u.cachedStreakValue = u.streak; // Cache the new streak value
        
        // Update streak history (keep last 10 for gas efficiency)
        if (userStreakHistory[user].length >= 10) {
            // Shift array - remove oldest
            for (uint i = 0; i < 9; i++) {
                userStreakHistory[user][i] = userStreakHistory[user][i + 1];
            }
            userStreakHistory[user][9] = u.streak;
        } else {
            userStreakHistory[user].push(u.streak);
        }
        
        // Calculate streak history hash for verification
        u.streakHistoryHash = uint256(keccak256(abi.encodePacked(u.streakHistoryHash, u.streak, now_)));

        emit StreakUpdated(user, u.streak, chain, now_);

        // Update daily aggregates
        _updateDailyStats(user, day, !wasReset && oldStreak == 0);
        
        // Check and update tier achievements
        _checkTierAchievements(user, u.streak);
        
        // Update global stats and leaderboard
        _updateGlobalStats(user, u.streak);
        _updateLeaderboard(user, u.streak, u.totalCheckIns);

        // Reward if streak target reached
        if (u.streak >= STREAK_TARGET) {
            u.lastRewardTimestamp = now_;
            u.streak = 0;  // Reset after reward
            u.cachedStreakValue = 0;
            emit StreakReset(user, "claimed");
            _triggerReward(user, chain);
            
            // Update daily rewards cache
            dailyRewards[day] += REWARD_AMOUNT;
            globalStats.totalRewardsDistributed++;
            globalStats.totalRewardAmount += REWARD_AMOUNT;
        }

        // Update NFT (non-blocking)
        _updateNFT(user, u.streak, chain);
        
        // Update time-weighted streak after all changes
        _updateTimeWeightedStreak(user, u.streak);
    }

    // ─── Cached Calculations Helpers ──────────────────────────────────────────
    
    function _updateDailyStats(address user, uint256 day, bool isNewUser) internal {
        dailyCheckIns[day]++;
        
        if (isNewUser) {
            dailyUniqueUsers[day]++;
        }
        
        // Update daily average streak (lazy calculation - can be computed off-chain)
        if (dailyAverageStreak[day] == 0) {
            dailyAverageStreak[day] = userData[user].streak;
        } else {
            // This is a simplified average - for accurate average, we'd need to store sum and count
            dailyAverageStreak[day] = (dailyAverageStreak[day] + userData[user].streak) / 2;
        }
        
        emit DailyStatsUpdated(day, dailyCheckIns[day], dailyUniqueUsers[day], dailyRewards[day]);
    }
    
    function _updateGlobalStats(address user, uint256 newStreak) internal {
        // Update total users if new
        if (userData[user].totalCheckIns == 1) {
            globalStats.totalUsers++;
        }
        
        globalStats.totalCheckInsProcessed++;
        globalStats.lastUpdateTimestamp = block.timestamp;
        
        // Track peak streak
        if (newStreak > globalStats.peakConcurrentStreak) {
            globalStats.peakConcurrentStreak = newStreak;
            globalStats.peakStreakUser = user;
        }
        
        // Update average streak (moving average for gas efficiency)
        if (globalStats.totalUsers > 0) {
            uint256 totalStreak = globalStats.averageStreak * (globalStats.totalUsers - 1) + newStreak;
            globalStats.averageStreak = totalStreak / globalStats.totalUsers;
        } else {
            globalStats.averageStreak = newStreak;
        }
        
        emit GlobalStatsUpdated(globalStats.totalUsers, globalStats.averageStreak, globalStats.peakConcurrentStreak);
    }
    
    function _updateLeaderboard(address user, uint256 streak, uint256 totalCheckIns) internal {
        // Find if user is already in top 10
        int256 userIndex = -1;
        for (uint i = 0; i < topStreaks.length; i++) {
            if (topStreaks[i].user == user) {
                userIndex = int256(i);
                break;
            }
        }
        
        // If user exists, update their streak
        if (userIndex >= 0) {
            topStreaks[uint256(userIndex)].streak = streak;
            topStreaks[uint256(userIndex)].totalCheckIns = totalCheckIns;
        } 
        // If user not in top 10 but streak is high enough
        else if (streak > topStreaks[9].streak) {
            topStreaks[9] = LeaderboardEntry(user, streak, totalCheckIns);
            userIndex = 9;
        } else {
            return; // No leaderboard update needed
        }
        
        // Sort leaderboard (simple bubble sort for small array)
        for (uint i = 0; i < topStreaks.length - 1; i++) {
            for (uint j = i + 1; j < topStreaks.length; j++) {
                if (topStreaks[i].streak < topStreaks[j].streak) {
                    LeaderboardEntry memory temp = topStreaks[i];
                    topStreaks[i] = topStreaks[j];
                    topStreaks[j] = temp;
                    
                    // Update ranks
                    userRank[topStreaks[i].user] = i;
                    userRank[topStreaks[j].user] = j;
                }
            }
        }
        
        // Update ranks for top entries
        for (uint i = 0; i < topStreaks.length; i++) {
            if (topStreaks[i].user != address(0)) {
                userRank[topStreaks[i].user] = i;
            }
        }
        
        if (userIndex >= 0) {
            emit LeaderboardUpdated(user, uint256(userIndex), streak);
        }
    }
    
    function _checkTierAchievements(address user, uint256 streak) internal {
        for (uint i = 0; i < streakTiers.length; i++) {
            if (streak >= streakTiers[i].threshold && !userTierAchieved[user][i]) {
                userTierAchieved[user][i] = true;
                emit TierAchieved(user, i, streak);
                
                // Bonus reward for tier achievement
                if (streakTiers[i].specialBadge) {
                    // Trigger special reward
                    _triggerSpecialTierReward(user, i);
                }
            }
        }
    }
    
    function _triggerSpecialTierReward(address user, uint256 tierIndex) internal {
        uint256 bonusAmount = REWARD_AMOUNT * streakTiers[tierIndex].rewardMultiplier / 100;
        // This would call a special mint function on your token contract
        emit RewardTriggered(user, "special_tier", bonusAmount);
    }
    
    function _updateTimeWeightedStreak(address user, uint256 currentStreak) internal {
        // Exponential decay: old_streak * 0.9 + new_streak * 0.1
        uint256 oldWeighted = timeWeightedStreak[user];
        if (oldWeighted == 0) {
            timeWeightedStreak[user] = currentStreak;
        } else {
            timeWeightedStreak[user] = (oldWeighted * 9 + currentStreak) / 10;
        }
    }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _triggerReward(address user, string memory chain) internal {
        address dropAddr = dropContracts[chain];
        if (dropAddr != address(0)) {
            try IDailyDrop(dropAddr).mintInitial(user, REWARD_AMOUNT) {
                emit RewardTriggered(user, chain, REWARD_AMOUNT);
            } catch {
                emit RewardTriggered(user, chain, 0);
            }
        }
    }

    function _updateNFT(address user, uint256 streak, string memory chain) internal {
        if (streakNFT != address(0)) {
            try IStreakNFT(streakNFT).mintOrUpdate(user, streak, chain) {} catch {}
        }
    }

    // ─── Views with Cached Calculations ───────────────────────────────────────
    
    function getUserData(address user) external view returns (
        uint256 streak,
        uint256 lastUpdate,
        uint256 totalCheckIns,
        string memory lastChain,
        bool canCheckIn,
        uint256 nextCheckIn,
        uint256 timeWeightedStreakValue,  // NEW
        uint256 rank                      // NEW
    ) {
        UserData memory u = userData[user];
        streak = u.streak;
        lastUpdate = u.lastUpdate;
        totalCheckIns = u.totalCheckIns;
        lastChain = u.lastChain;
        canCheckIn = block.timestamp >= u.lastUpdate + CHECKIN_INTERVAL;
        nextCheckIn = u.lastUpdate > 0 ? u.lastUpdate + CHECKIN_INTERVAL : 0;
        timeWeightedStreakValue = timeWeightedStreak[user];
        rank = userRank[user];
    }
    
    function getStreak(address user) external view returns (uint256) {
        return userData[user].streak;
    }
    
    // NEW: Get cached streak value (faster than computing)
    function getCachedStreak(address user) external view returns (uint256) {
        return userData[user].cachedStreakValue;
    }
    
    // NEW: Get today's statistics
    function getTodaysStats() external view returns (
        uint256 checkIns,
        uint256 uniqueUsers,
        uint256 rewards,
        uint256 avgStreak
    ) {
        uint256 today = block.timestamp / 1 days;
        return (
            dailyCheckIns[today],
            dailyUniqueUsers[today],
            dailyRewards[today],
            dailyAverageStreak[today]
        );
    }
    
    // NEW: Get stats for specific day
    function getDailyStats(uint256 day) external view returns (
        uint256 checkIns,
        uint256 uniqueUsers,
        uint256 rewards,
        uint256 avgStreak
    ) {
        return (
            dailyCheckIns[day],
            dailyUniqueUsers[day],
            dailyRewards[day],
            dailyAverageStreak[day]
        );
    }
    
    // NEW: Get user's streak history (last N check-ins)
    function getUserStreakHistory(address user) external view returns (uint256[] memory) {
        return userStreakHistory[user];
    }
    
    // NEW: Get user's tier achievements
    function getUserTiers(address user) external view returns (
        uint256[] memory achievedTiers,
        uint256[] memory thresholds
    ) {
        uint256 count = 0;
        for (uint i = 0; i < streakTiers.length; i++) {
            if (userTierAchieved[user][i]) {
                count++;
            }
        }
        
        achievedTiers = new uint256[](count);
        thresholds = new uint256[](count);
        
        uint256 index = 0;
        for (uint i = 0; i < streakTiers.length; i++) {
            if (userTierAchieved[user][i]) {
                achievedTiers[index] = i;
                thresholds[index] = streakTiers[i].threshold;
                index++;
            }
        }
    }
    
    // NEW: Get next tier for user
    function getNextTier(address user) external view returns (
        uint256 nextThreshold,
        uint256 currentStreak,
        uint256 neededStreak,
        uint256 rewardMultiplier
    ) {
        currentStreak = userData[user].streak;
        for (uint i = 0; i < streakTiers.length; i++) {
            if (currentStreak < streakTiers[i].threshold && !userTierAchieved[user][i]) {
                nextThreshold = streakTiers[i].threshold;
                neededStreak = streakTiers[i].threshold - currentStreak;
                rewardMultiplier = streakTiers[i].rewardMultiplier;
                break;
            }
        }
    }
    
    // NEW: Get relayer performance stats
    function getRelayerStats(address relayer) external view returns (
        uint256 dailyCalls,
        uint256 totalProcessed,
        uint256 lastActiveDay
    ) {
        uint256 today = block.timestamp / 1 days;
        dailyCalls = relayerDailyCalls[relayer];
        totalProcessed = relayerTotalProcessed[relayer];
        lastActiveDay = dailyCalls > 0 ? today : 0;
    }
    
    // NEW: Get global stats summary
    function getGlobalStats() external view returns (
        uint256 totalUsers,
        uint256 totalCheckIns,
        uint256 totalRewardsDistributed,
        uint256 totalRewardAmount,
        uint256 averageStreak,
        uint256 peakStreak,
        address peakStreakUser
    ) {
        return (
            globalStats.totalUsers,
            globalStats.totalCheckInsProcessed,
            globalStats.totalRewardsDistributed,
            globalStats.totalRewardAmount,
            globalStats.averageStreak,
            globalStats.peakConcurrentStreak,
            globalStats.peakStreakUser
        );
    }
    
    // NEW: Get full leaderboard
    function getLeaderboard() external view returns (LeaderboardEntry[10] memory) {
        return topStreaks;
    }
    
    // NEW: Get user rank with pagination
    function getUserRankDetails(address user) external view returns (
        uint256 rank,
        uint256 streak,
        uint256 totalCheckIns,
        uint256 timeWeightedValue
    ) {
        rank = userRank[user];
        streak = userData[user].streak;
        totalCheckIns = userData[user].totalCheckIns;
        timeWeightedValue = timeWeightedStreak[user];
    }
    
    // NEW: Get streak projection (predicts when user will reach next tier)
    function getStreakProjection(address user) external view returns (
        uint256 daysToNextTier,
        uint256 estimatedDate
    ) {
        uint256 currentStreak = userData[user].streak;
        uint256 nextThreshold = 0;
        
        for (uint i = 0; i < streakTiers.length; i++) {
            if (currentStreak < streakTiers[i].threshold) {
                nextThreshold = streakTiers[i].threshold;
                break;
            }
        }
        
        if (nextThreshold > 0) {
            uint256 needed = nextThreshold - currentStreak;
            daysToNextTier = needed; // Assuming daily check-ins
            estimatedDate = block.timestamp + (daysToNextTier * 1 days);
        }
    }
}
