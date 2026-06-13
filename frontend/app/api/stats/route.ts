// /api/stats — Global protocol statistics
// Returns total check-ins and unique wallets across Celo and Base.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CELO_CONTRACT = process.env.NEXT_PUBLIC_CELO_CONTRACT_ADDRESS || "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b";
const BASE_CONTRACT  = process.env.NEXT_PUBLIC_BASE_CONTRACT_ADDRESS  || "0x974fB504172f2aABbecc698Ebf137202a5E4e495";

export async function GET() {
  try {
    const apiKey = process.env.CELOSCAN_API_KEY || process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_V2_API_KEY || "";
    const [celoRes, baseRes] = await Promise.allSettled([
      fetch(
        `https://api.etherscan.io/v2/api?chainid=42220&module=account&action=txlist&address=${CELO_CONTRACT}&startblock=0&endblock=latest&sort=asc&apikey=${apiKey}`,
        { cache: "no-store" }
      ),
      fetch(
        `https://api.etherscan.io/v2/api?chainid=8453&module=account&action=txlist&address=${BASE_CONTRACT}&startblock=0&endblock=latest&sort=asc&apikey=${apiKey}`,
        { cache: "no-store" }
      ),
    ]);

    const celoUsers = new Set<string>();
    const baseUsers = new Set<string>();
    let celoTxCount = 0;
    let baseTxCount = 0;

    if (celoRes.status === "fulfilled" && celoRes.value.ok) {
      const json = await celoRes.value.json();
      if (json.status === "1" && Array.isArray(json.result)) {
        const txs = json.result.filter((tx: { isError: string; to: string }) =>
          tx.isError === "0" && tx.to?.toLowerCase() === CELO_CONTRACT.toLowerCase()
        );
        celoTxCount = txs.length;
        txs.forEach((tx: { from: string }) => celoUsers.add(tx.from.toLowerCase()));
      }
    }

    if (baseRes.status === "fulfilled" && baseRes.value.ok) {
      const json = await baseRes.value.json();
      if (json.status === "1" && Array.isArray(json.result)) {
        const txs = json.result.filter((tx: { isError: string; to: string }) =>
          tx.isError === "0" && tx.to?.toLowerCase() === BASE_CONTRACT.toLowerCase()
        );
        baseTxCount = txs.length;
        txs.forEach((tx: { from: string }) => baseUsers.add(tx.from.toLowerCase()));
      }
    }

    const allUsers = new Set([...celoUsers, ...baseUsers]);

    return NextResponse.json(
      {
        totalCheckIns: celoTxCount + baseTxCount,
        uniqueWallets: allUsers.size,
        celoWallets: celoUsers.size,
        baseWallets: baseUsers.size,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=0, max-age=60, stale-while-revalidate=120",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
        },
      }
    );
  } catch (err) {
    console.error("[Stats] Error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET" },
  });
}
