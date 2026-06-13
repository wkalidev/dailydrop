"use client";

import { useEffect } from "react";
import { useConnect } from "wagmi";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

export function FarcasterAutoConnect() {
  const { connect } = useConnect();

  useEffect(() => {
    const init = async () => {
      try {
        const { sdk } = await import("@farcaster/frame-sdk");
        const context = await sdk.context;
        if (context?.client?.clientFid) {
          // Inside a Farcaster frame — connect wallet via the official connector
          connect({ connector: farcasterMiniApp() });
        }
        // Signal to Farcaster that the app is ready (removes the loading splash)
        await sdk.actions.ready();
      } catch {
        // Not in Farcaster context — silently ignore
      }
    };
    init();
  }, [connect]);

  return null;
}
