// app/api/relayer/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Receives check-in notifications from the frontend
// and calls StreakMaster.updateStreak() on Base.
//
// Required env vars:
//   RELAYER_PRIVATE_KEY         — private key of the relayer wallet (authorized in StreakMaster)
//   NEXT_PUBLIC_STREAK_MASTER_ADDRESS — StreakMaster address on Base
//   RELAYER_SECRET              — shared secret to authenticate internal calls

import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseAbi, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, celo } from "wagmi/chains";

const RELAYER_SECRET = process.env.RELAYER_SECRET;

// Basic in-memory rate limit (per user address, resets every hour)
// Note: only effective within a single Node.js process instance
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(user: string): boolean {
  const now = Date.now();
  // Evict expired entries to prevent unbounded map growth
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
  const entry = rateLimitMap.get(user);
  if (!entry) {
    rateLimitMap.set(user, { count: 1, resetAt: now + 3_600_000 });
    return true;
  }
  if (entry.count >= 3) return false;
  entry.count++;
  return true;
}

// ─── ABI minimal ──────────────────────────────────────────────────────────────
const STREAK_MASTER_ABI = parseAbi([
  "function updateStreak(address user, string chain, bytes32 txProof) external",
  "function getUserData(address user) external view returns (uint256 streak, uint256 lastUpdate, uint256 totalCheckIns, string lastChain, bool canCheckIn, uint256 nextCheckIn)",
]);

// ─── Clients viem ─────────────────────────────────────────────────────────────
function getRelayerAccount() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) throw new Error("RELAYER_PRIVATE_KEY not set");
  return privateKeyToAccount(pk as `0x${string}`);
}

const publicClient = createPublicClient({
  chain:     base,
  transport: http("https://mainnet.base.org"),
});

const celoPublicClient = createPublicClient({
  chain:     celo,
  transport: http("https://forno.celo.org"),
});

const basePublicClient = createPublicClient({
  chain:     base,
  transport: http("https://mainnet.base.org"),
});

// ─── POST /api/relayer ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Auth check — reject unauthenticated callers when RELAYER_SECRET is configured
    const authHeader = req.headers.get("x-relayer-secret");
    if (RELAYER_SECRET && authHeader !== RELAYER_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { user, chain, txHash } = body as {
      user:    string;
      chain:   string;
      txHash:  string;
    };

    if (!user || !chain || !txHash) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (!checkRateLimit(user)) {
      return NextResponse.json({ error: "Too many requests for this address" }, { status: 429 });
    }

    const validChains = ["celo", "base", "stacks"];
    if (!validChains.includes(chain)) {
      return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
    }

    // Verify the source transaction is confirmed on its origin chain
    if (chain === "celo" || chain === "base") {
      try {
        const sourceClient = chain === "celo" ? celoPublicClient : basePublicClient;
        const receipt = await sourceClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
        if (receipt.status !== "success") {
          return NextResponse.json({ error: "Source transaction failed" }, { status: 400 });
        }
      } catch {
        // Receipt not yet available — tx not confirmed yet
        return NextResponse.json({ pending: true }, { status: 202 });
      }
    }

    const streakMasterAddress = process.env.NEXT_PUBLIC_STREAK_MASTER_ADDRESS as `0x${string}`;
    if (!streakMasterAddress || streakMasterAddress === "0x0000000000000000000000000000000000000000") {
      console.log(`[Relayer DEV] Would update streak for ${user} on chain ${chain}, tx: ${txHash}`);
      return NextResponse.json({ success: true, dev: true });
    }

    // Verify check-in is permitted on StreakMaster
    const userData = await publicClient.readContract({
      address:      streakMasterAddress,
      abi:          STREAK_MASTER_ABI,
      functionName: "getUserData",
      args:         [user as `0x${string}`],
    });

    if (!userData[4]) { // canCheckIn = false
      return NextResponse.json(
        { error: "Check-in not allowed yet (too soon)" },
        { status: 429 }
      );
    }

    const account = getRelayerAccount();
    const walletClient = createWalletClient({
      account,
      chain:     base,
      transport: http("https://mainnet.base.org"),
    });

    // Compute a proper bytes32 proof from the source tx hash
    const txProof = keccak256(toBytes(txHash)) as `0x${string}`;

    const hash = await walletClient.writeContract({
      address:      streakMasterAddress,
      abi:          STREAK_MASTER_ABI,
      functionName: "updateStreak",
      args:         [user as `0x${string}`, chain, txProof],
    });

    console.log(`[Relayer] Streak updated for ${user} (${chain}) → tx ${hash}`);

    return NextResponse.json({ success: true, relayerTx: hash });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Relayer] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET health check
export async function GET() {
  return NextResponse.json({
    status:    "ok",
    service:   "DailyDrop Relayer",
    timestamp: new Date().toISOString(),
  });
}
