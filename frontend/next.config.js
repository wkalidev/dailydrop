/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@rainbow-me/rainbowkit", "wagmi", "viem"],
  },
  async headers() {
    return [
      {
        source: "/.well-known/farcaster.json",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/.well-known/agent-card.json", destination: "/api/agent-card" },
    ];
  },
};

module.exports = nextConfig;