// /api/agent — AI-powered streak coach (Best Agent track)
// Returns personalized coaching for a wallet's DailyDrop streak.
// Uses Claude claude-haiku when ANTHROPIC_API_KEY is set; falls back to deterministic heuristics.

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { celo, base } from "viem/chains";

const CELO_DAILYDROP = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b" as `0x${string}`;
const BASE_DAILYDROP = "0x974fB504172f2aABbecc698Ebf137202a5E4e495" as `0x${string}`;

const DAILYDROP_ABI = [
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

const celoClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
const baseClient = createPublicClient({ chain: base, transport: http("https://mainnet.base.org") });

function heuristicCoach(
  streak: number, totalCheckIns: number, canCheckIn: boolean, hoursLeft: number, canClaim: boolean
): { message: string; tip: string } {
  if (totalCheckIns === 0) {
    return {
      message: "Welcome to DailyDrop! Start your streak today with your first check-in.",
      tip: "Check in at the same time every day — it takes 7 days to earn 10 DROP tokens.",
    };
  }
  if (canClaim) {
    return {
      message: `🎉 You've hit a 7-day streak! Claim your 10 DROP tokens now.`,
      tip: "After claiming, start a new streak right away to build unstoppable momentum.",
    };
  }
  if (canCheckIn) {
    const daysLeft = 7 - streak;
    return {
      message: streak === 0
        ? `Streak reset! No worries — every legend starts over. Today is day 1.`
        : `${streak} day streak! ${daysLeft} more day${daysLeft !== 1 ? "s" : ""} to earn 10 DROP. Keep going!`,
      tip: streak >= 5
        ? "You're in the home stretch. Don't let a missed day erase your progress."
        : "Consistency is everything — check in now while you remember.",
    };
  }
  if (hoursLeft < 4) {
    return {
      message: `⚠️ Your check-in window closes in ${hoursLeft.toFixed(0)}h. Don't break your ${streak}-day streak!`,
      tip: "Set an alarm right now. Missing one day resets everything.",
    };
  }
  return {
    message: `${streak}-day streak locked in ✅ Come back in ${hoursLeft.toFixed(0)}h for your next check-in.`,
    tip: `${7 - streak} day${(7 - streak) !== 1 ? "s" : ""} to go. You're on pace for 10 DROP!`,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid or missing address" }, { status: 400 });
  }
  if (address === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json({ error: "Zero address not allowed" }, { status: 400 });
  }

  const userAddr = address as `0x${string}`;

  // Fetch on-chain data from both chains in parallel
  const [celoResult, baseResult] = await Promise.allSettled([
    celoClient.readContract({ address: CELO_DAILYDROP, abi: DAILYDROP_ABI, functionName: "getUserData", args: [userAddr] }),
    baseClient.readContract({ address: BASE_DAILYDROP, abi: DAILYDROP_ABI, functionName: "getUserData", args: [userAddr] }),
  ]);

  const celoData = celoResult.status === "fulfilled" ? celoResult.value : null;
  const baseData = baseResult.status === "fulfilled" ? baseResult.value : null;

  const celoStreak = celoData ? Number(celoData[0]) : 0;
  const baseStreak = baseData ? Number(baseData[0]) : 0;
  const streak     = Math.max(celoStreak, baseStreak);
  const bestChain  = celoStreak >= baseStreak ? "celo" : "base";

  const totalCheckIns = (celoData ? Number(celoData[2]) : 0) + (baseData ? Number(baseData[2]) : 0);
  const canCheckIn    = celoData ? Boolean(celoData[3]) : (baseData ? Boolean(baseData[3]) : true);
  const canClaim      = celoData ? Boolean(celoData[4]) : (baseData ? Boolean(baseData[4]) : false);
  const nextCheckInTs = celoData ? Number(celoData[5]) : (baseData ? Number(baseData[5]) : 0);

  const now = Math.floor(Date.now() / 1000);
  const hoursLeft = nextCheckInTs > now ? (nextCheckInTs - now) / 3600 : 0;
  const riskLevel: "low" | "medium" | "high" = hoursLeft < 4 && !canCheckIn ? "high"
    : hoursLeft < 12 && !canCheckIn ? "medium" : "low";

  let message = "";
  let tip = "";

  // Try Claude when API key is available
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const prompt = [
        `You are DailyDrop's AI streak coach. Reply ONLY with valid JSON {"message":"...","tip":"..."}.`,
        `Wallet stats: streak=${streak} days, totalCheckIns=${totalCheckIns}, canCheckIn=${canCheckIn}, canClaim=${canClaim}, hoursUntilNext=${hoursLeft.toFixed(1)}, bestChain=${bestChain}.`,
        `Write one punchy motivational sentence (message) and one concrete action tip (tip). Be brief and crypto-native.`,
      ].join(" ");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 180,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(7000),
      });

      if (res.ok) {
        const aiJson = await res.json();
        const raw = aiJson?.content?.[0]?.text ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.message && parsed.tip) {
            message = parsed.message;
            tip = parsed.tip;
          }
        }
      }
    } catch {
      // Fall through to heuristics
    }
  }

  // Heuristic fallback
  if (!message) {
    const h = heuristicCoach(streak, totalCheckIns, canCheckIn, hoursLeft, canClaim);
    message = h.message;
    tip = h.tip;
  }

  return NextResponse.json(
    {
      address,
      streak,
      totalCheckIns,
      canCheckIn,
      canClaim,
      nextCheckIn: nextCheckInTs,
      riskLevel,
      celo: celoStreak,
      base: baseStreak,
      bestChain,
      message,
      tip,
      aiPowered: !!apiKey,
      meta: { generatedAt: new Date().toISOString() },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}

export async function OPTIONS() {
  return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET" },
  });
}
