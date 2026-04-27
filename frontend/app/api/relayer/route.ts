// app/api/relayer/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Reçoit les notifications de check-in depuis le frontend
// et appelle StreakMaster.updateStreak() sur Base.
//
// Variables d'environnement requises :
//   RELAYER_PRIVATE_KEY        — clé privée du wallet relayer (autorisé dans StreakMaster)
//   NEXT_PUBLIC_STREAK_MASTER_ADDRESS — adresse StreakMaster sur Base
//   RELAYER_SECRET             — secret partagé pour authentifier les appels internes

import { NextRequest, NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "wagmi/chains";

// ─── ABI minimal pour le relayer ──────────────────────────────────────────────
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

// ─── POST /api/relayer ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, chain, txHash } = body as {
      user:    string;
      chain:   string;
      txHash:  string;
    };

    // Validation basique
    if (!user || !chain || !txHash) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const validChains = ["celo", "base", "stacks"];
    if (!validChains.includes(chain)) {
      return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
    }

    const streakMasterAddress = process.env.NEXT_PUBLIC_STREAK_MASTER_ADDRESS as `0x${string}`;
    if (!streakMasterAddress || streakMasterAddress === "0x0000000000000000000000000000000000000000") {
      // En dev : log et retourne success sans appel on-chain
      console.log(`[Relayer DEV] Would update streak for ${user} on chain ${chain}, tx: ${txHash}`);
      return NextResponse.json({ success: true, dev: true });
    }

    // Vérification : est-ce que le check-in est autorisé côté StreakMaster ?
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

    // Appel StreakMaster.updateStreak()
    const account = getRelayerAccount();
    const walletClient = createWalletClient({
      account,
      chain:     base,
      transport: http("https://mainnet.base.org"),
    });

    // txProof = hash de la tx source paddée en bytes32
    const txProof = txHash.padEnd(66, "0") as `0x${string}`;

    const hash = await walletClient.writeContract({
      address:      streakMasterAddress,
      abi:          STREAK_MASTER_ABI,
      functionName: "updateStreak",
      args:         [user as `0x${string}`, chain, txProof as `0x${string}`],
    });

    console.log(`[Relayer] Streak updated for ${user} (${chain}) → tx ${hash}`);

    return NextResponse.json({ success: true, relayerTx: hash });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Relayer] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET pour health check
export async function GET() {
  return NextResponse.json({
    status:    "ok",
    service:   "DailyDrop Relayer",
    timestamp: new Date().toISOString(),
  });
}