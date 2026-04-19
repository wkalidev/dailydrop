import { NextRequest, NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dailydrop.vercel.app";

// Frame initial — GET
export async function GET() {
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="DailyDrop 🔥" />
    <meta property="og:description" content="Check in daily on-chain. 7-day streak = 10 DROP tokens." />
    <meta property="og:image" content="${APP_URL}/og-image.png" />
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${APP_URL}/og-image.png" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="🔥 Check In" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${APP_URL}" />
    <meta property="fc:frame:button:2" content="📊 My Streak" />
    <meta property="fc:frame:button:2:action" content="post" />
    <meta property="fc:frame:post_url" content="${APP_URL}/api/frame" />
  </head>
  <body>
    <p>DailyDrop — Check in daily on Celo & Base. Earn DROP tokens.</p>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// Frame action — POST (quand l'utilisateur clique "My Streak")
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fid = body?.untrustedData?.fid;

    // Image de réponse avec streak info
    const responseImageUrl = `${APP_URL}/api/frame/image?fid=${fid || "0"}`;

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${responseImageUrl}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="🔥 Open DailyDrop" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${APP_URL}" />
    <meta property="fc:frame:button:2" content="↩ Back" />
    <meta property="fc:frame:button:2:action" content="post" />
    <meta property="fc:frame:post_url" content="${APP_URL}/api/frame" />
  </head>
  <body>DailyDrop Frame</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new NextResponse("Error processing frame", { status: 500 });
  }
}
