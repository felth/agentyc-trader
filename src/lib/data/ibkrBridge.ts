// src/lib/data/ibkrBridge.ts

// Thin client for talking to the IBKR Bridge on your droplet

// Lazy getters for environment variables - only checked when functions are called, not at module load time
function getBridgeUrl(): string {
  const url = process.env.IBKR_BRIDGE_URL;
  if (!url) {
    throw new Error('IBKR_BRIDGE_URL is not set');
  }
  return url;
}

function getBridgeKey(): string {
  const key = process.env.IBKR_BRIDGE_KEY;
  if (!key) {
    throw new Error('IBKR_BRIDGE_KEY is not set');
  }
  return key;
}

async function callBridge<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const bridgeUrl = getBridgeUrl();
  const bridgeKey = getBridgeKey();
  const url = `${bridgeUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Bridge-Key': bridgeKey,
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

