import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, celoAlfajores, baseSepolia } from "wagmi/chains";
import { defineChain } from "viem";

const celoMainnet = defineChain({
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        "https://forno.celo.org",
        "https://rpc.ankr.com/celo",
        "https://celo.drpc.org",
      ],
    },
  },
  blockExplorers: {
    default: { name: "Celoscan", url: "https://celoscan.io" },
  },
});

export const config = getDefaultConfig({
  appName: "DailyDrop",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
  chains: [celoMainnet, base, celoAlfajores, baseSepolia],
  ssr: true,
});