import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — DailyDrop",
};

export default function Privacy() {
  return (
    <main className="app-container" style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <header className="app-header" style={{ marginBottom: 24 }}>
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <span className="logo-text">DailyDrop</span>
        </Link>
      </header>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Privacy Policy</h1>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
        Last updated: June 2026
      </p>

      <section style={{ lineHeight: 1.7, fontSize: 14, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 16 }}>
        <p>
          DailyDrop is a decentralized application. We are committed to being transparent about what data, if any, we process.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Data we do not collect</h2>
        <p>
          We do not collect names, email addresses, or any personally identifiable information. We do not use tracking cookies or analytics beyond basic server logs.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>On-chain data</h2>
        <p>
          All check-in activity is recorded on public blockchains (Celo and Base). Your wallet address and transaction history are publicly visible on-chain. We do not control or store this data — it is inherent to how blockchains work.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>API usage</h2>
        <p>
          Our backend APIs (leaderboard, stats, verify) read publicly available on-chain data via Celoscan and Basescan APIs. No private data is processed. Your wallet address may appear in leaderboard data derived from public blockchain events.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Third-party services</h2>
        <p>
          This app integrates with WalletConnect (for non-MiniPay wallet connections), Farcaster, and block explorer APIs (Celoscan, Basescan). Their respective privacy policies apply to any data they process.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Contact</h2>
        <p>
          For privacy-related questions, open a ticket on{" "}
          <a href="https://github.com/wkalidev/dailydrop/issues" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            GitHub
          </a>.
        </p>
      </section>

      <div style={{ marginTop: 32, textAlign: "center" }}>
        <Link href="/" style={{ color: "var(--accent)", fontSize: 14, textDecoration: "none" }}>
          ← Back to app
        </Link>
      </div>
    </main>
  );
}
