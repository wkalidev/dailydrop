"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { STREAK_NFT_ABI, STREAK_NFT_ADDRESS } from "../lib/contract";

interface StreakDisplayProps {
  streak:        number;
  totalCheckIns: number;
  nextCheckIn:   number;
  canCheckIn:    boolean;
  dropBalance:   string;
  lastChain?:    string; // "celo" | "base" | "stacks"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(nextCheckIn: number): string {
  const now  = Math.floor(Date.now() / 1000);
  const diff = nextCheckIn - now;
  if (diff <= 0) return "Now!";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}h ${m}m ${s}s`;
}

const CHAIN_COLORS: Record<string, string> = {
  celo:   "#35D07F",
  base:   "#0052FF",
  stacks: "#FF5500",
};

const CHAIN_LABELS: Record<string, string> = {
  celo:   "Celo",
  base:   "Base",
  stacks: "Stacks",
};

// ─── NFT Preview ──────────────────────────────────────────────────────────────

function NFTPreview({ address }: { address: `0x${string}` }) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const { data: tokenId } = useReadContract({
    address:      STREAK_NFT_ADDRESS,
    abi:          STREAK_NFT_ABI,
    functionName: "tokenOfOwner",
    args:         [address],
  });

  const { data: tokenURI } = useReadContract({
    address:      STREAK_NFT_ADDRESS,
    abi:          STREAK_NFT_ABI,
    functionName: "tokenURI",
    args:         [tokenId ?? BigInt(0)],
    query:        { enabled: !!tokenId && tokenId > BigInt(0) },
  });

  useEffect(() => {
    if (!tokenURI) return;
    try {
      const b64json = (tokenURI as string).replace("data:application/json;base64,", "");
      const json    = JSON.parse(atob(b64json));
      const imgData = json.image as string;
      const svgB64  = imgData.replace("data:image/svg+xml;base64,", "");
      setSvgContent(atob(svgB64));
    } catch {
      setSvgContent(null);
    }
  }, [tokenURI]);

  if (!tokenId || tokenId === BigInt(0)) return null;

  return (
    <div className="nft-preview">
      {svgContent ? (
        <div
          className="nft-svg-wrapper"
          dangerouslySetInnerHTML={{ __html: svgContent }}
          title={`DailyDrop Streak NFT #${tokenId.toString()}`}
        />
      ) : (
        <div className="nft-placeholder">
          <span>NFT #{tokenId.toString()}</span>
        </div>
      )}
      <p className="nft-label">Your streak NFT · 100% on-chain</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StreakDisplay({
  streak,
  totalCheckIns,
  nextCheckIn,
  canCheckIn,
  dropBalance,
  lastChain = "base",
}: StreakDisplayProps) {
  const { address } = useAccount();
  const [countdown, setCountdown] = useState("");

  // Countdown live — resets immediately when canCheckIn changes
  useEffect(() => {
    if (canCheckIn || nextCheckIn <= 0) {
      setCountdown("");
      return;
    }
    setCountdown(formatCountdown(nextCheckIn));
    const interval = setInterval(() => {
      setCountdown(formatCountdown(nextCheckIn));
    }, 1000);
    return () => clearInterval(interval);
  }, [canCheckIn, nextCheckIn]);

  const days = Array.from({ length: 7 }, (_, i) => i < Math.min(streak, 7));

  const chainColor = CHAIN_COLORS[lastChain] ?? "#888";
  const chainLabel = CHAIN_LABELS[lastChain] ?? lastChain;

  return (
    <div className="streak-container">

      {/* Streak + chain badge */}
      <div className="streak-main">
        <span className="streak-fire">🔥</span>
        <span className="streak-number">{streak}</span>
        <span className="streak-label">day streak</span>
        {lastChain && (
          <span
            className="chain-badge"
            style={{ borderColor: chainColor, color: chainColor }}
          >
            {chainLabel}
          </span>
        )}
      </div>

      {/* Progress dots — 7 days */}
      <div className="streak-dots">
        {days.map((filled, i) => (
          <div
            key={i}
            className={`streak-dot ${filled ? "filled" : ""} ${i === Math.min(streak, 7) - 1 && filled ? "current" : ""}`}
            title={`Day ${i + 1}`}
          >
            {filled ? "✓" : i + 1}
          </div>
        ))}
      </div>

      <p className="streak-hint">
        {streak >= 7
          ? "🎁 Ready to claim!"
          : `${7 - streak} more day${7 - streak > 1 ? "s" : ""} to earn 10 DROP`}
      </p>

      {/* NFT preview (when connected) */}
      {address && <NFTPreview address={address} />}

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-value">{totalCheckIns}</span>
          <span className="stat-label">Total Check-ins</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{dropBalance}</span>
          <span className="stat-label">DROP Balance</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{canCheckIn ? "✅" : countdown}</span>
          <span className="stat-label">{canCheckIn ? "Ready!" : "Next check-in"}</span>
        </div>
      </div>

      {/* Cross-chain note */}
      {lastChain && (
        <p className="cross-chain-note">
          Last check-in from{" "}
          <span style={{ color: chainColor, fontWeight: 600 }}>{chainLabel}</span>
          {" · "}
          Unified streak on Base
        </p>
      )}
    </div>
  );
}
