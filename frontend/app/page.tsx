"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useReadContract, useChainId } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import { CheckInButton } from "../components/CheckInButton";
import { StreakDisplay } from "../components/StreakDisplay";
import { MiniPayBadge, useMiniPay } from "../components/MiniPayDetector";
import { DAILYDROP_ABI, CONTRACT_ADDRESSES } from "../lib/contract";
import { AddTokenButton } from "../components/AddTokenButton";
import InstallBanner from "../components/InstallBanner";
import { FarcasterAutoConnect } from "../components/FarcasterAutoConnect";

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isMiniPay } = useMiniPay();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const [refreshKey, setRefreshKey] = useState(0);
  const [globalStats, setGlobalStats] = useState({ totalCheckIns: 0, uniqueWallets: 0, celoWallets: 0, baseWallets: 0 });

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setGlobalStats(d); })
      .catch(() => {});
  }, []);


  const { data: userData, refetch: refetchUser, isPending: isUserPending } = useReadContract({
    address: contractAddress,
    abi: DAILYDROP_ABI,
    functionName: "getUserData",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress },
  });

  const { data: dropBalance, refetch: refetchBalance } = useReadContract({
    address: contractAddress,
    abi: DAILYDROP_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress },
  });

  const handleSuccess = useCallback(() => {
    refetchUser();
    refetchBalance();
    setRefreshKey((k) => k + 1);
  }, [refetchUser, refetchBalance]);

  const scrollTo = (sel: string) =>
    (document.querySelector(sel) ?? document.querySelector(".app-card"))
      ?.scrollIntoView({ behavior: "smooth", block: "center" });

  const streak = userData ? Number(userData[0]) : 0;
  const totalCheckIns = userData ? Number(userData[2]) : 0;
  const canCheckIn = userData ? userData[3] : true;
  const canClaim = userData ? userData[4] : false;
  const nextCheckIn = userData ? Number(userData[5]) : 0;
  const formattedBalance = dropBalance ? parseFloat(formatEther(dropBalance)).toFixed(2) : "0.00";

  const isWrongNetwork = isConnected && !CONTRACT_ADDRESSES[chainId];

  return (
    <main className="app-container">
      <FarcasterAutoConnect />
      {/* Header */}
      <InstallBanner />
      <header className="app-header">
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="14" fill="#111111"/>
            <circle cx="32" cy="30" r="24" fill="#f97316"/>
            <path d="M32 14 C39 23 46 30 46 39 C46 48 40 54 32 54 C24 54 18 48 18 39 C18 30 25 23 32 14Z" fill="#ffffff" opacity="0.95"/>
            <circle cx="26" cy="36" r="6" fill="#ffffff" opacity="0.4"/>
          </svg>
          <span className="logo-text">DailyDrop</span>
        </div>
        <div className="header-right">
          <MiniPayBadge />
          {!isMiniPay && <ConnectButton showBalance={false} chainStatus="icon" />}
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">
          Check in daily.<br />
          <span className="hero-accent">Earn DROP.</span>
        </h1>
        <p className="hero-sub">
          7-day streak = 10 DROP tokens. On-chain. On Celo &amp; Base.
        </p>
      </section>

      {/* Protocol stats */}
      {globalStats.totalCheckIns > 0 && (
        <div className="protocol-stats">
          <div className="protocol-stat-card">
            <div className="protocol-stat-value">{globalStats.totalCheckIns.toLocaleString()}</div>
            <div className="protocol-stat-label">Total check-ins</div>
          </div>
          <div className="protocol-stat-card">
            <div className="protocol-stat-value">{globalStats.uniqueWallets.toLocaleString()}</div>
            <div className="protocol-stat-label">Unique wallets</div>
          </div>
          <div className="protocol-stat-card">
            <div className="protocol-stat-value">{globalStats.celoWallets.toLocaleString()}</div>
            <div className="protocol-stat-label">Celo</div>
          </div>
          <div className="protocol-stat-card">
            <div className="protocol-stat-value">{globalStats.baseWallets.toLocaleString()}</div>
            <div className="protocol-stat-label">Base</div>
          </div>
        </div>
      )}

      {/* Wrong network */}
      {isWrongNetwork && (
        <div className="alert-warning">
          ⚠️ Switch to Celo or Base to use DailyDrop.
        </div>
      )}

      {/* App principale */}
      {isConnected && !isWrongNetwork ? (
        <div className="app-card" key={refreshKey}>
          {isUserPending ? (
            <div className="skeleton-row">
              <div className="skeleton" style={{ width: 80, height: 56 }} />
              <div className="skeleton" style={{ width: 200, height: 20 }} />
            </div>
          ) : (
            <StreakDisplay
              streak={streak}
              totalCheckIns={totalCheckIns}
              nextCheckIn={nextCheckIn}
              canCheckIn={canCheckIn as boolean}
              dropBalance={formattedBalance}
            />
          )}
          <CheckInButton
            canCheckIn={canCheckIn as boolean}
            canClaim={canClaim as boolean}
            streak={streak}
            onSuccess={handleSuccess}
          />
          <AddTokenButton />
        </div>
      ) : !isConnected ? (
        <div className="connect-prompt">
          <div className="connect-icon">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="64" height="64" rx="14" fill="#1a1a1a"/>
              <circle cx="32" cy="30" r="24" fill="#f97316" opacity="0.8"/>
              <path d="M32 14 C39 23 46 30 46 39 C46 48 40 54 32 54 C24 54 18 48 18 39 C18 30 25 23 32 14Z" fill="#ffffff" opacity="0.95"/>
              <circle cx="26" cy="36" r="6" fill="#ffffff" opacity="0.4"/>
            </svg>
          </div>
          <p>Connect your wallet to start your streak</p>
          {!isMiniPay && (
            <ConnectButton label="Connect Wallet" />
          )}
        </div>
      ) : null}

      {/* How it works */}
      <section className="how-it-works">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step" role="button" onClick={() => scrollTo(isConnected ? ".app-card" : ".connect-prompt")}>
            <span className="step-num">1</span>
            <span>Connect wallet (MiniPay, MetaMask, etc.)</span>
          </div>
          <div className="step" role="button" onClick={() => scrollTo(".btn-checkin")}>
            <span className="step-num">2</span>
            <span>Click Check-in once a day</span>
          </div>
          <div className="step" role="button" onClick={() => scrollTo(".streak-container")}>
            <span className="step-num">3</span>
            <span>Build a 7-day streak</span>
          </div>
          <div className="step" role="button" onClick={() => scrollTo(".btn-claim")}>
            <span className="step-num">4</span>
            <span>Claim 10 DROP tokens 🎁</span>
          </div>
          <div className="step" role="button" onClick={() => window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent("🔥 Checking in daily on DailyDrop to earn DROP tokens! Join me 👉 https://dailydrop-five.vercel.app")}`, "_blank")}>
            <span className="step-num">5</span>
            <span>Invite friends &amp; share your streak 🔗</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/leaderboard">🏆 Leaderboard</a>
          <a href="/api/frame" target="_blank" rel="noopener noreferrer">🖼 Farcaster Frame</a>
        </div>
        <p>Built on Celo &amp; Base · Compatible with MiniPay &amp; Farcaster</p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", fontSize: 11 }}>
          <a href="/terms" style={{ color: "var(--text-muted)" }}>Terms</a>
          <a href="/privacy" style={{ color: "var(--text-muted)" }}>Privacy</a>
          <a href="https://github.com/wkalidev/dailydrop/issues" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)" }}>Support</a>
          <a href="https://github.com/wkalidev/dailydrop" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)" }}>
            GitHub
          </a>
          <a href="https://www.npmjs.com/package/@dailydrop/shield" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-muted)" }}>
            npm
          </a>
        </div>
      </footer>
    </main>
  );
}