// ─── Adresses déployées ───────────────────────────────────────────────────────

export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  // Mainnet
  42220: (process.env.NEXT_PUBLIC_CELO_CONTRACT_ADDRESS    || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  8453:  (process.env.NEXT_PUBLIC_BASE_CONTRACT_ADDRESS    || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  // Testnet
  44787: (process.env.NEXT_PUBLIC_CELO_TESTNET_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  84532: (process.env.NEXT_PUBLIC_BASE_TESTNET_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};

// StreakMaster sur Base (source de vérité cross-chain)
export const STREAK_MASTER_ADDRESS = (
  process.env.NEXT_PUBLIC_STREAK_MASTER_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

// StreakNFT sur Base
export const STREAK_NFT_ADDRESS = (
  process.env.NEXT_PUBLIC_STREAK_NFT_ADDRESS || "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

// Stacks (Clarity) — principal du contrat déployé
export const STACKS_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS || "";
// Ex: "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ.dailydrop"

// ─── Chain helpers ────────────────────────────────────────────────────────────

export const CHAIN_LABELS: Record<number, string> = {
  42220: "Celo",
  8453:  "Base",
  44787: "Celo Alfajores",
  84532: "Base Sepolia",
};

export const CHAIN_KEYS: Record<number, string> = {
  42220: "celo",
  8453:  "base",
  44787: "celo",
  84532: "base",
};

// ─── ABI : DailyDrop original (Celo + Base) ───────────────────────────────────

export const DAILYDROP_ABI = [
  {
    inputs: [],
    name: "checkIn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimReward",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getStreak",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getLastCheckIn",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserData",
    outputs: [
      { internalType: "uint256", name: "streak",        type: "uint256" },
      { internalType: "uint256", name: "lastCheckIn",   type: "uint256" },
      { internalType: "uint256", name: "totalCheckIns", type: "uint256" },
      { internalType: "bool",    name: "canCheckIn",    type: "bool"    },
      { internalType: "bool",    name: "canClaim",      type: "bool"    },
      { internalType: "uint256", name: "nextCheckIn",   type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "user",      type: "address" },
      { indexed: false, internalType: "uint256", name: "streak",    type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "CheckIn",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "user",   type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "RewardClaimed",
    type: "event",
  },
] as const;

// ─── ABI : StreakMaster (Base — source de vérité cross-chain) ─────────────────

export const STREAK_MASTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "user",    type: "address" },
      { internalType: "string",  name: "chain",   type: "string"  },
      { internalType: "bytes32", name: "txProof", type: "bytes32" },
    ],
    name: "updateStreak",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserData",
    outputs: [
      { internalType: "uint256", name: "streak",        type: "uint256" },
      { internalType: "uint256", name: "lastUpdate",    type: "uint256" },
      { internalType: "uint256", name: "totalCheckIns", type: "uint256" },
      { internalType: "string",  name: "lastChain",     type: "string"  },
      { internalType: "bool",    name: "canCheckIn",    type: "bool"    },
      { internalType: "uint256", name: "nextCheckIn",   type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getStreak",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "user",      type: "address" },
      { indexed: false, internalType: "uint256", name: "streak",    type: "uint256" },
      { indexed: false, internalType: "string",  name: "chain",     type: "string"  },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "StreakUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "user",   type: "address" },
      { indexed: false, internalType: "string",  name: "chain",  type: "string"  },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "RewardTriggered",
    type: "event",
  },
] as const;

// ─── ABI : StreakNFT ──────────────────────────────────────────────────────────

export const STREAK_NFT_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "tokenOfOwner",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "address", name: "user",    type: "address" },
      { indexed: false, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "streak",  type: "uint256" },
    ],
    name: "NFTUpdated",
    type: "event",
  },
] as const;