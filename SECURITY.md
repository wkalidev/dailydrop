# Security

## Sensitive Variables

| Variable | Where | Risk if leaked |
|----------|-------|----------------|
| `PRIVATE_KEY` | root `.env` | Full contract control — CRITICAL |
| `RELAYER_PRIVATE_KEY` | `frontend/.env.local` | Can trigger streak updates — HIGH |
| `RELAYER_SECRET` | `frontend/.env.local` + `NEXT_PUBLIC_*` | Can spam relayer — MEDIUM |
| `CELOSCAN_API_KEY` | `frontend/.env.local` | Rate limit abuse — LOW |
| `BASESCAN_API_KEY` | `frontend/.env.local` | Rate limit abuse — LOW |

## Reporting Vulnerabilities

Please report security vulnerabilities by opening a **private** GitHub security advisory at:
https://github.com/wkalidev/dailydrop/security/advisories/new

Do NOT open public issues for security vulnerabilities.

## Audited By

Self-audited on 2026-06-13 covering contracts, API routes, SDK, and environment configuration.
No third-party audit yet. Use at your own risk.

## Known Limitations

- **Farcaster Frame signature not verified** — `/api/frame` uses `untrustedData`. Full production use requires hub-based signature verification (Neynar or a self-hosted Farcaster Hub).
- **Leaderboard is address-based** — sourced from on-chain transactions for known contracts. Not exhaustive; new users appear as they interact.
- **StreakMaster relayer requires trust** — the relayer operator can submit any check-in for any user. Mitigated by `CHECKIN_INTERVAL` enforcement on-chain and the `usedTxProofs` replay prevention map.
- **`NEXT_PUBLIC_RELAYER_SECRET` is browser-visible** — by design (it's a rate-limit mitigation, not a security boundary). The real security is on-chain interval enforcement.
