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
 * @notice Source de vérité cross-chain du streak DailyDrop.
 *         Déployé sur Base. Reçoit les check-ins de Celo, Base et Stacks
 *         via des relayers autorisés.
 *
 * Flux :
 *   1. User check-in sur n'importe quelle chaîne (Celo / Base / Stacks)
 *   2. Le relayer appelle updateStreak() ici
 *   3. Si streak >= 7 → mint 10 DROP sur la chaîne native + update NFT
 */
contract StreakMaster is Ownable, ReentrancyGuard {

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant CHECKIN_INTERVAL  = 20 hours;   // min entre 2 check-ins
    uint256 public constant STREAK_RESET_TIME = 48 hours;   // au-delà → streak = 0
    uint256 public constant STREAK_TARGET     = 7;
    uint256 public constant REWARD_AMOUNT     = 10 * 10 ** 18; // 10 DROP

    // ─── State ────────────────────────────────────────────────────────────────
    struct UserData {
        uint256 streak;
        uint256 lastUpdate;      // timestamp du dernier check-in validé
        uint256 totalCheckIns;
        string  lastChain;       // "celo" | "base" | "stacks"
    }

    mapping(address => UserData)  private userData;
    mapping(address => bool)      public  relayers;      // adresses autorisées à relayer
    mapping(string  => address)   public  dropContracts; // chain → adresse DROP ERC20
    address public streakNFT;
    mapping(bytes32 => bool) public usedTxProofs;  

    // ─── Events ───────────────────────────────────────────────────────────────
    event StreakUpdated(address indexed user, uint256 streak, string chain, uint256 timestamp);
    event StreakReset(address indexed user, string reason);
    event RewardTriggered(address indexed user, string chain, uint256 amount);
    event RelayerSet(address indexed relayer, bool active);
    event DropContractSet(string chain, address contractAddr);
    event NFTContractSet(address nftContract);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier onlyRelayer() {
        require(relayers[msg.sender] || msg.sender == owner(), "StreakMaster: not a relayer");
        _;
    }

    constructor() Ownable(msg.sender) {}

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

    // ─── Core : appelé par le relayer ─────────────────────────────────────────

    /**
     * @notice Met à jour le streak d'un utilisateur depuis n'importe quelle chaîne.
     * @param user    Adresse de l'utilisateur
     * @param chain   Identifiant de la chaîne source ("celo" | "base" | "stacks")
     * @param txProof Hash de la transaction source (pour audit, non vérifié on-chain)
     */
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

        // Trop tôt pour un nouveau check-in
        require(
            now_ >= u.lastUpdate + CHECKIN_INTERVAL,
            "StreakMaster: too soon"
        );

        // Reset si trop longtemps sans check-in
        if (u.lastUpdate > 0 && now_ > u.lastUpdate + STREAK_RESET_TIME) {
            u.streak = 0;
            emit StreakReset(user, "timeout");
        }

        // Mise à jour
        u.streak        += 1;
        u.lastUpdate     = now_;
        u.totalCheckIns += 1;
        u.lastChain      = chain;

        emit StreakUpdated(user, u.streak, chain, now_);

        // Reward si streak atteint
        if (u.streak >= STREAK_TARGET) {
            u.streak = 0;
            emit StreakReset(user, "claimed");
            _triggerReward(user, chain);
        }

        // Update NFT (non bloquant)
        _updateNFT(user, u.streak, chain);
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _triggerReward(address user, string memory chain) internal {
        address dropAddr = dropContracts[chain];
        if (dropAddr != address(0)) {
            // Appel non bloquant — si le mint échoue, le streak est quand même reset
            try IDailyDrop(dropAddr).mintInitial(user, REWARD_AMOUNT) {
                emit RewardTriggered(user, chain, REWARD_AMOUNT);
            } catch {
                // Log silencieux — le user devra claim manuellement
                emit RewardTriggered(user, chain, 0);
            }
        }
    }

    function _updateNFT(address user, uint256 streak, string memory chain) internal {
        if (streakNFT != address(0)) {
            try IStreakNFT(streakNFT).mintOrUpdate(user, streak, chain) {} catch {}
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getUserData(address user) external view returns (
        uint256 streak,
        uint256 lastUpdate,
        uint256 totalCheckIns,
        string memory lastChain,
        bool canCheckIn,
        uint256 nextCheckIn
    ) {
        UserData memory u = userData[user];
        streak        = u.streak;
        lastUpdate    = u.lastUpdate;
        totalCheckIns = u.totalCheckIns;
        lastChain     = u.lastChain;
        canCheckIn    = block.timestamp >= u.lastUpdate + CHECKIN_INTERVAL;
        nextCheckIn   = u.lastUpdate > 0 ? u.lastUpdate + CHECKIN_INTERVAL : 0;
    }

    function getStreak(address user) external view returns (uint256) {
        return userData[user].streak;
    }
}
