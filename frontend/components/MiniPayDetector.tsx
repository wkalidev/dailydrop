"use client";

import { useEffect, useState } from "react";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function useMiniPay() {
  const [isMiniPay, setIsMiniPay] = useState(false);
  const { connect } = useConnect();

  useEffect(() => {
    const checkMiniPay = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        const miniPay = (window.ethereum as { isMiniPay?: boolean }).isMiniPay;
        if (miniPay) {
          setIsMiniPay(true);
          // Auto-connect si MiniPay détecté
          try {
            connect({ connector: injected() });
          } catch (err) {
            console.error("MiniPay auto-connect failed:", err);
          }
        }
      }
    };
    checkMiniPay();
  }, [connect]);

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
