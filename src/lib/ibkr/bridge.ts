// src/lib/ibkr/bridge.ts

import { cache } from "react";

// Lazy getters for environment variables - only checked when functions are called, not at module load time
function getBridgeUrl(): string {
  const url = process.env.IBKR_BRIDGE_URL;
  if (!url) {
    throw new Error("Missing IBKR_BRIDGE_URL in environment");
  }
  return url;
}

function getBridgeKey(): string {
  const key = process.env.IBKR_BRIDGE_KEY;
  if (!key) {
    throw new Error("Missing IBKR_BRIDGE_KEY in environment");
  }
  return key;
}

/**
 * Reusable fetch wrapper for all IBKR Bridge calls
 */
export async function ibkr(path: string, params?: Record<string, any>) {
  const bridgeUrl = getBridgeUrl();
  const bridgeKey = getBridgeKey();
  const url = new URL(`${bridgeUrl}${path}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.append(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      "X-Bridge-Key": bridgeKey,
    },
    next: { revalidate: 1 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IBKR Bridge error: ${res.status} ${text}`);
  }

  return res.json();
}

/**
 * Health check — verifies bridge connection
 */
export const getBridgeHealth = cache(() => ibkr("/health"));

/**
 * Account overview (cash, equity, margin, balances)
 */
export const getAccountOverview = cache(() => ibkr("/account"));

/**
 * Portfolio positions
 */
export const getPositions = cache(() => ibkr("/positions"));

/**
 * Live market snapshot (bid/ask/last, volume, etc.)
 */
export const getMarketData = cache((symbol: string) =>
  ibkr("/market", { symbol })
);

