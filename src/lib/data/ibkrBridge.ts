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
  
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Key': bridgeKey,
        ...(init.headers || {}),
      },
      // Bridge is off-origin, always server-side calls
      cache: 'no-store',
    });
  } catch (fetchError: any) {
    const errorMessage = fetchError?.message || 'Unknown fetch error';
    const errorCode = fetchError?.code || 'NO_CODE';
    throw new Error(
      `IBKR Bridge connection failed: ${errorMessage} (code: ${errorCode}). URL: ${bridgeUrl}${path}. Hint: Check if the bridge service is running and firewall allows connections from Vercel IPs.`
    );
  }

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

// IMPORTANT: use POST with JSON body, not GET with ?symbol=
export async function getIbkrPrice(symbol: string) {
  return callBridge<{ ok: boolean; symbol: string; price: number }>(
    '/price',
    {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    }
  );
}

// Account overview / summary
export type IbkrOverviewSnapshot = {
  equity: number;
  cash: number;
  margin_available: number;
  maintenance_margin: number;
  pnl_day: number;
  pnl_unrealized: number;
  pnl_realized: number;
  currency: string;
};

export async function getIbkrOverview(): Promise<IbkrOverviewSnapshot> {
  return callBridge<IbkrOverviewSnapshot>(
    '/account/summary',
    { method: 'GET' }
  );
}

export type BridgeAccount = {
  ok: boolean;
  accountId: string;
  balance: number;
  equity: number;
  unrealizedPnl: number;
  buyingPower: number;
};

export type BridgePositions = {
  ok: boolean;
  positions: Array<{
    symbol: string;
    quantity: number;
    avgPrice: number;
    marketPrice: number;
    unrealizedPnl: number;
  }>;
};

export type BridgeOrders = {
  ok: boolean;
  orders: Array<{
    id?: string;
    symbol?: string;
    side?: string;
    quantity?: number;
    status?: string;
  }>;
};

// ✅ FIXED: these must match the FastAPI routes in app.py EXACTLY

export async function getIbkrAccount() {
  return callBridge<BridgeAccount>("/account", {
    method: "GET",
  });
}

export async function getIbkrPositions() {
  return callBridge<BridgePositions>("/positions", {
    method: "GET",
  });
}

export async function getIbkrOrders() {
  return callBridge<BridgeOrders>("/orders", {
    method: "GET",
  });
}

// Place order
export type PlaceOrderRequest = {
  symbol: string;
  side: string;
  type: string;
  qty: number;
  limit_price?: number | null;
  stop_price?: number | null;
  time_in_force?: string;
};

export type PlaceOrderResponse = {
  ok: boolean;
  order_id: string;
  status: string;
  symbol: string;
  side: string;
  type: string;
  qty: number;
  limit_price?: number | null;
  stop_price?: number | null;
  time_in_force?: string | null;
  submitted_at: string;
};

export async function placeIbkrOrder(req: PlaceOrderRequest): Promise<PlaceOrderResponse> {
  return callBridge<PlaceOrderResponse>(
    '/orders/place',
    {
      method: 'POST',
      body: JSON.stringify(req),
    }
  );
}

// Cancel order
export type CancelOrderRequest = {
  order_id: string;
};

export type CancelOrderResponse = {
  ok: boolean;
  order_id: string;
  status: string;
};

export async function cancelIbkrOrder(orderId: string): Promise<CancelOrderResponse> {
  return callBridge<CancelOrderResponse>(
    '/orders/cancel',
    {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId }),
    }
  );
}

