# @dailydrop/shield

**Proof of Presence** — verify real humans by their on-chain streak.

[![npm](https://img.shields.io/npm/v/@dailydrop/shield)](https://www.npmjs.com/package/@dailydrop/shield)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## What's new in v1.2.0

- Fix: removed broken `"import": "dist/index.mjs"` from exports (file never existed — ESM consumers failed silently)
- New exports: `STREAK_MASTER_ADDRESS` (Base) and `STREAK_NFT_ADDRESS` (Base) — deployed contract addresses
- All 5 contract addresses now exported as named constants

## What was in v1.1.0

- `verifyBatch()` — verify multiple addresses in parallel
- `getProfile()` — alias for `verify(address, 1)` with full data
- Automatic retry on network errors
- Configurable timeout (`timeout` option)
- Address validation before any network call

## Why?

Airdrops get sybil-attacked. DAOs get fake votes. NFT mints get botted.

A streak on-chain can't be faked retroactively. **If a wallet showed up every day for 7+ days, it's a real human.**

DailyDrop Shield gives any project a one-line sybil check powered by behavioral proof-of-humanity.

## Install

```bash
npm install @dailydrop/shield
```

## Quick Start

```typescript
import DailyDropShield from "@dailydrop/shield"

const shield = new DailyDropShield()

// Verify a wallet has 7+ day streak
const result = await shield.verify("0xABC...", 7)
if (result.passed) {
  console.log("✅ Real human — allow airdrop")
} else {
  console.log("❌ Streak too low — reject")
}

// Quick boolean check
const isHuman = await shield.isHuman("0xABC...", 7)

// Get streak number
const streak = await shield.getStreak("0xABC...")

// Get badge level (0=none, 1=weekly, 2=monthly, 3=century)
const badge = await shield.getBadge("0xABC...")

// Verify multiple wallets at once (airdrop filtering)
const results = await shield.verifyBatch([
  "0xABC...",
  "0xDEF...",
  "0x123...",
], 7)

const eligible = Object.entries(results)
  .filter(([, r]) => r.passed)
  .map(([addr]) => addr)

console.log(`${eligible.length} eligible wallets`)
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | `https://dailydrop-five.vercel.app` | Custom API endpoint |
| `onChain` | boolean | `false` | Read directly from blockchain |
| `celoRpc` | string | `https://forno.celo.org` | Custom Celo RPC |
| `baseRpc` | string | `https://mainnet.base.org` | Custom Base RPC |
| `timeout` | number | `10000` | Fetch timeout in ms |

## Response

```typescript
{
  address: "0xABC...",
  passed: true,           // meets minStreak requirement
  minStreak: 7,

  streak: {
    current: 12,          // highest streak across all chains
    bestChain: "celo",
    celo: 12,
    base: 0,
  },

  badges: {
    level: 1,             // 0=none 1=weekly 2=monthly 3=century
    label: "🥉 Weekly",
    weekly: true,         // 7+ days
    monthly: false,       // 30+ days
    century: false,       // 100+ days
  },

  checkins: {
    total: 36,
    canCheckIn: false,
    canClaim: false,
    nextCheckIn: 1780613801,
  },

  shield: "0x24eFf9bdE979D6dccC869178F353D663bC8A6983",
  meta: {
    verifiedAt: "2026-06-04T08:11:01.983Z",
    celoscan: "https://celoscan.io/address/0xABC...",
    basescan: "https://basescan.org/address/0xABC...",
  }
}
```

## Error handling

```typescript
try {
  const result = await shield.verify("0xABC...", 7)
} catch (err) {
  if (err.message.includes("invalid Ethereum address")) {
    // Bad address format
  } else if (err.message.includes("timeout")) {
    // Network timeout — retry or use onChain: true
  } else {
    // API error
  }
}
```

## Use Cases

| Use Case | minStreak |
|----------|-----------|
| Airdrop sybil filter | 7 |
| DAO voting weight | 30 |
| NFT allowlist | 7 |
| DeFi APY boost | 14 |
| Exclusive access | 100 |

## On-Chain Mode

For maximum trust, verify directly on-chain without the API:

```typescript
const shield = new DailyDropShield({ onChain: true })
const result = await shield.verify("0xABC...", 7)
```

## REST API

Free public API — no auth required:

```
GET https://dailydrop-five.vercel.app/api/verify?address=0xABC&minStreak=7
```

## Contracts

| Contract | Network | Address |
|----------|---------|---------|
| DailyDrop | Celo Mainnet | `0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b` |
| DailyDrop | Base Mainnet | `0x974fB504172f2aABbecc698Ebf137202a5E4e495` |
| DailyDropShield | Celo Mainnet | `0x24eFf9bdE979D6dccC869178F353D663bC8A6983` |
| StreakMaster | Base Mainnet | `0x038F496eCf99ecA5959A40493C96670Ea8a14345` |
| StreakNFT | Base Mainnet | `0xbBa5865b3E3A5033730f851d555cc922B74B25Fa` |

All 5 addresses are exported as named constants:

```typescript
import {
  CELO_DAILYDROP,
  BASE_DAILYDROP,
  SHIELD_ADDRESS,
  STREAK_MASTER_ADDRESS,
  STREAK_NFT_ADDRESS,
} from "@dailydrop/shield"
```

## License

MIT © 2026 @wkalidev

**Built on Celo & Base · Behavioral Proof of Humanity**
