"use client";

import { useEffect, useRef } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useAccount,
} from "wagmi";
import {
  DAILYDROP_ABI,
  CONTRACT_ADDRESSES,
  CHAIN_LABELS,
  CHAIN_KEYS,
} from "../lib/contract";

interface CheckInButtonProps {
  canCheckIn: boolean;
  canClaim:   boolean;
  streak?:    number;
  onSuccess:  () => void;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function launchConfetti() {
  if (typeof document === "undefined") return;
  const colors = ["#f97316", "#22c55e", "#3b82f6", "#fbbf24"];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.cssText = `left:${Math.random() * 100}vw;top:0;background:${
      colors[Math.floor(Math.random() * colors.length)]
    };animation-delay:${(Math.random() * 0.5).toFixed(2)}s;`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 3000);
  }
}

// ─── Error formatting ─────────────────────────────────────────────────────────
function formatTxError(err: Error): string {
  const msg = err.message ?? "";
  if (/user rejected|user denied|4001/i.test(msg)) return "Transaction cancelled.";
  if (/insufficient.*fund|not enough.*gas/i.test(msg)) return "Insufficient funds for gas.";
  if (/already checked in/i.test(msg)) return "Already checked in today. Come back tomorrow!";
  if (/network|fetch|connect/i.test(msg)) return "Network error. Check your connection and retry.";
  return msg.slice(0, 120) || "Unknown error.";
}

// ─── Relayer call ─────────────────────────────────────────────────────────────
async function notifyRelayer(
  userAddress: string,
  chain: string,
  txHash: string
): Promise<void> {
  try {
    await fetch("/api/relayer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relayer-secret": process.env.NEXT_PUBLIC_RELAYER_SECRET || "",
      },
      body: JSON.stringify({ user: userAddress, chain, txHash }),
    });
  } catch (err) {
    // Non-blocking — local on-chain streak is already updated
    console.warn("Relayer notification failed (non-blocking):", err);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInButton({ canCheckIn, canClaim, streak = 0, onSuccess }: CheckInButtonProps) {
  const chainId   = useChainId();
  const { address } = useAccount();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const chainLabel = CHAIN_LABELS[chainId] ?? "Unknown";
  const chainKey   = CHAIN_KEYS[chainId]   ?? "base";

  // ── Check-in ──
  const {
    writeContract: writeCheckIn,
    data:          checkInHash,
    isPending:     isCheckInPending,
    error:         checkInError,
    reset:         resetCheckIn,
  } = useWriteContract();

  const { isLoading: isCheckInConfirming, isSuccess: isCheckInSuccess } =
    useWaitForTransactionReceipt({ hash: checkInHash });

  // ── Claim ──
  const {
    writeContract: writeClaim,
    data:          claimHash,
    isPending:     isClaimPending,
    error:         claimError,
    reset:         resetClaim,
  } = useWriteContract();

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimHash });

  const notifiedCheckIn = useRef(false);
  const notifiedClaim   = useRef(false);

  useEffect(() => {
    if (isCheckInSuccess && checkInHash && !notifiedCheckIn.current) {
      notifiedCheckIn.current = true;
      if (address) notifyRelayer(address, chainKey, checkInHash);
      const t = setTimeout(() => {
        onSuccess();
        resetCheckIn();
        notifiedCheckIn.current = false;
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [isCheckInSuccess, checkInHash, address, chainKey, onSuccess, resetCheckIn]);

  useEffect(() => {
    if (isClaimSuccess && claimHash && !notifiedClaim.current) {
      notifiedClaim.current = true;
      if (address) notifyRelayer(address, chainKey, claimHash);
      launchConfetti();
      const t = setTimeout(() => {
        onSuccess();
        resetClaim();
        notifiedClaim.current = false;
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [isClaimSuccess, claimHash, address, chainKey, onSuccess, resetClaim]);

  // ── Handlers ──
  const handleCheckIn = () => {
    if (!contractAddress) return;
    writeCheckIn({
      address:      contractAddress,
      abi:          DAILYDROP_ABI,
      functionName: "checkIn",
    });
  };

  const handleClaim = () => {
    if (!contractAddress) return;
    writeClaim({
      address:      contractAddress,
      abi:          DAILYDROP_ABI,
      functionName: "claimReward",
    });
  };

  // ── Derived state ──
  const isLoading = isCheckInPending || isCheckInConfirming || isClaimPending || isClaimConfirming;
  const error     = checkInError || claimError;

  // ── Success states ──
  if (isCheckInSuccess) {
    const shareText = `🔥 ${streak + 1} day streak on DailyDrop! Checking in daily on Celo & Base to earn DROP tokens. Join me! 👉`;
    const shareUrl  = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent("https://dailydrop-five.vercel.app")}`;
    return (
      <div className="btn-success animate-pulse-once">
        <p>✅ Checked in on {chainLabel}! Streak updated.</p>
        <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="btn-share-farcaster">
          🟣 Share on Farcaster
        </a>
      </div>
    );
  }

  if (isClaimSuccess) {
    return (
      <div className="btn-success animate-pulse-once">
        🎁 10 DROP claimed on {chainLabel}! New streak started.
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="btn-group">
      {/* Active chain indicator */}
      <div className="chain-indicator">
        <span className="chain-dot" data-chain={chainKey} />
        <span className="chain-label">{chainLabel}</span>
      </div>

      {/* Check-in button */}
      <button
        onClick={handleCheckIn}
        disabled={!canCheckIn || isLoading || !contractAddress}
        className={`btn-checkin ${!canCheckIn ? "btn-disabled" : ""} ${isLoading ? "btn-loading" : ""}`}
      >
        {isCheckInPending || isCheckInConfirming ? (
          <span className="loading-text">
            <span className="spinner" />
            {isCheckInPending ? "Confirm in wallet..." : "Confirming on-chain..."}
          </span>
        ) : !contractAddress ? (
          "⚠️ Unsupported network"
        ) : !canCheckIn ? (
          "✓ Already checked in today"
        ) : (
          `🔥 Check in on ${chainLabel}`
        )}
      </button>

      {/* Claim button (streak >= 7) */}
      {canClaim && (
        <button
          onClick={handleClaim}
          disabled={isLoading}
          className={`btn-claim ${isLoading ? "btn-loading" : ""}`}
        >
          {isClaimPending || isClaimConfirming ? (
            <span className="loading-text">
              <span className="spinner" />
              {isClaimPending ? "Confirm in wallet..." : "Claiming..."}
            </span>
          ) : (
            `🎁 Claim 10 DROP on ${chainLabel}`
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <p className="error-msg">
          ❌ {formatTxError(error)}
        </p>
      )}
    </div>
  );
}
