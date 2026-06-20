import Link from "next/link";

export const metadata = {
  title: "Terms of Use — DailyDrop",
};

export default function Terms() {
  return (
    <main className="app-container" style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px" }}>
      <header className="app-header" style={{ marginBottom: 24 }}>
        <Link href="/" className="logo" style={{ textDecoration: "none" }}>
          <span className="logo-text">DailyDrop</span>
        </Link>
      </header>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Terms of Use</h1>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>
        Last updated: June 2026
      </p>

      <section style={{ lineHeight: 1.7, fontSize: 14, color: "var(--text-dim)", display: "flex", flexDirection: "column", gap: 16 }}>
        <p>
          DailyDrop is a decentralized application (dApp) that runs on the Celo and Base blockchains. By using this app, you agree to these terms.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Use at your own risk</h2>
        <p>
          DailyDrop is provided as-is, without warranties of any kind. Smart contracts are immutable once deployed; always verify transactions before signing. The app has not been formally audited by a third party.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>No financial advice</h2>
        <p>
          DROP tokens earned through DailyDrop have no guaranteed monetary value. Nothing in this app constitutes financial, investment, or legal advice.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Eligibility</h2>
        <p>
          You must comply with the laws of your jurisdiction to use this app. You are solely responsible for your on-chain transactions and their consequences.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Availability</h2>
        <p>
          We may modify, suspend, or discontinue the app at any time without notice. On-chain data and smart contracts remain accessible regardless of the frontend status.
        </p>

        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>Contact</h2>
        <p>
          Questions or issues? Open a ticket on{" "}
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
