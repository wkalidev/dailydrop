import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dailydrop.vercel.app";

export const metadata: Metadata = {
  title: "DailyDrop — Check in daily, earn DROP",
  description: "7-day streak check-in dApp on Celo & Base. Compatible with MiniPay and Farcaster.",
  openGraph: {
    title: "DailyDrop 🔥",
    description: "Check in daily on-chain. 7-day streak = 10 DROP tokens.",
    url: APP_URL,
    images: [`${APP_URL}/og-image.png`],
  },
  other: {
    // Farcaster Frame meta tags
    "fc:frame": "vNext",
    "fc:frame:image": `${APP_URL}/og-image.png`,
    "fc:frame:button:1": "🔥 Check In",
    "fc:frame:post_url": `${APP_URL}/api/frame`,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
