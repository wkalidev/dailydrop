export const DAILYDROP_ABI = [
  {
    "inputs": [],
    "name": "checkIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
    "name": "getStreak",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
    "name": "getLastCheckIn",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_user", "type": "address" }],
    "name": "getUserData",
    "outputs": [
      { "internalType": "uint256", "name": "streak", "type": "uint256" },
      { "internalType": "uint256", "name": "lastCheckIn", "type": "uint256" },
      { "internalType": "uint256", "name": "totalCheckIns", "type": "uint256" },
      { "internalType": "bool", "name": "canCheckIn", "type": "bool" },
      { "internalType": "bool", "name": "canClaim", "type": "bool" },
      { "internalType": "uint256", "name": "nextCheckIn", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "streak", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "CheckIn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "RewardClaimed",
    "type": "event"
  }
] as const;

export const CONTRACT_ADDRESSES: Record<number, `0x${string}`> = {
  42220: (process.env.NEXT_PUBLIC_CELO_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  8453:  (process.env.NEXT_PUBLIC_BASE_CONTRACT_ADDRESS  || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  44787: (process.env.NEXT_PUBLIC_CELO_TESTNET_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
  84532: (process.env.NEXT_PUBLIC_BASE_TESTNET_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,
};
