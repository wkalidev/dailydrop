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
    "talentapp:project_verification": "0b22c6a1c2582dd366f212943bcf48eb1039804eb76152f98a8ec0c884ea0fe70edd9320cdfcc9c65a243808117acba320903f02f90b38521232f86c57d2d46d",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/og-image.png`,
      button: {
        title: "🔥 Check In",
        action: {
          type: "launch_frame",
          name: "DailyDrop",
          url: APP_URL,
          splashImageUrl: `${APP_URL}/icon-512.svg`,
          splashBackgroundColor: "#000000",
        },
      },
    }),
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