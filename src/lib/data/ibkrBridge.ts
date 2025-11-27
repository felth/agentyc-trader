// src/lib/data/ibkrBridge.ts

export async function getBridgeHealth() {
  const url = process.env.IBKR_BRIDGE_URL;
  const key = process.env.IBKR_BRIDGE_KEY;

  if (!url || !key) {
    throw new Error("IBKR bridge env vars missing");
  }

  const res = await fetch(`${url}/health`, {
    headers: {
      "X-Bridge-Key": key,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Bridge error ${res.status}: ${text}`);
  }

  return res.json();
}

