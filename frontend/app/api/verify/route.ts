import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo, base } from "viem/chains";

// ─── Contracts ────────────────────────────────────────────────────────────────

const CELO_DAILYDROP   = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b" as `0x${string}`;
const BASE_DAILYDROP   = "0x974fB504172f2aABbecc698Ebf137202a5E4e495" as `0x${string}`;
const SHIELD_ADDRESS   = (process.env.NEXT_PUBLIC_SHIELD_ADDRESS || "0x24eFf9bdE979D6dccC869178F353D663bC8A6983") as `0x${string}`;

const DAILYDROP_ABI = [
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getStreak",
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
] as const;

const SHIELD_ABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getProfile",
    outputs: [
      { internalType: "uint256", name: "streak",     type: "uint256" },
      { internalType: "uint256", name: "highest",    type: "uint256" },
      { internalType: "bool",    name: "b7",         type: "bool"    },
      { internalType: "bool",    name: "b30",        type: "bool"    },
      { internalType: "bool",    name: "b100",       type: "bool"    },
      { internalType: "uint8",   name: "badgeLevel", type: "uint8"   },
      { internalType: "uint256", name: "cachedAt",   type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─── Clients ──────────────────────────────────────────────────────────────────

const celoClient = createPublicClient({
  chain: celo,
  transport: http("https://forno.celo.org"),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBadgeLabel(level: number): string {
  if (level === 3) return "🏆 Century";
  if (level === 2) return "🥈 Monthly";
  if (level === 1) return "🥉 Weekly";
  return "none";
}

function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

// ─── GET /api/verify?address=0x...&minStreak=7 ────────────────────────────────

/**
 * @swagger
 * /api/verify:
 *   get:
 *     summary: Verify if an address has the required streak (Proof of Presence)
 *     parameters:
 *       - name: address
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Wallet address to verify
 *       - name: minStreak
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Minimum streak required
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address   = searchParams.get("address");
  const minStreak = parseInt(searchParams.get("minStreak") || "7", 10);

  // ─── Validation ───────────────────────────────────────────────────────────
  if (!address) {
    return NextResponse.json(
      { error: "Missing required parameter: address" },
      { status: 400 }
    );
  }

  if (!isValidAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address format" },
      { status: 400 }
    );
  }

  if (isNaN(minStreak) || minStreak < 1 || minStreak > 365) {
    return NextResponse.json(
      { error: "minStreak must be between 1 and 365" },
      { status: 400 }
    );
  }

  const userAddress = address as `0x${string}`;

  try {
    // ─── Fetch streaks from both chains in parallel ──────────────────────────
    const [celoResult, baseResult] = await Promise.allSettled([
      celoClient.readContract({
        address: CELO_DAILYDROP,
        abi: DAILYDROP_ABI,
        functionName: "getUserData",
        args: [userAddress],
      }),
      baseClient.readContract({
        address: BASE_DAILYDROP,
        abi: DAILYDROP_ABI,
        functionName: "getUserData",
        args: [userAddress],
      }),
    ]);

    // ─── Parse results ────────────────────────────────────────────────────────
    const celoData = celoResult.status === "fulfilled" ? celoResult.value : null;
    const baseData = baseResult.status === "fulfilled" ? baseResult.value : null;

    const celoStreak = celoData ? Number(celoData[0]) : 0;
    const baseStreak = baseData ? Number(baseData[0]) : 0;
    const maxStreak  = Math.max(celoStreak, baseStreak);
    const bestChain  = celoStreak >= baseStreak ? "celo" : "base";

    // ─── Badge logic ──────────────────────────────────────────────────────────
    const badge7   = maxStreak >= 7;
    const badge30  = maxStreak >= 30;
    const badge100 = maxStreak >= 100;
    const badgeLevel = badge100 ? 3 : badge30 ? 2 : badge7 ? 1 : 0;

    // ─── Verification result ──────────────────────────────────────────────────
    const passed = maxStreak >= minStreak;

    // ─── Response ─────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        // Core verification
        address,
        passed,
        minStreak,

        // Streak data
        streak: {
          current:   maxStreak,
          bestChain,
          celo:      celoStreak,
          base:      baseStreak,
        },

        // Check-in details (best chain)
        checkins: {
          total:       celoData ? Number(celoData[2]) + (baseData ? Number(baseData[2]) : 0) : 0,
          canCheckIn:  celoData ? celoData[3] : false,
          canClaim:    celoData ? celoData[4] : false,
          nextCheckIn: celoData ? Number(celoData[5]) : 0,
        },

        // Badges (Proof of Presence tiers)
        badges: {
          level:  badgeLevel,
          label:  getBadgeLabel(badgeLevel),
          weekly:  badge7,
          monthly: badge30,
          century: badge100,
        },

        // Shield contract
        shield: SHIELD_ADDRESS,

        // Meta
        meta: {
          verifiedAt:  new Date().toISOString(),
          celoscan:    `https://celoscan.io/address/${address}`,
          basescan:    `https://basescan.org/address/${address}`,
        },
      },
      {
        status: 200,
        headers: {
          // Cache 60s — streaks change max once per day
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          // CORS — any project can call this API (read-only public data)
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          // Security hardening
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      }
    );

  } catch (error) {
    console.error("Shield verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify address. Please try again." },
      { status: 500 }
    );
  }
}

// ─── OPTIONS (CORS preflight) ─────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}