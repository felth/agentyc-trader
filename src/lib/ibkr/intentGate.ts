// Intent gating helper - ensures IBKR endpoints are only called with explicit user intent
// This prevents 2FA spam from automatic polling/refreshes

export function checkIntent(req: Request): boolean {
  // Check query param ?intent=1
  const url = new URL(req.url);
  const queryIntent = url.searchParams.get("intent") === "1";
  
  // Check header x-ibkr-intent: 1
  const headerIntent = req.headers.get("x-ibkr-intent") === "1";
  
  return queryIntent || headerIntent;
}

export function getSkippedResponse() {
  return {
    ok: true,
    skipped: true,
    reason: "no user intent",
    authenticated: false,
  };
}

