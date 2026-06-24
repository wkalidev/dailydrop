# DailyDrop 🔥

<p align="center">
  <img src="frontend/public/logo.svg" alt="DailyDrop Logo" width="96" />
</p>

> Check in daily on-chain. 7-day streak = 10 DROP tokens + G$ rewards.

**Compatible MiniPay ✅ | Compatible Farcaster ✅ | Celo + Base ✅ | Proof of Presence ✅**

---

## Live

🔗 App : https://dailydrop-five.vercel.app
🏆 Leaderboard : https://dailydrop-five.vercel.app/leaderboard
🛡️ Shield API : https://dailydrop-five.vercel.app/api/verify
🤖 MCP Server : https://dailydrop-five.vercel.app/api/mcp
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

1. Connect wallet (MiniPay auto-connects, or MetaMask/RainbowKit)
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
import DailyDropShield, {
  CELO_DAILYDROP,
  BASE_DAILYDROP,
  SHIELD_ADDRESS,
  STREAK_MASTER_ADDRESS,
  STREAK_NFT_ADDRESS,
} from "@dailydrop/shield"

const shield = new DailyDropShield()
const isHuman = await shield.isHuman("0xABC...", 7)
const streak  = await shield.getStreak("0xABC...")
const badge   = await shield.getBadge("0xABC...")

// Batch verify for airdrop filtering
const results = await shield.verifyBatch(["0xABC...", "0xDEF..."], 7)
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

### Celo Mainnet

| Contract | Address |
|----------|---------|
| DailyDrop | `0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b` |
| DailyDropShield | `0x24eFf9bdE979D6dccC869178F353D663bC8A6983` |

### Base Mainnet

| Contract | Address |
|----------|---------|
| DailyDrop | `0x974fB504172f2aABbecc698Ebf137202a5E4e495` |
| StreakMaster | `0x038F496eCf99ecA5959A40493C96670Ea8a14345` |
| StreakNFT | `0xbBa5865b3E3A5033730f851d555cc922B74B25Fa` |

---

## G$ Integration (GoodBuilders Season 4)

DailyDrop integrates **GoodDollar G$** as bonus rewards:

- Streak 7 days → **100 G$** bonus
- Streak 30 days → **500 G$** bonus
- Streak 100 days → **2000 G$** bonus

G$ token on Celo: `0x62B8B11039FcfE5aB0C56E502b1C372A3D2a9C7A`

---

## Performance

- Fonts: self-hosted at build time via `next/font/google` — eliminates render-blocking Google Fonts request
- Viewport: user zoom enabled (accessibility compliant, WCAG 1.4.4)
- CLS: protocol stats section always reserves DOM space (skeleton while loading) to prevent layout shift
- Bundle: `optimizePackageImports` for wagmi / viem / RainbowKit tree-shaking

---

## Stack

| Layer | Tech |
|---|---|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin ERC20 |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Web3 | wagmi v2, viem, RainbowKit |
| Shield SDK | TypeScript, viem (`@dailydrop/shield` v1.2.0) |
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
NEXT_PUBLIC_CELO_CONTRACT_ADDRESS=0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b
NEXT_PUBLIC_BASE_CONTRACT_ADDRESS=0x974fB504172f2aABbecc698Ebf137202a5E4e495
NEXT_PUBLIC_SHIELD_ADDRESS=0x24eFf9bdE979D6dccC869178F353D663bC8A6983
NEXT_PUBLIC_STREAK_MASTER_ADDRESS=0x038F496eCf99ecA5959A40493C96670Ea8a14345
NEXT_PUBLIC_STREAK_NFT_ADDRESS=0xbBa5865b3E3A5033730f851d555cc922B74B25Fa
CELOSCAN_API_KEY=...
BASESCAN_API_KEY=...
ANTHROPIC_API_KEY=...
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
- Auto wallet connection via injected provider (no modal shown)
- Forces Celo mainnet on every connection via `switchChain`
- Connect button hidden when MiniPay is detected
- Graceful connection error recovery with retry button
- Gas fees in cUSD
- Mobile-optimized UI (360×640 px minimum viewport, user zoom enabled)
- Terms / Privacy / Support links accessible in-app footer

Test: https://dailydrop-five.vercel.app

---

## API Reference

### `GET /api/verify?address=0x...&minStreak=7`

Proof of Presence verification. Reads streaks from both Celo and Base chains.

```json
{
  "address": "0xABC...",
  "passed": true,
  "minStreak": 7,
  "streak": { "current": 12, "bestChain": "celo", "celo": 12, "base": 0 },
  "checkins": { "total": 36, "canCheckIn": false, "canClaim": false, "nextCheckIn": 1780613801 },
  "badges": { "level": 1, "label": "🥉 Weekly", "weekly": true, "monthly": false, "century": false },
  "shield": "0x24eFf9bdE979D6dccC869178F353D663bC8A6983",
  "meta": { "verifiedAt": "2026-06-22T00:00:00.000Z", "celoscan": "...", "basescan": "..." }
}
```

CORS: fully open (`Access-Control-Allow-Origin: *`). Cache: 60s.

---

### `GET /api/stats`

Protocol-wide analytics. Fetches transaction counts from Celoscan + Basescan. Cached 5 minutes.

```json
{
  "totalCheckIns": 842,
  "uniqueWallets": 301,
  "celoWallets": 190,
  "baseWallets": 145
}
```

Environment variables: `CELOSCAN_API_KEY`, `BASESCAN_API_KEY`

---

### `GET /api/leaderboard`

Returns wallet addresses sorted by activity, sourced from Etherscan V2 API with Basescan V1 fallback. Includes `celoAddresses` and `baseAddresses` arrays for chain-filter UI.

---

### `GET /api/agent?address=0x...`

AI streak coach powered by Claude Haiku. Returns personalized motivation, action tip, and on-chain data.

```json
{
  "streak": 5,
  "totalCheckIns": 12,
  "canCheckIn": true,
  "canClaim": false,
  "riskLevel": "low",
  "message": "5 days in — 2 more to claim 10 DROP. You're almost there!",
  "tip": "Check in now while you remember — consistency beats motivation.",
  "aiPowered": true
}
```

Environment variable: `ANTHROPIC_API_KEY` (optional — falls back to deterministic heuristics)

---

### `GET/POST /api/mcp`

MCP Server (protocol `2024-11-05`). Tools: `verify_streak`, `get_profile`, `verify_batch`, `get_stats`.

```bash
# Discovery
GET https://dailydrop-five.vercel.app/api/mcp

# Tool call
POST https://dailydrop-five.vercel.app/api/mcp
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"verify_streak","arguments":{"address":"0xABC...","minStreak":7}}}
```

### `GET /.well-known/agent-card.json`

A2A AgentCard (v0.3.0) — 5 skills: `verify_streak`, `get_profile`, `verify_batch`, `get_leaderboard`, `get_stats`.

---

### `GET /api/frame/image?address=0x...`

Returns a 1200×630 SVG image for Farcaster Frames. Personalized when address is provided (shows live streak, color-coded). Generic brand image when no address given.

---

## Advanced Architecture

### StreakMaster (Base)

Cross-chain source of truth. Receives check-ins from Celo, Base, and Stacks via authorized relayers. Maintains an on-chain leaderboard (top 10), streak tiers, and triggers rewards.

**Address** (Base Mainnet): `0x038F496eCf99ecA5959A40493C96670Ea8a14345`

### DailyDropShield (Celo)

Proof of Presence verification layer. Any project can call `verify(address, minStreak)` to check if an address is an active human. Free. No KYC.

**Address** (Celo Mainnet): `0x24eFf9bdE979D6dccC869178F353D663bC8A6983`

**REST API**: `GET /api/verify?address=0x...&minStreak=7`

> Note: `verify()` is `nonpayable` (not `view`) because it caches results on-chain. Use `verifyView()` for gas-free reads.

### StreakNFT (Base)

Soulbound ERC-721 NFT with 100% on-chain SVG metadata. Automatically updates on each check-in. Non-transferable.

**Address** (Base Mainnet): `0xbBa5865b3E3A5033730f851d555cc922B74B25Fa`

### Relayer

Next.js API route (`/api/relayer`) that receives check-in notifications and calls `StreakMaster.updateStreak()` on Base. Requires `RELAYER_SECRET` for authentication and `RELAYER_PRIVATE_KEY` for signing.

> The Farcaster Frame (`/api/frame`) uses `untrustedData` — Farcaster signature verification is not yet implemented. See `// TODO` comment in the route for production hardening.

---

## Proof of Ship — Celo

- ✅ DailyDrop deployed Celo + Base mainnet
- ✅ DailyDropShield deployed Celo mainnet
- ✅ StreakMaster + StreakNFT deployed Base mainnet
- ✅ Public REST API live — `/api/verify`, `/api/stats`, `/api/leaderboard`, `/api/agent`
- ✅ MCP Server live — `/api/mcp`
- ✅ A2A AgentCard — `/.well-known/agent-card.json`
- ✅ `@dailydrop/shield` v1.2.0 published on npm
- ✅ MiniPay compatible (auto-detect, force Celo, no modal, reconnect on failure)
- ✅ Farcaster Mini App (farcaster.json + frame endpoint)
- ✅ G$ integration (GoodBuilders Season 4)
- ✅ Leaderboard (Celoscan + Basescan, live on-chain)
- ✅ AI streak coach (Claude Haiku + deterministic fallback)
- ✅ PWA (manifest + service worker)
- ✅ Fonts self-hosted via next/font (no render-blocking external requests)
- ✅ Accessible viewport (user zoom enabled, WCAG 1.4.4 compliant)

---

## License

MIT © 2026 [@wkalidev](https://github.com/wkalidev)

---

**Built for the 1.4 billion unbanked · Powered by Celo · Proof of Presence Protocol**
