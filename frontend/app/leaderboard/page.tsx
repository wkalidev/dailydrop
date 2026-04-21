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

const KNOWN_ADDRESSES: `0x${string}`[] = [
  "0x6C98AB949Be4CDe57Db7A5286f27959Df1eD3937",
  "0x47825De02131f9d1b11718FD040A6FA4b28c5fEc",
  "0xE3143a87365D680D1eB19379F00C9ED0f416EC5d",
  "0x0A2dC3204E8F3b6b2a72BB97303Ae8C879E287bC",
  "0xcF314d504C5FCc04fC85fc567878C36c16B16B68",
  "0x97Ce1AaECd6e434C71B540Dd089eeCf735Cb2fe0",
  "0xDEAcDe6eC27Fd0cD972c1232C4f0d4171dda2357",
];

export default function Leaderboard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const fetchLeaders = async () => {
      if (!publicClient || !contractAddress) return;

      // Essaie l'API, sinon utilise les adresses connues directement
      let addresses: `0x${string}`[] = KNOWN_ADDRESSES;
      try {
        const res = await fetch("/api/leaderboard");
        if (res.ok) {
          const json = await res.json();
          if (json.addresses?.length > 0) {
            addresses = json.addresses;
          }
        }
      } catch {
        // Utilise KNOWN_ADDRESSES
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
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3, display: "inline-block" }} />
          </div>
        ) : leaders.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-dim)" }}>
            No check-ins yet. Be the first!
          </div>
        ) : (
          leaders.map((entry, i) => (
            <div
              key={entry.address}
              className="leaderboard-row"
              style={{
                background: entry.address.toLowerCase() === address?.toLowerCase()
                  ? "rgba(249,115,22,0.07)" : "transparent",
                borderLeft: entry.address.toLowerCase() === address?.toLowerCase()
                  ? "3px solid #f97316" : "3px solid transparent",
              }}
            >
              <span className="lb-rank">{rankEmoji(i)}</span>
              <span className="lb-address">
                {entry.address.toLowerCase() === address?.toLowerCase()
                  ? "You 👋"
                  : shortAddress(entry.address)}
              </span>
              <span className="lb-streak">🔥 {entry.streak}</span>
              <span className="lb-checkins">{entry.totalCheckIns} check-ins</span>
            </div>
          ))
        )}
      </div>

      {lastUpdated && (
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)" }}>
          Updated at {lastUpdated} · refreshes every 5 min
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