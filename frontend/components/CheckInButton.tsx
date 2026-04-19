"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { DAILYDROP_ABI, CONTRACT_ADDRESSES } from "../lib/contract";

interface CheckInButtonProps {
  canCheckIn: boolean;
  canClaim: boolean;
  onSuccess: () => void;
}

export function CheckInButton({ canCheckIn, canClaim, onSuccess }: CheckInButtonProps) {
  const chainId = useChainId();
  const contractAddress = CONTRACT_ADDRESSES[chainId];

  const {
    writeContract: writeCheckIn,
    data: checkInHash,
    isPending: isCheckInPending,
    error: checkInError,
  } = useWriteContract();

  const {
    writeContract: writeClaim,
    data: claimHash,
    isPending: isClaimPending,
    error: claimError,
  } = useWriteContract();

  const { isLoading: isCheckInConfirming, isSuccess: isCheckInSuccess } =
    useWaitForTransactionReceipt({ hash: checkInHash });

  const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } =
    useWaitForTransactionReceipt({ hash: claimHash });

  const [showSuccess, setShowSuccess] = useState(false);

  const handleCheckIn = async () => {
    try {
      writeCheckIn({
        address: contractAddress,
        abi: DAILYDROP_ABI,
        functionName: "checkIn",
      });
    } catch (err) {
      console.error("Check-in failed:", err);
    }
  };

  const handleClaim = async () => {
    try {
      writeClaim({
        address: contractAddress,
        abi: DAILYDROP_ABI,
        functionName: "claimReward",
      });
    } catch (err) {
      console.error("Claim failed:", err);
    }
  };

  if (isCheckInSuccess || isClaimSuccess) {
    setTimeout(() => {
      onSuccess();
    }, 2000);
  }

  const isLoading = isCheckInPending || isCheckInConfirming || isClaimPending || isClaimConfirming;
  const error = checkInError || claimError;

  if (isCheckInSuccess) {
    return (
      <div className="btn-success animate-pulse-once">
        ✅ Checked in! Streak updated on-chain.
      </div>
    );
  }

  if (isClaimSuccess) {
    return (
      <div className="btn-success animate-pulse-once">
        🎁 10 DROP claimed! New streak starting.
      </div>
    );
  }

  return (
    <div className="btn-group">
      {/* Bouton Check-in */}
      <button
        onClick={handleCheckIn}
        disabled={!canCheckIn || isLoading}
        className={`btn-checkin ${!canCheckIn ? "btn-disabled" : ""} ${isLoading ? "btn-loading" : ""}`}
      >
        {isCheckInPending || isCheckInConfirming ? (
          <span className="loading-text">
            <span className="spinner" />
            {isCheckInPending ? "Confirm in wallet..." : "Confirming on-chain..."}
          </span>
        ) : !canCheckIn ? (
          "✓ Already checked in today"
        ) : (
          "🔥 Check-in Today"
        )}
      </button>

      {/* Bouton Claim (uniquement si streak >= 7) */}
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
            "🎁 Claim 10 DROP"
          )}
        </button>
      )}

      {/* Erreur */}
      {error && (
        <p className="error-msg">
          ❌ {error.message.slice(0, 80)}...
        </p>
      )}
    </div>
  );
}
