// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title StreakNFT
 * @notice NFT ERC-721 soulbound avec SVG 100% on-chain.
 *         Metadata dynamique mise à jour à chaque check-in.
 */
contract StreakNFT is ERC721, Ownable {
    using Strings for uint256;

    address public streakMaster;

    struct NFTData {
        uint256 streak;
        uint256 totalCheckIns;
        string  lastChain;
        uint256 lastUpdate;
    }

    mapping(address => uint256) public tokenOfOwner;
    mapping(uint256 => NFTData) private nftData;
    uint256 private _nextTokenId = 1;

    event NFTMinted(address indexed user, uint256 tokenId);
    event NFTUpdated(address indexed user, uint256 tokenId, uint256 streak);

    modifier onlyMaster() {
        require(msg.sender == streakMaster || msg.sender == owner(), "StreakNFT: not master");
        _;
    }

    constructor() ERC721("DailyDrop Streak", "STREAK") Ownable(msg.sender) {}

    function setStreakMaster(address master) external onlyOwner {
        streakMaster = master;
    }

    function mintOrUpdate(address user, uint256 streak, string calldata chain) external onlyMaster {
        uint256 tokenId = tokenOfOwner[user];
        if (tokenId == 0) {
            tokenId = _nextTokenId++;
            _safeMint(user, tokenId);
            tokenOfOwner[user] = tokenId;
            emit NFTMinted(user, tokenId);
        }
        nftData[tokenId] = NFTData({
            streak:        streak,
            totalCheckIns: nftData[tokenId].totalCheckIns + 1,
            lastChain:     chain,
            lastUpdate:    block.timestamp
        });
        emit NFTUpdated(user, tokenId, streak);
    }

    // ─── tokenURI ─────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "StreakNFT: nonexistent token");
        NFTData memory d = nftData[tokenId];
        string memory svg    = _buildSVG(d);
        string memory imgB64 = Base64.encode(bytes(svg));
        string memory json   = _buildJSON(tokenId, d, imgB64);
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _buildJSON(uint256 tokenId, NFTData memory d, string memory imgB64)
        internal pure returns (string memory)
    {
        return string(abi.encodePacked(
            '{"name":"DailyDrop Streak #', tokenId.toString(), '",',
            '"description":"Check in daily on-chain. 7-day streak earns 10 DROP.",',
            '"attributes":[',
                '{"trait_type":"Streak","value":', d.streak.toString(), '},',
                '{"trait_type":"Total Check-ins","value":', d.totalCheckIns.toString(), '},',
                '{"trait_type":"Last Chain","value":"', d.lastChain, '"},',
                '{"trait_type":"Tier","value":"', _tier(d.streak), '"}',
            '],',
            '"image":"data:image/svg+xml;base64,', imgB64, '"}'
        ));
    }

    // ─── SVG — decoupé en petites fonctions pour eviter stack too deep ────────

    function _buildSVG(NFTData memory d) internal pure returns (string memory) {
        return string(abi.encodePacked(
            _svgHeader(d.streak),
            _svgStreak(d.streak),
            _svgDots(d.streak),
            _svgStats(d.totalCheckIns),
            _svgChainBadge(d.lastChain),
            '</svg>'
        ));
    }

    function _svgHeader(uint256 streak) internal pure returns (string memory) {
        string memory accent = _accentColor(streak);
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<rect width="400" height="400" fill="#0a0a0f" rx="20"/>',
            '<rect x="2" y="2" width="396" height="396" rx="19" fill="none" stroke="',
            accent, '" stroke-width="1.5" opacity="0.6"/>',
            '<ellipse cx="200" cy="80" rx="24" ry="40" fill="', accent, '" opacity="0.3"/>',
            '<polygon points="190,40 200,8 210,40 206,58 194,58" fill="', accent, '" opacity="0.5"/>'
        ));
    }

    function _svgStreak(uint256 streak) internal pure returns (string memory) {
        string memory accent  = _accentColor(streak);
        string memory tierStr = _tier(streak);
        return string(abi.encodePacked(
            '<text x="200" y="190" text-anchor="middle" font-family="Arial" font-size="96" font-weight="900" fill="',
            accent, '">', streak.toString(), '</text>',
            '<text x="200" y="224" text-anchor="middle" font-family="Arial" font-size="14" fill="#ffffff" opacity="0.5" letter-spacing="4">DAY STREAK</text>',
            '<rect x="148" y="244" width="104" height="26" rx="13" fill="', accent, '" opacity="0.15"/>',
            '<text x="200" y="262" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="', accent, '">',
            tierStr, '</text>'
        ));
    }

    function _svgDots(uint256 streak) internal pure returns (string memory) {
        string memory accent = _accentColor(streak);
        string memory dots   = "";
        uint256 capped = streak > 7 ? 7 : streak;
        for (uint256 i = 0; i < 7; i++) {
            uint256 cx     = 92 + (i * 36);
            bool    filled = i < capped;
            dots = string(abi.encodePacked(
                dots,
                '<circle cx="', cx.toString(), '" cy="308" r="8" fill="',
                filled ? accent : "none",
                '" stroke="', accent, '" stroke-width="1.5" opacity="',
                filled ? "0.9" : "0.25", '"/>'
            ));
        }
        return dots;
    }

    function _svgStats(uint256 totalCheckIns) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<text x="60" y="348" font-family="Arial" font-size="10" fill="#ffffff" opacity="0.35">CHECK-INS</text>',
            '<text x="60" y="366" font-family="Arial" font-size="18" font-weight="700" fill="#ffffff" opacity="0.7">',
            totalCheckIns.toString(), '</text>',
            '<text x="200" y="392" text-anchor="middle" font-family="Arial" font-size="9" fill="#ffffff" opacity="0.2" letter-spacing="2">DAILYDROP</text>'
        ));
    }

    function _svgChainBadge(string memory chain) internal pure returns (string memory) {
        string memory color;
        string memory label;
        bytes32 h = keccak256(bytes(chain));
        if      (h == keccak256("celo"))   { color = "#35D07F"; label = "CELO";   }
        else if (h == keccak256("base"))   { color = "#0052FF"; label = "BASE";   }
        else if (h == keccak256("stacks")) { color = "#FF5500"; label = "STACKS"; }
        else                               { color = "#888888"; label = chain;    }

        return string(abi.encodePacked(
            '<rect x="294" y="338" width="66" height="22" rx="11" fill="', color, '" opacity="0.15"/>',
            '<rect x="294" y="338" width="66" height="22" rx="11" fill="none" stroke="', color, '" stroke-width="1" opacity="0.5"/>',
            '<text x="327" y="354" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="', color, '">',
            label, '</text>'
        ));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _accentColor(uint256 streak) internal pure returns (string memory) {
        if (streak >= 7) return "#FFD700";
        if (streak >= 5) return "#FF4444";
        if (streak >= 3) return "#FF8800";
        if (streak >= 1) return "#FFBB00";
        return "#556677";
    }

    function _tier(uint256 streak) internal pure returns (string memory) {
        if (streak >= 7) return "LEGENDARY";
        if (streak >= 5) return "ON FIRE";
        if (streak >= 3) return "BUILDING";
        if (streak >= 1) return "STARTER";
        return "COLD";
    }

    // ─── Soulbound ────────────────────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal override returns (address)
    {
        address from = _ownerOf(tokenId);
        require(from == address(0), "StreakNFT: soulbound - non transferable");
        return super._update(to, tokenId, auth);
    }
}
