import { createPublicClient, http, PublicClient } from "viem";
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
}

export interface ShieldOptions {
  apiUrl?: string;
  onChain?: boolean;
  celoRpc?: string;
  baseRpc?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_API_URL = "https://dailydrop-five.vercel.app";
const CELO_DAILYDROP  = "0xd8Cc2a639a8D4e7A75a5B41C28606712e4fDf70b" as `0x${string}`;
const BASE_DAILYDROP  = "0x974fB504172f2aABbecc698Ebf137202a5E4e495" as `0x${string}`;
const SHIELD_ADDRESS  = "0x24eFf9bdE979D6dccC869178F353D663bC8A6983" as `0x${string}`;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private celoClient: PublicClient | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private baseClient: PublicClient | null = null;

  constructor(options: ShieldOptions = {}) {
    this.apiUrl  = options.apiUrl  ?? DEFAULT_API_URL;
    this.onChain = options.onChain ?? false;

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

  /**
   * Verify if an address has the required streak.
   * @example
   * const shield = new DailyDropShield()
   * const result = await shield.verify("0xABC...", 7)
   * if (result.passed) console.log("✅ Real human!")
   */
  async verify(address: string, minStreak = 7): Promise<VerifyResult> {
    if (this.onChain) return this._verifyOnChain(address, minStreak);
    return this._verifyApi(address, minStreak);
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

  // ─── Private ─────────────────────────────────────────────────────────────────

  private async _verifyApi(address: string, minStreak: number): Promise<VerifyResult> {
    const url = `${this.apiUrl}/api/verify?address=${address}&minStreak=${minStreak}`;
    // Use global fetch (Node 18+ / browser)
    const res = await globalThis.fetch(url);
    if (!res.ok) throw new Error(`DailyDropShield API error: ${res.status}`);
    return res.json() as Promise<VerifyResult>;
  }

  private async _verifyOnChain(address: string, minStreak: number): Promise<VerifyResult> {
    if (!this.celoClient || !this.baseClient) {
      throw new Error("On-chain mode requires clients");
    }

    const userAddress = address as `0x${string}`;

    const [celoResult, baseResult] = await Promise.allSettled([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.celoClient as any).readContract({
        address: CELO_DAILYDROP,
        abi: DAILYDROP_ABI,
        functionName: "getUserData",
        args: [userAddress],
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.baseClient as any).readContract({
        address: BASE_DAILYDROP,
        abi: DAILYDROP_ABI,
        functionName: "getUserData",
        args: [userAddress],
      }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const celoData = celoResult.status === "fulfilled" ? (celoResult.value as any) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseData = baseResult.status === "fulfilled" ? (baseResult.value as any) : null;

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

export { SHIELD_ADDRESS, CELO_DAILYDROP, BASE_DAILYDROP };
export default DailyDropShield;