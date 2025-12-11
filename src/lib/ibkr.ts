// Simplified IBKR Bridge client
// Single source of truth: IBKR Bridge

const BRIDGE_URL = process.env.IBKR_BRIDGE_URL ?? "http://127.0.0.1:8000";
const BRIDGE_KEY = process.env.IBKR_BRIDGE_KEY ?? "";

export async function ibkrRequest(path: string, options: any = {}) {
  const url = `${BRIDGE_URL}${path}`;

  const reqOptions: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Key": BRIDGE_KEY,
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  };

  try {
    const res = await fetch(url, reqOptions);

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `IBKR Bridge error: HTTP ${res.status}`,
      };
    }

    const data = await res.json().catch(() => null);
    return { ok: true, status: res.status, data };
  } catch (err: any) {
    return {
      ok: false,
      error: `IBKR Bridge unreachable: ${err.message}`,
    };
  }
}

