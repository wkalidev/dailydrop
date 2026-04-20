"use client";

import { useChainId } from "wagmi";
import { useState } from "react";
import { CONTRACT_ADDRESSES } from "../lib/contract";

export function AddTokenButton() {
  const chainId = useChainId();
  const contractAddress = CONTRACT_ADDRESSES[chainId];
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAddToken = async () => {
    if (!window.ethereum || !contractAddress) return;
    setLoading(true);
    try {
      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: contractAddress,
            symbol: "DROP",
            decimals: 18,
            image: "https://dailydrop-five.vercel.app/icon-512.svg",
          },
        },
      });
      if (wasAdded) setAdded(true);
    } catch (err) {
      console.error("Failed to add token:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!contractAddress) return null;

  return (
    <button
      onClick={handleAddToken}
      disabled={added || loading}
      className="btn-add-token"
    >
      {loading ? (
        <span className="loading-text">
          <span className="spinner" />
          Adding...
        </span>
      ) : added ? (
        "✅ DROP added to wallet"
      ) : (
        <>
          <span style={{ fontSize: "14px" }}>🪙</span>
          Add DROP to wallet
        </>
      )}
    </button>
  );
}