import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { celo, base, celoAlfajores, baseSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "DailyDrop",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [celo, base, celoAlfajores, baseSepolia],
  ssr: true,
});
