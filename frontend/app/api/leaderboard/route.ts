import { NextResponse } from "next/server";

const CELO_CONTRACT = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b";
const BASE_CONTRACT = "0x974fB504172f2aABbecc698Ebf137202a5E4e495";

// Fallback list used only when both chain APIs fail
const KNOWN_ADDRESSES = [
  "0x6C98AB949Be4CDe57Db7A5286f27959Df1eD3937",
  "0x47825De02131f9d1b11718FD040A6FA4b28c5fEc",
  "0xE3143a87365D680D1eB19379F00C9ED0f416EC5d",
  "0x0A2dC3204E8F3b6b2a72BB97303Ae8C879E287bC",
  "0xcF314d504C5FCc04fC85fc567878C36c16B16B68",
  "0x97Ce1AaECd6e434C71B540Dd089eeCf735Cb2fe0",
  "0xDEAcDe6eC27Fd0cD972c1232C4f0d4171dda2357",
];

export async function GET() {
  try {
    // Fetch Celo and Base transactions in parallel
    const [celoRes, baseRes] = await Promise.allSettled([
      fetch(
        `https://api.celoscan.io/api?module=account&action=txlist&address=${CELO_CONTRACT}&startblock=647399&endblock=latest&sort=asc&apikey=${process.env.CELOSCAN_API_KEY || ""}`,
        { next: { revalidate: 300 }, headers: { Accept: "application/json" } }
      ),
      fetch(
        `https://api.basescan.org/api?module=account&action=txlist&address=${BASE_CONTRACT}&startblock=0&endblock=latest&sort=asc&apikey=${process.env.BASESCAN_API_KEY || ""}`,
        { next: { revalidate: 300 }, headers: { Accept: "application/json" } }
      ),
    ]);

    const fromCelo: string[] = [];
    const fromBase: string[] = [];

    if (celoRes.status === "fulfilled" && celoRes.value.ok) {
      const json = await celoRes.value.json();
      if (json.status === "1" && Array.isArray(json.result)) {
        json.result
          .filter((tx: { isError: string; to: string }) =>
            tx.isError === "0" && tx.to?.toLowerCase() === CELO_CONTRACT.toLowerCase()
          )
          .forEach((tx: { from: string }) => fromCelo.push(tx.from));
      }
    }

    if (baseRes.status === "fulfilled" && baseRes.value.ok) {
      const json = await baseRes.value.json();
      if (json.status === "1" && Array.isArray(json.result)) {
        json.result
          .filter((tx: { isError: string; to: string }) =>
            tx.isError === "0" && tx.to?.toLowerCase() === BASE_CONTRACT.toLowerCase()
          )
          .forEach((tx: { from: string }) => fromBase.push(tx.from));
      }
    }

    const combined = [...fromCelo, ...fromBase];
    if (combined.length > 0) {
      const merged = [...new Set([...KNOWN_ADDRESSES, ...combined])].slice(0, 200);
      return NextResponse.json({ addresses: merged, source: "api" });
    }
  } catch (err) {
    console.error("Leaderboard fetch failed:", err);
  }

  return NextResponse.json({ addresses: KNOWN_ADDRESSES, source: "fallback" });
}
