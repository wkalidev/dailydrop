import { NextResponse } from "next/server";

const CELO_CONTRACT = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b";

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
    const url = `https://api.celoscan.io/api?module=account&action=txlist&address=${CELO_CONTRACT}&startblock=647399&endblock=latest&sort=asc`;

    const res = await fetch(url, {
      next: { revalidate: 300 }, // cache 5 minutes
    });

    const json = await res.json();

    if (json.status === "1" && Array.isArray(json.result)) {
      const fromApi = json.result
        .filter(
          (tx: { isError: string; to: string }) =>
            tx.isError === "0" &&
            tx.to?.toLowerCase() === CELO_CONTRACT.toLowerCase()
        )
        .map((tx: { from: string }) => tx.from);

      const merged = [
        ...new Set([...KNOWN_ADDRESSES, ...fromApi]),
      ];

      return NextResponse.json({ addresses: merged });
    }

    // Fallback sur les adresses connues
    return NextResponse.json({ addresses: KNOWN_ADDRESSES });
  } catch (err) {
    console.error("Leaderboard API error:", err);
    return NextResponse.json({ addresses: KNOWN_ADDRESSES });
  }
}