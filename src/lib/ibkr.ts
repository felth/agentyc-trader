// Simplified IBKR Bridge client
// Single source of truth: IBKR Bridge
// NO direct calls to Gateway (127.0.0.1:5000) - all traffic goes through Bridge

const BRIDGE_URL = process.env.IBKR_BRIDGE_URL ?? "http://127.0.0.1:8000";
const BRIDGE_KEY = process.env.IBKR_BRIDGE_KEY;

if (!BRIDGE_KEY) {
  // This is a server-side env misconfiguration; safe to throw, API route will catch.
  throw new Error("IBKR_BRIDGE_KEY is not set in environment");
}

export async function ibkrRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // Normalize URL: remove trailing slash from BRIDGE_URL, ensure path starts with /
  const baseUrl = BRIDGE_URL.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${normalizedPath}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Bridge-Key": BRIDGE_KEY,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `IBKR bridge error ${res.status}: ${text || res.statusText}`
    );
  }

  // Bridge always returns JSON
  return (await res.json()) as T;
}

