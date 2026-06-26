import type { Metadata, Viewport } from "next";
import { Space_Mono, Syne } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dailydrop-five.vercel.app";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

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
        url: `${APP_URL}/og-image.svg`,
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
    images: [`${APP_URL}/og-image.svg`],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "DailyDrop",
    "application-name": "DailyDrop",
    "base:app_id": "69e56bc887970a2e83bef402",
    "talentapp:project_verification": "0b22c6a1c2582dd366f212943bcf48eb1039804eb76152f98a8ec0c884ea0fe70edd9320cdfcc9c65a243808117acba320903f02f90b38521232f86c57d2d46d",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/og-image.svg`,
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
    <html lang="en" className={`${syne.variable} ${spaceMono.variable}`}>
      <head>
        {/* Critical above-the-fold CSS inlined to eliminate render-blocking paint */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root{--bg:#0a0a0a;--surface:#111111;--surface2:#1a1a1a;--border:#222222;--accent:#f97316;--accent2:#fb923c;--accent-dim:rgba(249,115,22,.12);--success:#22c55e;--error:#ef4444;--text:#f5f5f5;--text-dim:#888;--text-muted:#444;--radius:16px;--radius-sm:10px}
          *{box-sizing:border-box;margin:0;padding:0}
          body{background:var(--bg);color:var(--text);font-family:var(--font-syne),system-ui,sans-serif;min-height:100vh;background-image:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(249,115,22,.08) 0%,transparent 70%),radial-gradient(ellipse 40% 30% at 80% 100%,rgba(249,115,22,.04) 0%,transparent 60%)}
          .app-container{max-width:480px;margin:0 auto;padding:0 20px 60px;min-height:100vh;display:flex;flex-direction:column;gap:32px}
          .app-header{display:flex;align-items:center;justify-content:space-between;padding:20px 0 0}
          .logo{display:flex;align-items:center;gap:8px}
          .logo-text{font-family:var(--font-syne),sans-serif;font-weight:800;font-size:20px;letter-spacing:-.5px;color:var(--text)}
          .hero{padding-top:8px}
          .hero-title{font-size:clamp(32px,8vw,44px);font-weight:800;line-height:1.1;letter-spacing:-1.5px}
          .hero-accent{color:var(--accent)}
          .hero-sub{margin-top:12px;color:var(--text-dim);font-size:15px;line-height:1.5}
          .connect-prompt{display:flex;flex-direction:column;align-items:center;gap:16px;padding:40px 24px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);text-align:center}
          .connect-icon{width:64px;height:64px}
        ` }} />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}