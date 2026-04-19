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

    struct UserData {
        uint256 streak;
        uint256 lastCheckIn;
        uint256 totalCheckIns;
    }

    mapping(address => UserData) private userData;

    event CheckIn(address indexed user, uint256 streak, uint256 timestamp);
    event RewardClaimed(address indexed user, uint256 amount);
    event StreakReset(address indexed user);

    constructor() ERC20("DailyDrop", "DROP") Ownable(msg.sender) {}

    /**
     * @notice Check-in quotidien. 1 fois par 24h max.
     * Si l'utilisateur a raté un jour, le streak repart à 0.
     */
    function checkIn() external {
        UserData storage user = userData[msg.sender];
        uint256 currentTime = block.timestamp;

        require(
            currentTime >= user.lastCheckIn + CHECKIN_INTERVAL,
            "DailyDrop: already checked in today"
        );

        // Si plus de 48h depuis le dernier check-in → streak reset
        if (user.lastCheckIn > 0 && currentTime > user.lastCheckIn + CHECKIN_INTERVAL * 2) {
            user.streak = 0;
            emit StreakReset(msg.sender);
        }

        user.streak += 1;
        user.lastCheckIn = currentTime;
        user.totalCheckIns += 1;

        emit CheckIn(msg.sender, user.streak, currentTime);
    }

    /**
     * @notice Claim 10 DROP si streak >= 7. Remet le streak à 0.
     */
    function claimReward() external {
        UserData storage user = userData[msg.sender];

        require(user.streak >= STREAK_TARGET, "DailyDrop: streak not reached");

        user.streak = 0;
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
            uint256 nextCheckIn
        )
    {
        UserData memory u = userData[_user];
        streak = u.streak;
        lastCheckIn = u.lastCheckIn;
        totalCheckIns = u.totalCheckIns;
        canCheckIn = block.timestamp >= u.lastCheckIn + CHECKIN_INTERVAL;
        canClaim = u.streak >= STREAK_TARGET;
        nextCheckIn = u.lastCheckIn > 0 ? u.lastCheckIn + CHECKIN_INTERVAL : 0;
    }

    /**
     * @notice Mint de tokens DROP par l'owner (pour liquidity initiale).
     */
    function mintInitial(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
