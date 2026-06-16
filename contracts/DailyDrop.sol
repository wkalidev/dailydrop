// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DailyDrop
 * @notice Check-in quotidien on-chain. Streak 7 jours = 10 DROP tokens.
 */
contract DailyDrop is ERC20, Ownable {
    uint256 public constant CHECKIN_INTERVAL = 86400; // 24h en secondes
    uint256 public constant STREAK_TARGET = 7;
    uint256 public constant REWARD_AMOUNT = 10 * 10 ** 18; // 10 DROP
    
    // ENHANCEMENT: Track check-ins by day number instead of timestamp
    uint256 public constant SECONDS_PER_DAY = 86400;
    uint256 public genesisDay; // Day 0 reference

    struct UserData {
        uint256 streak;
        uint256 lastCheckIn;
        uint256 totalCheckIns;
        uint256 lastCheckInDay; // ENHANCEMENT: Track by day number
    }

    mapping(address => UserData) private userData;

    // Cap on owner-minted initial supply — Solidity 0.8.20 protects all arithmetic from overflow natively
    uint256 public constant MAX_INITIAL_SUPPLY = 1_000_000 * 10**18; // 1M DROP max
    uint256 public initialMinted;

    event CheckIn(address indexed user, uint256 streak, uint256 timestamp);
    event RewardClaimed(address indexed user, uint256 amount);
    event StreakReset(address indexed user);
    event MintInitial(address indexed to, uint256 amount);

    constructor() ERC20("DailyDrop", "DROP") Ownable(msg.sender) {
        genesisDay = block.timestamp / SECONDS_PER_DAY;
    }

    /**
     * @notice Get current day number since genesis (immune to timestamp manipulation within same day)
     */
    function getCurrentDay() public view returns (uint256) {
        return (block.timestamp / SECONDS_PER_DAY) - genesisDay;
    }

    /**
     * @notice Check-in quotidien avec protection contre manipulation des timestamps.
     */
    function checkIn() external {
        UserData storage user = userData[msg.sender];
        uint256 currentDay = getCurrentDay();
        uint256 lastDay = user.lastCheckInDay;
        
        require(
            currentDay > lastDay,
            "DailyDrop: already checked in today"
        );
        
        // If missed more than 1 day, reset streak
        if (lastDay > 0 && currentDay > lastDay + 1) {
            user.streak = 0;
            emit StreakReset(msg.sender);
        }
        
        // ENHANCEMENT: Store actual time separately for transparency
        user.streak += 1;
        user.lastCheckIn = block.timestamp;
        user.lastCheckInDay = currentDay;
        user.totalCheckIns += 1;
        
        emit CheckIn(msg.sender, user.streak, block.timestamp);
    }

    /**
     * @notice Claim 10 DROP si streak >= 7. Remet le streak à 0.
     * @dev No reentrancy risk: _mint() does not call external contracts.
     *      CHECKIN_INTERVAL = 86400s; block.timestamp drift from miners is at most ~15s — acceptable.
     */
    function claimReward() external {
        UserData storage user = userData[msg.sender];
        
        require(user.streak >= STREAK_TARGET, "DailyDrop: streak not reached");
        
        user.streak = 0;
        emit StreakReset(msg.sender);
        _mint(msg.sender, REWARD_AMOUNT);
        
        emit RewardClaimed(msg.sender, REWARD_AMOUNT);
    }

    /**
     * @notice Retourne le streak actuel de l'utilisateur.
     */
    function getStreak(address _user) external view returns (uint256) {
        return userData[_user].streak;
    }

    /**
     * @notice Retourne le timestamp du dernier check-in.
     */
    function getLastCheckIn(address _user) external view returns (uint256) {
        return userData[_user].lastCheckIn;
    }
    
    /**
     * @notice Retourne le jour du dernier check-in.
     */
    function getLastCheckInDay(address _user) external view returns (uint256) {
        return userData[_user].lastCheckInDay;
    }

    /**
     * @notice Retourne toutes les données de l'utilisateur.
     */
    function getUserData(address _user)
        external
        view
        returns (
            uint256 streak,
            uint256 lastCheckIn,
            uint256 totalCheckIns,
            bool canCheckIn,
            bool canClaim,
            uint256 nextCheckIn,
            uint256 currentDay  // ENHANCEMENT: Added current day
        )
    {
        UserData memory u = userData[_user];
        currentDay = getCurrentDay();
        streak = u.streak;
        lastCheckIn = u.lastCheckIn;
        totalCheckIns = u.totalCheckIns;
        canCheckIn = currentDay > u.lastCheckInDay;
        canClaim = u.streak >= STREAK_TARGET;
        nextCheckIn = u.lastCheckIn > 0 ? u.lastCheckIn + CHECKIN_INTERVAL : 0;
    }

    /**
     * @notice Mint de tokens DROP par l'owner (pour liquidity initiale).
     */
    function mintInitial(address to, uint256 amount) external onlyOwner {
        require(initialMinted + amount <= MAX_INITIAL_SUPPLY, "DailyDrop: initial supply cap reached");
        initialMinted += amount;
        _mint(to, amount);
        emit MintInitial(to, amount);
    }
}
