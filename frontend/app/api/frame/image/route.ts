import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dailydrop-five.vercel.app";

// Returns a 1200x630 SVG image for Farcaster Frame "My Streak" button
// FID-based streak lookup requires a Farcaster Hub — for now shows a generic message
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fid = searchParams.get("fid") || "0";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <rect x="2" y="2" width="1196" height="626" rx="20" fill="none" stroke="#f97316" stroke-width="2" opacity="0.4"/>
  <ellipse cx="600" cy="160" rx="80" ry="130" fill="#f97316" opacity="0.15"/>
  <polygon points="570,60 600,0 630,60 618,100 582,100" fill="#f97316" opacity="0.6"/>
  <text x="600" y="280" text-anchor="middle" font-family="Arial" font-size="64" font-weight="900" fill="#f97316">DailyDrop 🔥</text>
  <text x="600" y="360" text-anchor="middle" font-family="Arial" font-size="32" fill="#ffffff" opacity="0.7">Check your streak on-chain</text>
  <text x="600" y="420" text-anchor="middle" font-family="Arial" font-size="24" fill="#888" opacity="0.6">7-day streak = 10 DROP tokens</text>
  <rect x="350" y="460" width="500" height="60" rx="30" fill="#f97316" opacity="0.15"/>
  <rect x="350" y="460" width="500" height="60" rx="30" fill="none" stroke="#f97316" stroke-width="1.5" opacity="0.4"/>
  <text x="600" y="499" text-anchor="middle" font-family="Arial" font-size="22" font-weight="700" fill="#f97316">${APP_URL}</text>
  <text x="600" y="590" text-anchor="middle" font-family="Arial" font-size="16" fill="#444" opacity="0.6">FID ${fid} · Celo &amp; Base · Proof of Presence</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
    },
  });
}
