import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dailydrop-five.vercel.app";

function buildSVG(opts: {
  title: string;
  subtitle: string;
  streakNum?: number;
  bottomLine: string;
  accent?: string;
}): string {
  const { title, subtitle, streakNum, bottomLine, accent = "#f97316" } = opts;
  const streakDisplay = streakNum !== undefined
    ? `<text x="600" y="260" text-anchor="middle" font-family="Arial" font-size="120" font-weight="900" fill="${accent}">${streakNum}</text>
       <text x="600" y="310" text-anchor="middle" font-family="Arial" font-size="28" fill="#ffffff" opacity="0.5" letter-spacing="6">DAY STREAK</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <rect x="2" y="2" width="1196" height="626" rx="20" fill="none" stroke="${accent}" stroke-width="2" opacity="0.35"/>
  <ellipse cx="600" cy="120" rx="120" ry="180" fill="${accent}" opacity="0.07"/>
  <polygon points="570,40 600,0 630,40 618,70 582,70" fill="${accent}" opacity="0.5"/>
  <text x="600" y="160" text-anchor="middle" font-family="Arial" font-size="48" font-weight="900" fill="${accent}">${title}</text>
  <text x="600" y="210" text-anchor="middle" font-family="Arial" font-size="26" fill="#ffffff" opacity="0.6">${subtitle}</text>
  ${streakDisplay}
  <text x="600" y="${streakNum !== undefined ? "390" : "310"}" text-anchor="middle" font-family="Arial" font-size="22" fill="#888" opacity="0.7">${bottomLine}</text>
  <rect x="350" y="${streakNum !== undefined ? "430" : "350"}" width="500" height="54" rx="27" fill="${accent}" opacity="0.12"/>
  <rect x="350" y="${streakNum !== undefined ? "430" : "350"}" width="500" height="54" rx="27" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.35"/>
  <text x="600" y="${streakNum !== undefined ? "464" : "384"}" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700" fill="${accent}">${APP_URL}</text>
  <text x="600" y="590" text-anchor="middle" font-family="Arial" font-size="15" fill="#444" opacity="0.5">Celo · Base · Proof of Presence</text>
</svg>`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const fid     = searchParams.get("fid") || "0";

  // No address — show generic frame image
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    const svg = buildSVG({
      title:     "DailyDrop 🔥",
      subtitle:  "Check in daily. Earn DROP tokens.",
      bottomLine: "7-day streak = 10 DROP on Celo & Base",
    });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" },
    });
  }

  // Address provided — fetch real streak from /api/verify
  try {
    const verifyUrl = `${APP_URL}/api/verify?address=${address}&minStreak=1`;
    const res = await fetch(verifyUrl, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) throw new Error("verify failed");
    const data = await res.json();

    const streak    = data?.streak?.current ?? 0;
    const passed    = data?.passed ?? false;
    const badge     = data?.badges?.label ?? "";
    const canClaim  = data?.checkins?.canClaim ?? false;
    const canCheck  = data?.checkins?.canCheckIn ?? true;

    const accent = streak >= 7 ? "#FFD700" : streak >= 5 ? "#FF4444" : streak >= 3 ? "#f97316" : "#3b82f6";
    const short  = `${address.slice(0, 6)}…${address.slice(-4)}`;

    const subtitle = canClaim
      ? "🎁 Claim your 10 DROP now!"
      : canCheck
        ? "Ready to check in today!"
        : `${passed ? `✅ Verified — ${badge}` : "Not verified yet"}`;

    const svg = buildSVG({
      title:      `${short}`,
      subtitle,
      streakNum:  streak,
      bottomLine: `Total check-ins: ${data?.checkins?.total ?? 0}  ·  ${streak}/7 days`,
      accent,
    });

    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" },
    });
  } catch {
    // Fallback on error
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    const svg = buildSVG({
      title:     `${short}`,
      subtitle:  "Check your streak on DailyDrop",
      bottomLine: "Could not fetch on-chain data",
    });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
    });
  }
}
