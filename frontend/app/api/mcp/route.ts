import { NextRequest, NextResponse } from "next/server";

const APP_URL = "https://dailydrop-five.vercel.app";

const TOOLS = [
  {
    name: "verify_streak",
    description: "Verify if a wallet has a minimum on-chain daily streak (Proof of Presence). Returns pass/fail, current streak, and badge level.",
    inputSchema: {
      type: "object",
      properties: {
        address:   { type: "string",  description: "EVM wallet address (0x...)" },
        minStreak: { type: "integer", description: "Minimum streak required (default: 7)", default: 7 },
      },
      required: ["address"],
    },
  },
  {
    name: "get_profile",
    description: "Full DailyDrop profile for a wallet: streaks on Celo and Base, badge tier, check-in history.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "EVM wallet address (0x...)" },
      },
      required: ["address"],
    },
  },
  {
    name: "verify_batch",
    description: "Verify up to 100 wallets at once for airdrop filtering. Returns pass/fail per address.",
    inputSchema: {
      type: "object",
      properties: {
        addresses: { type: "array",   items: { type: "string" }, description: "List of EVM wallet addresses (max 100)" },
        minStreak: { type: "integer", description: "Minimum streak required (default: 7)", default: 7 },
      },
      required: ["addresses"],
    },
  },
  {
    name: "get_stats",
    description: "Live global check-in stats across Celo and Base: total check-ins, unique wallets, per-chain breakdown.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET() {
  return NextResponse.json(
    {
      name:        "DailyDrop Shield MCP Server",
      version:     "1.0.0",
      protocol:    "MCP 2024-11-05",
      description: "Proof of Presence API — verify real humans by on-chain daily streak on Celo and Base.",
      url:         APP_URL,
      tools:       TOOLS.map(({ name, description }) => ({ name, description })),
      contracts: {
        celo: "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b",
        base: "0x974fB504172f2aABbecc698Ebf137202a5E4e495",
      },
      status: "ok",
    },
    { headers: { ...CORS, "Cache-Control": "public, max-age=300" } }
  );
}

const rateLimit = new Map<string, { count: number; reset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.reset) {
    rateLimit.set(ip, { count: 1, reset: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: CORS });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const { method, id, params } = body ?? {};

  if (method === "ping") {
    return NextResponse.json({ jsonrpc: "2.0", id, result: { status: "ok" } }, { headers: CORS });
  }

  if (method === "initialize") {
    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities:    { tools: { listChanged: false } },
        serverInfo:      { name: "DailyDrop Shield MCP Server", version: "1.0.0" },
      },
    }, { headers: CORS });
  }

  if (method === "tools/list") {
    return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } }, { headers: CORS });
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const args     = params?.arguments ?? {};

    if (toolName === "verify_streak") {
      const { address, minStreak = 7 } = args;
      if (!address || !isValidAddress(address)) {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "Invalid address" }) }] },
        }, { headers: CORS });
      }
      try {
        const url = `${APP_URL}/api/verify?address=${encodeURIComponent(address)}&minStreak=${minStreak}`;
        const res  = await fetch(url);
        const data = await res.json();
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify(data) }] },
        }, { headers: CORS });
      } catch {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "Internal server error" }) }] },
        }, { headers: CORS });
      }
    }

    if (toolName === "get_profile") {
      const { address } = args;
      if (!address || !isValidAddress(address)) {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "Invalid address" }) }] },
        }, { headers: CORS });
      }
      try {
        const url = `${APP_URL}/api/verify?address=${encodeURIComponent(address)}&minStreak=1`;
        const res  = await fetch(url);
        const data = await res.json();
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify(data) }] },
        }, { headers: CORS });
      } catch {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "Internal server error" }) }] },
        }, { headers: CORS });
      }
    }

    if (toolName === "verify_batch") {
      const { addresses, minStreak = 7 } = args;
      if (!Array.isArray(addresses) || addresses.length === 0) {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "addresses must be a non-empty array" }) }] },
        }, { headers: CORS });
      }
      if (addresses.length > 100) {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "Maximum 100 addresses per batch" }) }] },
        }, { headers: CORS });
      }
      const invalid = addresses.filter((a: string) => !isValidAddress(a));
      if (invalid.length > 0) {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: `Invalid addresses: ${invalid.join(", ")}` }) }] },
        }, { headers: CORS });
      }
      try {
        const results = await Promise.allSettled(
          addresses.map(async (addr: string) => {
            const res  = await fetch(`${APP_URL}/api/verify?address=${encodeURIComponent(addr)}&minStreak=${minStreak}`);
            const data = await res.json();
            return { address: addr, passed: data.passed ?? false, streak: data.streak?.current ?? 0 };
          })
        );
        const batch = results.map((r, i) =>
          r.status === "fulfilled" ? r.value : { address: addresses[i], passed: false, streak: 0, error: true }
        );
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ minStreak, total: batch.length, passed: batch.filter((r) => r.passed).length, results: batch }) }] },
        }, { headers: CORS });
      } catch {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "Internal server error" }) }] },
        }, { headers: CORS });
      }
    }

    if (toolName === "get_stats") {
      try {
        const res  = await fetch(`${APP_URL}/api/stats`);
        const data = await res.json();
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify(data) }] },
        }, { headers: CORS });
      } catch {
        return NextResponse.json({
          jsonrpc: "2.0", id,
          result: { content: [{ type: "text", text: JSON.stringify({ error: "Internal server error" }) }] },
        }, { headers: CORS });
      }
    }

    return NextResponse.json({
      jsonrpc: "2.0", id,
      error: { code: -32601, message: `Unknown tool: ${toolName}` },
    }, { status: 404, headers: CORS });
  }

  return NextResponse.json({
    jsonrpc: "2.0", id,
    error: { code: -32601, message: `Unknown method: ${method}` },
  }, { status: 404, headers: CORS });
}
