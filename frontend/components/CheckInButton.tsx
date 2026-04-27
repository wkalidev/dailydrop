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
  onSuccess:  () => void;
}

// ─── Relayer call ─────────────────────────────────────────────────────────────
// Notifie le backend qui appellera StreakMaster.updateStreak() sur Base
async function notifyRelayer(
  userAddress: string,
  chain: string,
  txHash: string
): Promise<void> {
  try {
    await fetch("/api/relayer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: userAddress, chain, txHash }),
    });
  } catch (err) {
    // Non bloquant — le streak on-chain local est déjà mis à jour
    console.warn("Relayer notification failed (non-blocking):", err);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInButton({ canCheckIn, canClaim, onSuccess }: CheckInButtonProps) {
  const chainId   = useChainId();
  const { address } = useAccount();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const chainLabel = CHAIN_LABELS[chainId]  ?? "Unknown";
  const chainKey   = CHAIN_KEYS[chainId]    ?? "base";

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

  // ── onSuccess + relayer (useEffect, pas dans le render) ──
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
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [isCheckInSuccess, checkInHash, address, chainKey, onSuccess, resetCheckIn]);

  useEffect(() => {
    if (isClaimSuccess && claimHash && !notifiedClaim.current) {
      notifiedClaim.current = true;
      if (address) notifyRelayer(address, chainKey, claimHash);
      const t = setTimeout(() => {
        onSuccess();
        resetClaim();
        notifiedClaim.current = false;
      }, 2000);
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
    return (
      <div className="btn-success animate-pulse-once">
        ✅ Checked in on {chainLabel}! Streak mis à jour.
      </div>
    );
  }

  if (isClaimSuccess) {
    return (
      <div className="btn-success animate-pulse-once">
        🎁 10 DROP claimed sur {chainLabel}! Nouveau streak en cours.
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="btn-group">
      {/* Indicateur de chaîne active */}
      <div className="chain-indicator">
        <span className="chain-dot" data-chain={chainKey} />
        <span className="chain-label">{chainLabel}</span>
      </div>

      {/* Bouton Check-in */}
      <button
        onClick={handleCheckIn}
        disabled={!canCheckIn || isLoading || !contractAddress}
        className={`btn-checkin ${!canCheckIn ? "btn-disabled" : ""} ${isLoading ? "btn-loading" : ""}`}
      >
        {isCheckInPending || isCheckInConfirming ? (
          <span className="loading-text">
            <span className="spinner" />
            {isCheckInPending ? "Confirme dans le wallet..." : "Confirmation on-chain..."}
          </span>
        ) : !contractAddress ? (
          "⚠️ Chaîne non supportée"
        ) : !canCheckIn ? (
          "✓ Déjà checké aujourd'hui"
        ) : (
          `🔥 Check-in sur ${chainLabel}`
        )}
      </button>

      {/* Bouton Claim (streak >= 7) */}
      {canClaim && (
        <button
          onClick={handleClaim}
          disabled={isLoading}
          className={`btn-claim ${isLoading ? "btn-loading" : ""}`}
        >
          {isClaimPending || isClaimConfirming ? (
            <span className="loading-text">
              <span className="spinner" />
              {isClaimPending ? "Confirme dans le wallet..." : "Claim en cours..."}
            </span>
          ) : (
            `🎁 Claim 10 DROP sur ${chainLabel}`
          )}
        </button>
      )}

      {/* Erreur */}
      {error && (
        <p className="error-msg">
          ❌ {(error.message ?? "Erreur inconnue").slice(0, 100)}
        </p>
      )}
    </div>
  );
}