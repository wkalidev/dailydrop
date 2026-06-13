# DailyDrop 🔥

> Check in daily on-chain. 7-day streak = 10 DROP tokens + G$ rewards.

**Compatible MiniPay ✅ | Compatible Farcaster ✅ | Celo + Base ✅ | Proof of Presence ✅**

---

## Live

🔗 App : https://dailydrop-five.vercel.app
🛡️ Shield API : https://dailydrop-five.vercel.app/api/verify
📦 SDK : `npm i @dailydrop/shield`
🐙 GitHub : https://github.com/wkalidev/dailydrop

---

## What is DailyDrop?

DailyDrop is **two things at once**:

1. **A daily check-in app** — users check in on-chain every day, build a 7-day streak, and earn DROP tokens + G$ rewards.

2. **A Proof of Presence Protocol** — `DailyDropShield` is an open infrastructure layer that any project can use to verify real humans by their on-chain streak. No KYC. No passport scan. Just behavioral proof.

> A streak on-chain can't be faked retroactively. If a wallet showed up every day, it's a real human.

---

## How it works

1. Connect wallet (MiniPay, MetaMask, RainbowKit…)
2. Click **Check-in** once per day (1 TX on-chain)
3. Build a 7-day consecutive streak
4. Claim **10 DROP tokens** 🎁 + **G$ bonus** 🌱
5. Repeat!

---

## 🛡️ DailyDropShield — Proof of Presence

Any project can verify real humans using the free public API or npm SDK:

### REST API (free, no auth)

```bash
GET https://dailydrop-five.vercel.app/api/verify?address=0xABC&minStreak=7
```

```json
{
  "address": "0xABC...",
  "passed": true,
  "streak": { "current": 12, "celo": 12, "base": 0 },
  "badges": { "level": 1, "label": "🥉 Weekly", "weekly": true },
  "shield": "0x24eFf9bdE979D6dccC869178F353D663bC8A6983"
}
```

### npm SDK

```bash
npm install @dailydrop/shield
```

```typescript
import DailyDropShield from "@dailydrop/shield"

const shield = new DailyDropShield()
const isHuman = await shield.isHuman("0xABC...", 7)
const streak  = await shield.getStreak("0xABC...")
const badge   = await shield.getBadge("0xABC...")
```

### Use Cases

| Use Case | minStreak |
|----------|-----------|
| Airdrop sybil filter | 7 |
| DAO voting weight | 30 |
| NFT allowlist | 7 |
| DeFi APY boost | 14 |

---

## Smart Contracts

| Contract | Network | Address |
|----------|---------|---------|
| DailyDrop | Celo Mainnet | `0x63596cf6601ec2240A295ff2840C8d6653252AE6` |
| DailyDrop | Base Mainnet | `0x974fB504172f2aABbecc698Ebf137202a5E4e495` |
| DailyDropShield | Celo Mainnet | `0x24eFf9bdE979D6dccC869178F353D663bC8A6983` |

---

## G$ Integration (GoodBuilders Season 4)

DailyDrop integrates **GoodDollar G$** as bonus rewards:

- Streak 7 days → **100 G$** bonus
- Streak 30 days → **500 G$** bonus
- Streak 100 days → **2000 G$** bonus

G$ token on Celo: `0x62B8B11039FcfE5aB0C56E502b1C372A3D2a9C7A`

---

## Stack

| Layer | Tech |
|---|---|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin ERC20 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Web3 | wagmi v2, viem, RainbowKit |
| Shield SDK | TypeScript, viem |
| Chains | Celo Mainnet + Base Mainnet |
| Deploy | Vercel (frontend), Hardhat (contracts) |

---

## Installation

```bash
git clone https://github.com/wkalidev/dailydrop
cd dailydrop
npm install
cd frontend && npm install
```

### Environment Variables

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_CDP_PROJECT_ID=...
NEXT_PUBLIC_CELO_CONTRACT_ADDRESS=0x63596cf6601ec2240A295ff2840C8d6653252AE6
NEXT_PUBLIC_BASE_CONTRACT_ADDRESS=0x974fB504172f2aABbecc698Ebf137202a5E4e495
NEXT_PUBLIC_SHIELD_ADDRESS=0x24eFf9bdE979D6dccC869178F353D663bC8A6983
```

---

## Deploy Contracts

```bash
npm run deploy:celo   # Deploy DailyDrop + DailyDropShield on Celo
npm run deploy:base   # Deploy DailyDrop on Base
```

---

## MiniPay

Auto-detects MiniPay via `window.ethereum.isMiniPay`:
- Auto wallet connection
- Gas fees in cUSD
- Mobile-optimized UI

Test: https://dailydrop-five.vercel.app

---

## Proof of Ship — Celo

- ✅ DailyDrop deployed Celo + Base mainnet
- ✅ DailyDropShield deployed Celo mainnet
- ✅ Public REST API live
- ✅ `@dailydrop/shield` published on npm
- ✅ MiniPay compatible
- ✅ Farcaster Mini App
- ✅ G$ integration (GoodBuilders Season 4)

---

## Advanced Architecture

### StreakMaster (Base)

Cross-chain source of truth. Receives check-ins from Celo, Base, and Stacks via authorized relayers. Maintains an on-chain leaderboard (top 10), streak tiers, and triggers rewards.

**Address**: [pending deployment — see `NEXT_PUBLIC_STREAK_MASTER_ADDRESS`]

### DailyDropShield (Celo + Base)

Proof of Presence verification layer. Any project can call `verify(address, minStreak)` to check if an address is an active human. Free. No KYC.

**REST API**: `GET /api/verify?address=0x...&minStreak=7`

> Note: `verify()` is `nonpayable` (not `view`) because it caches results on-chain. Use `verifyView()` for gas-free reads.

### StreakNFT (Base)

Soulbound ERC-721 NFT with 100% on-chain SVG metadata. Automatically updates on each check-in. Non-transferable.

### Relayer

Next.js API route (`/api/relayer`) that receives check-in notifications and calls `StreakMaster.updateStreak()` on Base. Requires `RELAYER_SECRET` for authentication and `RELAYER_PRIVATE_KEY` for signing.

> The Farcaster Frame (`/api/frame`) uses `untrustedData` — Farcaster signature verification is not yet implemented. See `// TODO` comment in the route for production hardening.

---

## License

MIT © 2026 [@wkalidev](https://github.com/wkalidev)

---

**Built for the 1.4 billion unbanked · Powered by Celo · Proof of Presence Protocol**