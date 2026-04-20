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

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isMiniPay } = useMiniPay();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk");
        const context = await sdk.context;
        if (context?.client?.clientFid) {
          await sdk.wallet.ethProvider.request({
            method: "eth_requestAccounts",
          });
        }
        await sdk.actions.ready();
      } catch (err) {
        console.log("Not in Farcaster context:", err);
      }
    };
    initFarcaster();
  }, []);

  const { data: userData, refetch: refetchUser } = useReadContract({
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

  const streak = userData ? Number(userData[0]) : 0;
  const totalCheckIns = userData ? Number(userData[2]) : 0;
  const canCheckIn = userData ? userData[3] : true;
  const canClaim = userData ? userData[4] : false;
  const nextCheckIn = userData ? Number(userData[5]) : 0;
  const formattedBalance = dropBalance ? parseFloat(formatEther(dropBalance)).toFixed(2) : "0.00";

  const isWrongNetwork = isConnected && !CONTRACT_ADDRESSES[chainId];

  return (
    <main className="app-container">
      {/* Header */}
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

      {/* Mauvais réseau */}
      {isWrongNetwork && (
        <div className="alert-warning">
          ⚠️ Switch to Celo or Base to use DailyDrop.
        </div>
      )}

      {/* App principale */}
      {isConnected && !isWrongNetwork ? (
        <div className="app-card" key={refreshKey}>
          <StreakDisplay
            streak={streak}
            totalCheckIns={totalCheckIns}
            nextCheckIn={nextCheckIn}
            canCheckIn={canCheckIn as boolean}
            dropBalance={formattedBalance}
          />
          <CheckInButton
            canCheckIn={canCheckIn as boolean}
            canClaim={canClaim as boolean}
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
          <div className="step">
            <span className="step-num">1</span>
            <span>Connect wallet (MiniPay, MetaMask, etc.)</span>
          </div>
          <div className="step">
            <span className="step-num">2</span>
            <span>Click Check-in once a day</span>
          </div>
          <div className="step">
            <span className="step-num">3</span>
            <span>Build a 7-day streak</span>
          </div>
          <div className="step">
            <span className="step-num">4</span>
            <span>Claim 10 DROP tokens 🎁</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="app-footer">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "6px" }}>
          <svg width="16" height="16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="14" fill="#111"/>
            <circle cx="32" cy="30" r="24" fill="#f97316"/>
            <path d="M32 14 C39 23 46 30 46 39 C46 48 40 54 32 54 C24 54 18 48 18 39 C18 30 25 23 32 14Z" fill="#fff" opacity="0.95"/>
          </svg>
          <span>DailyDrop</span>
        </div>
        <p>Built on Celo &amp; Base · Compatible with MiniPay &amp; Farcaster</p>
        <a href="/api/frame" target="_blank" rel="noopener noreferrer">Farcaster Frame</a>
      </footer>
    </main>
  );
}