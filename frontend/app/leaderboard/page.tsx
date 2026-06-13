"use client";

import { useAccount, useChainId, usePublicClient } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { DAILYDROP_ABI, CONTRACT_ADDRESSES } from "../../lib/contract";
import Link from "next/link";

interface LeaderEntry {
  address: string;
  streak: number;
  totalCheckIns: number;
}

export default function Leaderboard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [source, setSource] = useState<string>("fallback");
  const [filter, setFilter] = useState<"all" | "celo" | "base">("all");
  const [celoSet, setCeloSet] = useState<Set<string>>(new Set());
  const [baseSet, setBaseSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchLeaders = async () => {
      if (!publicClient || !contractAddress) return;

      let addresses: `0x${string}`[] = [];
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const json = await res.json();
          if (json.addresses?.length > 0) {
            addresses = json.addresses;
            setSource(json.source || "api");
          }
          if (json.celoAddresses) setCeloSet(new Set((json.celoAddresses as string[]).map((a: string) => a.toLowerCase())));
          if (json.baseAddresses) setBaseSet(new Set((json.baseAddresses as string[]).map((a: string) => a.toLowerCase())));
        }
      } catch {
        // API unavailable — show empty state
      }

      // Lit les données on-chain pour chaque adresse
      const entries = await Promise.allSettled(
        addresses.map(async (addr) => {
          const data = await publicClient.readContract({
            address: contractAddress,
            abi: DAILYDROP_ABI,
            functionName: "getUserData",
            args: [addr],
          }) as [bigint, bigint, bigint, boolean, boolean, bigint];
          return {
            address: addr,
            streak: Number(data[0]),
            totalCheckIns: Number(data[2]),
          };
        })
      );

      const valid = entries
  .filter((r) => r.status === "fulfilled")
  .map((r) => (r as PromiseFulfilledResult<LeaderEntry>).value)
        .filter((e) => e.totalCheckIns > 0)
        .sort((a, b) => b.streak - a.streak || b.totalCheckIns - a.totalCheckIns)
        .slice(0, 20);

      setLeaders(valid);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    };

    fetchLeaders();
    const interval = setInterval(fetchLeaders, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [publicClient, contractAddress]);

  const shortAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const rankEmoji = (i: number) =>
    i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

  const filteredLeaders = leaders.filter(l => {
    if (filter === "celo") return celoSet.has(l.address.toLowerCase());
    if (filter === "base") return baseSet.has(l.address.toLowerCase());
    return true;
  });

  return (
    <main className="app-container">
      <header className="app-header">
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <svg width="32" height="32" viewBox="0 0 64 64" fill="none">
            <rect width="64" height="64" rx="14" fill="#111111"/>
            <circle cx="32" cy="30" r="24" fill="#f97316"/>
            <path d="M32 14 C39 23 46 30 46 39 C46 48 40 54 32 54 C24 54 18 48 18 39 C18 30 25 23 32 14Z" fill="#ffffff" opacity="0.95"/>
            <circle cx="26" cy="36" r="6" fill="#ffffff" opacity="0.4"/>
          </svg>
          <span className="logo-text">DailyDrop</span>
        </Link>
        <div className="header-right">
          {isConnected
            ? <ConnectButton showBalance={false} chainStatus="icon" />
            : <ConnectButton label="Connect" showBalance={false} />
          }
        </div>
      </header>

      <section className="hero" style={{ paddingBottom: 0 }}>
        <h1 className="hero-title" style={{ fontSize: "clamp(28px,6vw,38px)" }}>
          Top Streaks 🏆
        </h1>
        <p className="hero-sub">
          {leaders.length > 0
            ? `${leaders.length} warriors checking in daily.`
            : "The most dedicated daily check-in warriors."}
        </p>
      </section>

      <div className="app-card" style={{ padding: "8px 0", gap: 0 }}>
        {/* Chain filters */}
        <div className="lb-filters">
          {(["all", "celo", "base"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`lb-filter-btn ${filter === f ? "active" : ""}`}
            >
              {f === "all" ? "All" : f === "celo" ? "🟡 Celo" : "🔵 Base"}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3, display: "inline-block" }} />
          </div>
        ) : filteredLeaders.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            {leaders.length === 0 ? "No check-ins yet. Be the first!" : "No wallets found for this filter."}
          </div>
        ) : (
          filteredLeaders.map((entry, i) => {
            const isYou = !!address && entry.address.toLowerCase() === address.toLowerCase();
            const isOnCelo = celoSet.has(entry.address.toLowerCase());
            const isOnBase = baseSet.has(entry.address.toLowerCase());
            const explorerUrl = isOnBase
              ? `https://basescan.org/address/${entry.address}`
              : `https://celoscan.io/address/${entry.address}`;
            const chainLabel = isOnCelo && isOnBase ? "both" : isOnCelo ? "celo" : "base";

            return (
              <div
                key={entry.address}
                className={`leaderboard-row ${isYou ? "lb-row-you" : ""}`}
              >
                <span className="lb-rank">{rankEmoji(i)}</span>
                <span className="lb-address">
                  {isYou && <span className="lb-you-badge">YOU</span>}
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lb-address-link"
                  >
                    {shortAddress(entry.address)}
                  </a>
                </span>
                <span className={`lb-chain-badge ${chainLabel}`}>
                  {chainLabel === "both" ? "CELO+BASE" : chainLabel.toUpperCase()}
                </span>
                <span className="lb-streak">🔥 {entry.streak}</span>
                <span className="lb-checkins">{entry.totalCheckIns} check-ins</span>
              </div>
            );
          })
        )}
      </div>

      {lastUpdated && (
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
          Updated at {lastUpdated} · refreshes every 5 min
        </p>
      )}

      {leaders.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
          {leaders.length} wallets · {source === "api" ? "Live from chain" : "Cached data"}
        </p>
      )}

      <div style={{ textAlign: "center" }}>
        <Link href="/" style={{ color: "var(--accent)", fontSize: 14, textDecoration: "none" }}>
          ← Back to app
        </Link>
      </div>
    </main>
  );
}