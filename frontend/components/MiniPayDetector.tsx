"use client";

import { useEffect, useState } from "react";
import { useConnect, useChainId, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";

const CELO_CHAIN_ID = 42220;

export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const { connect } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const miniPay = (window.ethereum as { isMiniPay?: boolean }).isMiniPay;
      if (miniPay) {
        setIsMiniPay(true);
        connect({ connector: injected() });
      }
    }
  }, [connect]);

  // Force Celo network — MiniPay runs exclusively on Celo
  useEffect(() => {
    if (isMiniPay && chainId !== CELO_CHAIN_ID) {
      switchChain({ chainId: CELO_CHAIN_ID });
    }
  }, [isMiniPay, chainId, switchChain]);

  return { isMiniPay };
}

export function MiniPayBadge() {
  const { isMiniPay } = useMiniPay();
  if (!isMiniPay) return null;

  return (
    <div className="minipay-badge">
      ✅ MiniPay
    </div>
  );
}
