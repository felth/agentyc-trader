// src/lib/data/ibkrBridge.ts

// Thin client for talking to the IBKR Bridge on your droplet
const BRIDGE_URL = process.env.IBKR_BRIDGE_URL;
const BRIDGE_KEY = process.env.IBKR_BRIDGE_KEY;

if (!BRIDGE_URL || !BRIDGE_KEY) {
  throw new Error('IBKR_BRIDGE_URL or IBKR_BRIDGE_KEY is not set');
}

async function callBridge<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${BRIDGE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Bridge-Key': BRIDGE_KEY!,
      ...(init.headers || {}),
    },
    // Bridge is off-origin, always server-side calls
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `IBKR Bridge error ${res.status} ${res.statusText}: ${text}`
    );
  }

  return (await res.json()) as T;
}

// ---------- Public helpers ----------

export async function getIbkrHealth() {
  return callBridge<{ ok: boolean; service: string; status: string }>(
    '/health',
    { method: 'GET' }
  );
}

export async function getIbkrPrice(symbol: string) {
  return callBridge<{
    symbol: string;
    last: number;
    bid: number | null;
    ask: number | null;
    timestamp: string;
  }>(
    `/price?symbol=${encodeURIComponent(symbol)}`,
    { method: 'GET' }
  );
}

