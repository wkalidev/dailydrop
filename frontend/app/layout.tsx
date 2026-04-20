import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dailydrop-five.vercel.app";

export const metadata: Metadata = {
  title: "DailyDrop — Check in daily, earn DROP",
  description: "7-day streak check-in dApp on Celo & Base. Compatible with MiniPay and Farcaster.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-512.svg",
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "DailyDrop 🔥",
    description: "Check in daily on-chain. 7-day streak = 10 DROP tokens.",
    url: APP_URL,
    siteName: "DailyDrop",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "DailyDrop — Check in daily, earn DROP tokens",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DailyDrop 🔥",
    description: "Check in daily on-chain. 7-day streak = 10 DROP tokens.",
    images: [`${APP_URL}/og-image.png`],
  },
  other: {
    "base:app_id": "69e56bc887970a2e83bef402",
    "fc:frame": "vNext",
    "fc:frame:image": `${APP_URL}/og-image.png`,
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:button:1": "🔥 Check In",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": APP_URL,
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