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

const CELOSCAN_API = "https://api.celoscan.io/api";
const CELO_CONTRACT = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b";
// CheckIn event topic0
const CHECKIN_TOPIC = "0x" + Array.from(
  new TextEncoder().encode("CheckIn(address,uint256,uint256)")
).reduce((h, b) => h, "");

export default function Leaderboard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeaders = async () => {
      if (!publicClient || !contractAddress) return;
      try {
        // Utilise l'API Celoscan pour récupérer les transactions
        const url = `${CELOSCAN_API}?module=account&action=txlist&address=${CELO_CONTRACT}&startblock=647399&endblock=latest&sort=asc&apikey=YourApiKeyToken`;
        const res = await fetch(url);
        const json = await res.json();

        if (json.status !== "1" || !json.result) {
          throw new Error("Celoscan API error");
        }

        // Filtre les transactions checkIn (selector = 0x183ff085)
        const checkInTxs = json.result.filter(
          (tx: { input: string }) => tx.input?.startsWith("0x183ff085")
        );

        // Déduplique les adresses des expéditeurs
        const uniqueAddresses = [
          ...new Set(checkInTxs.map((tx: { from: string }) => tx.from as `0x${string}`)),
        ] as `0x${string}`[];

        if (uniqueAddresses.length === 0) {
          setLeaders([]);
          return;
        }

        // Récupère les données on-chain pour chaque utilisateur
        const entries = await Promise.all(
          uniqueAddresses.map(async (addr) => {
            try {
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
            } catch {
              return { address: addr, streak: 0, totalCheckIns: 0 };
            }
          })
        );

        entries.sort((a, b) => b.streak - a.streak || b.totalCheckIns - a.totalCheckIns);
        setLeaders(entries.filter((e) => e.totalCheckIns > 0).slice(0, 20));
      } catch (err) {
        console.error("Leaderboard error:", err);
        setError("Could not load leaderboard. Try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
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
        ) : error ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--error)" }}>
            {error}
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

      <div style={{ textAlign: "center" }}>
        <Link href="/" style={{ color: "var(--accent)", fontSize: 14, textDecoration: "none" }}>
          ← Back to app
        </Link>
      </div>
    </main>
  );
}