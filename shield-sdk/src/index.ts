import { createPublicClient, http, type PublicClient } from "viem";
import { celo, base } from "viem/chains";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VerifyResult {
  address: string;
  passed: boolean;
  minStreak: number;
  streak: {
    current: number;
    bestChain: "celo" | "base";
    celo: number;
    base: number;
  };
  checkins: {
    total: number;
    canCheckIn: boolean;
    canClaim: boolean;
    nextCheckIn: number;
  };
  badges: {
    level: 0 | 1 | 2 | 3;
    label: string;
    weekly: boolean;
    monthly: boolean;
    century: boolean;
  };
  shield: string;
  meta: {
    verifiedAt: string;
    celoscan: string;
    basescan: string;
  };
  error?: string;
}

export interface ShieldOptions {
  apiUrl?: string;
  onChain?: boolean;
  celoRpc?: string;
  baseRpc?: string;
  timeout?: number; // ms, default 10000
}

// ─── Constants ────────────────────────────────────────────────────────────────

// These addresses are immutable and correspond to the mainnet deployment
const DEFAULT_API_URL      = "https://dailydrop-five.vercel.app";
const CELO_DAILYDROP       = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b" as `0x${string}`;
const BASE_DAILYDROP       = "0x974fB504172f2aABbecc698Ebf137202a5E4e495" as `0x${string}`;
const SHIELD_ADDRESS       = "0x24eFf9bdE979D6dccC869178F353D663bC8A6983" as `0x${string}`;
const STREAK_MASTER_ADDRESS = "0x038F496eCf99ecA5959A40493C96670Ea8a14345" as `0x${string}`;
const STREAK_NFT_ADDRESS    = "0xbBa5865b3E3A5033730f851d555cc922B74B25Fa" as `0x${string}`;

const DAILYDROP_ABI = [
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserData",
    outputs: [
      { internalType: "uint256", name: "streak",        type: "uint256" },
      { internalType: "uint256", name: "lastCheckIn",   type: "uint256" },
      { internalType: "uint256", name: "totalCheckIns", type: "uint256" },
      { internalType: "bool",    name: "canCheckIn",    type: "bool"    },
      { internalType: "bool",    name: "canClaim",      type: "bool"    },
      { internalType: "uint256", name: "nextCheckIn",   type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ─── Main Class ───────────────────────────────────────────────────────────────

export class DailyDropShield {
  private apiUrl: string;
  private onChain: boolean;
  private timeout: number;
  private celoClient: PublicClient | null = null;
  private baseClient: PublicClient | null = null;

  constructor(options: ShieldOptions = {}) {
    this.apiUrl  = options.apiUrl  ?? DEFAULT_API_URL;
    this.onChain = options.onChain ?? false;
    this.timeout = options.timeout ?? 10000;

    if (this.onChain) {
      this.celoClient = createPublicClient({
        chain: celo,
        transport: http(options.celoRpc ?? "https://forno.celo.org"),
      }) as unknown as PublicClient;

      this.baseClient = createPublicClient({
        chain: base,
        transport: http(options.baseRpc ?? "https://mainnet.base.org"),
      }) as unknown as PublicClient;
    }
  }

  // ─── Address validation ──────────────────────────────────────────────────────

  private _validateAddress(address: string): void {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`DailyDropShield: invalid Ethereum address "${address}"`);
    }
    if (address === "0x0000000000000000000000000000000000000000") {
      throw new Error("DailyDropShield: zero address not allowed");
    }
  }

  // ─── Fetch with retry ────────────────────────────────────────────────────────

  private async _fetchWithRetry(url: string, retries = 1): Promise<Response> {
    try {
      return await globalThis.fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (err) {
      if (retries > 0) return this._fetchWithRetry(url, retries - 1);
      throw err;
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Verify if an address has the required streak.
   * @example
   * const shield = new DailyDropShield()
   * const result = await shield.verify("0xABC...", 7)
   * if (result.passed) console.log("✅ Real human!")
   */
  async verify(address: string, minStreak = 7): Promise<VerifyResult> {
    this._validateAddress(address);
    if (this.onChain) return this._verifyOnChain(address, minStreak);
    return this._verifyApi(address, minStreak);
  }

  /** Alias for verify(address, 1) — returns full profile data */
  async getProfile(address: string): Promise<VerifyResult> {
    return this.verify(address, 1);
  }

  /** Quick boolean check */
  async isHuman(address: string, minStreak = 7): Promise<boolean> {
    const result = await this.verify(address, minStreak);
    return result.passed;
  }

  /** Get badge level: 0=none 1=weekly 2=monthly 3=century */
  async getBadge(address: string): Promise<0 | 1 | 2 | 3> {
    const result = await this.verify(address, 1);
    return result.badges.level;
  }

  /** Get current streak */
  async getStreak(address: string): Promise<number> {
    const result = await this.verify(address, 1);
    return result.streak.current;
  }

  /**
   * Verify multiple addresses in parallel — useful for airdrop filtering.
   * Limited to 100 addresses per call.
   */
  async verifyBatch(
    addresses: string[],
    minStreak = 7
  ): Promise<Record<string, VerifyResult>> {
    if (addresses.length > 100) {
      throw new Error("DailyDropShield: verifyBatch limited to 100 addresses");
    }
    const results = await Promise.allSettled(
      addresses.map((addr) => this.verify(addr, minStreak))
    );
    return Object.fromEntries(
      addresses.map((addr, i) => [
        addr,
        results[i].status === "fulfilled"
          ? results[i].value
          : {
              address: addr,
              passed: false,
              error: (results[i] as PromiseRejectedResult).reason?.message,
            } as VerifyResult,
      ])
    );
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async _verifyApi(address: string, minStreak: number): Promise<VerifyResult> {
    const url = `${this.apiUrl}/api/verify?address=${address}&minStreak=${minStreak}`;
    const res = await this._fetchWithRetry(url);
    if (!res.ok) throw new Error(`DailyDropShield API error: ${res.status}`);
    const json = await res.json();
    if (!json || typeof json.passed !== "boolean") {
      throw new Error("DailyDropShield: invalid API response shape");
    }
    return json as VerifyResult;
  }

  private async _verifyOnChain(address: string, minStreak: number): Promise<VerifyResult> {
    if (!this.celoClient || !this.baseClient) {
      throw new Error("On-chain mode requires clients");
    }

    const userAddress = address as `0x${string}`;

    const [celoResult, baseResult] = await Promise.allSettled([
      (this.celoClient as unknown as { readContract: (args: unknown) => Promise<unknown> }).readContract({
        address: CELO_DAILYDROP,
        abi: DAILYDROP_ABI,
        functionName: "getUserData",
        args: [userAddress],
      }),
      (this.baseClient as unknown as { readContract: (args: unknown) => Promise<unknown> }).readContract({
        address: BASE_DAILYDROP,
        abi: DAILYDROP_ABI,
        functionName: "getUserData",
        args: [userAddress],
      }),
    ]);

    const celoData = celoResult.status === "fulfilled" ? (celoResult.value as readonly [bigint, bigint, bigint, boolean, boolean, bigint]) : null;
    const baseData = baseResult.status === "fulfilled" ? (baseResult.value as readonly [bigint, bigint, bigint, boolean, boolean, bigint]) : null;

    const celoStreak = celoData ? Number(celoData[0]) : 0;
    const baseStreak = baseData ? Number(baseData[0]) : 0;
    const maxStreak  = Math.max(celoStreak, baseStreak);
    const bestChain  = celoStreak >= baseStreak ? "celo" : "base";

    const badge7   = maxStreak >= 7;
    const badge30  = maxStreak >= 30;
    const badge100 = maxStreak >= 100;
    const badgeLevel: 0 | 1 | 2 | 3 = badge100 ? 3 : badge30 ? 2 : badge7 ? 1 : 0;
    const badgeLabels = ["none", "🥉 Weekly", "🥈 Monthly", "🏆 Century"];

    return {
      address,
      passed: maxStreak >= minStreak,
      minStreak,
      streak: { current: maxStreak, bestChain: bestChain as "celo" | "base", celo: celoStreak, base: baseStreak },
      checkins: {
        total:       (celoData ? Number(celoData[2]) : 0) + (baseData ? Number(baseData[2]) : 0),
        canCheckIn:  celoData ? Boolean(celoData[3]) : false,
        canClaim:    celoData ? Boolean(celoData[4]) : false,
        nextCheckIn: celoData ? Number(celoData[5]) : 0,
      },
      badges: { level: badgeLevel, label: badgeLabels[badgeLevel], weekly: badge7, monthly: badge30, century: badge100 },
      shield: SHIELD_ADDRESS,
      meta: {
        verifiedAt: new Date().toISOString(),
        celoscan:   `https://celoscan.io/address/${address}`,
        basescan:   `https://basescan.org/address/${address}`,
      },
    };
  }
}

export { SHIELD_ADDRESS, CELO_DAILYDROP, BASE_DAILYDROP, STREAK_MASTER_ADDRESS, STREAK_NFT_ADDRESS };
export default DailyDropShield;
