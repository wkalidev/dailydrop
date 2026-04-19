"use client";

import { useEffect, useState } from "react";

interface StreakDisplayProps {
  streak: number;
  totalCheckIns: number;
  nextCheckIn: number;
  canCheckIn: boolean;
  dropBalance: string;
}

function formatCountdown(nextCheckIn: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = nextCheckIn - now;
  if (diff <= 0) return "Now!";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${h}h ${m}m ${s}s`;
}

export function StreakDisplay({
  streak,
  totalCheckIns,
  nextCheckIn,
  canCheckIn,
  dropBalance,
}: StreakDisplayProps) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!canCheckIn && nextCheckIn > 0) {
      const interval = setInterval(() => {
        setCountdown(formatCountdown(nextCheckIn));
      }, 1000);
      setCountdown(formatCountdown(nextCheckIn));
      return () => clearInterval(interval);
    }
  }, [canCheckIn, nextCheckIn]);

  const days = Array.from({ length: 7 }, (_, i) => i < streak % 8);

  return (
    <div className="streak-container">
      {/* Streak principal */}
      <div className="streak-main">
        <span className="streak-fire">🔥</span>
        <span className="streak-number">{streak}</span>
        <span className="streak-label">day streak</span>
      </div>

      {/* Progress bar 7 jours */}
      <div className="streak-dots">
        {days.map((filled, i) => (
          <div
            key={i}
            className={`streak-dot ${filled ? "filled" : ""} ${i === streak - 1 && filled ? "current" : ""}`}
            title={`Day ${i + 1}`}
          >
            {filled ? "✓" : i + 1}
          </div>
        ))}
      </div>
      <p className="streak-hint">
        {streak >= 7 ? "🎁 Ready to claim!" : `${7 - streak} more day${7 - streak > 1 ? "s" : ""} to earn 10 DROP`}
      </p>

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
    </div>
  );
}
