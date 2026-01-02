"use client";

import React, { useEffect, useState, useRef } from "react";
import HeroSection from "@/components/home/HeroSection";
import AccountSnapshotStrip from "@/components/home/AccountSnapshotStrip";
import PositionsTopImpact from "@/components/home/PositionsTopImpact";
import RiskGuardrailsCard from "@/components/home/RiskGuardrailsCard";
import NextActionCard from "@/components/home/NextActionCard";
import MarketRegimeCard from "@/components/home/MarketRegimeCard";
import InteractiveWatchlist from "@/components/home/InteractiveWatchlist";
import NewsRiskEvents from "@/components/home/NewsRiskEvents";
import SystemHealthFooter from "@/components/home/SystemHealthFooter";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import AgentStatusBadge from "@/components/ui/AgentStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";
import { getRiskSeverity } from "@/lib/riskUtils";
import type { DashboardSnapshot } from "@/lib/data/dashboard";
import type { TradePlan } from "@/lib/agent/tradeSchema";

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [systemStatus, setSystemStatus] = useState<{
    systemStatus: "GREEN" | "AMBER" | "RED";
    dateDisplay: string;
    timeDisplay: string;
  } | null>(null);
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);
  const [ibkrStatus, setIbkrStatus] = useState<{

  ok?: boolean;
  bridge?: { ok?: boolean };
  authenticated?: boolean;
  gatewayAuthenticated?: boolean;
  gateway?: {
    authenticated?: boolean;
    connected?: boolean;
    status?: number;
  };
} | null>(null);


  const [agentStatus, setAgentStatus] = useState<{
    safety: {
      ibkrConnected: boolean;
      ibkrAuthenticated: boolean;
    };
    health: {
      overall: 'healthy' | 'degraded' | 'unhealthy';
    };
  } | null>(null);
  const [ibkrAuth, setIbkrAuth] = useState<"idle" | "connecting" | "authed" | "failed">("idle");
  const pollRef = useRef<number | null>(null);
  // Sticky IBKR connection flag (prevents UI flicker during hydration/polling)
  const [ibkrConnectionEstablished, setIbkrConnectionEstablished] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('ibkrConnected') === '1';
  });
  const [loading, setLoading] = useState(true);
  const [imminentHighImpact, setImminentHighImpact] = useState(false);
  const [ibkrDisconnecting, setIbkrDisconnecting] = useState(false);
  const [ibkrDisconnectError, setIbkrDisconnectError] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    async function fetchAllData() {
      try {
        const [dashboardRes, systemRes, planRes, ibkrRes, agentStatusRes] = await Promise.all([
          fetch("/api/dashboard/home").then((r) => r.json()),
          fetch("/api/system/status").then((r) => r.json()),
          fetch("/api/agent/trade-plan").then((r) => r.json()),
          fetch("/api/ibkr/status").then((r) => r.json()),
          fetch("/api/agent/status").then((r) => r.json()),
        ]);

        if (dashboardRes.ok && dashboardRes.snapshot) {
  setDashboard((prev) => ({
    ...dashboardRes.snapshot,
    account: dashboardRes.snapshot.account ?? prev?.account,
  }));
}

        if (systemRes.systemStatus) {
          setSystemStatus(systemRes);
        }

        if (planRes.ok && planRes.plan) {
          setTradePlan(planRes.plan);
        }

        // Check IBKR status - use the top-level authenticated field computed by API
        if (ibkrRes.ok) {
          const gatewayAuthenticated = ibkrRes.authenticated === true;
          
          setIbkrStatus({
            ok: ibkrRes.ok,
            bridge: { ok: ibkrRes.bridge?.ok === true ? true : undefined },
            authenticated: ibkrRes.authenticated,
            gatewayAuthenticated,
            gateway: ibkrRes.gateway,
          });
  
          
          // Update ibkrAuth state based on authentication
          if (gatewayAuthenticated) {
            setIbkrAuth("authed");
          } else {
            setIbkrAuth("idle");
          }
        }

        // Get agent status for IBKR connection and overall health
        if (agentStatusRes.ok) {
          setAgentStatus({
            safety: {
              ibkrConnected: agentStatusRes.safety?.ibkrConnected === true,
              ibkrAuthenticated: agentStatusRes.safety?.ibkrAuthenticated === true,
            },
            health: {
              overall: agentStatusRes.health?.overall || 'unhealthy',
            },
          });
        }
      } catch (err) {
        console.error("Failed to fetch home data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  // Auto-check authentication when tab becomes visible (convenience feature)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // If we're in "connecting" state and tab becomes visible, auto-check a few times
      if (document.visibilityState === 'visible' && ibkrAuth === "connecting") {
        console.log('[IBKR] 👁️ Tab visible, auto-checking auth status...');
        
        // Check 3 times with 1 second intervals (quick auto-check as convenience)
        for (let i = 0; i < 3; i++) {
          console.log(`[IBKR] Auto-check ${i + 1}/3`);
          const { authenticated, data } = await checkIbkrAuthStatus();
          if (authenticated && data) {
            console.log('[IBKR] ✅ Authentication auto-detected!');
            setIbkrStatus({
              ok: data.ok,
              bridge: { ok: data.bridge?.ok === true ? true : undefined },
              authenticated: data.authenticated,
              gatewayAuthenticated: true,
              gateway: data.gateway,
            });
  
            setIbkrAuth("authed");
            // Reload to refresh all data
            await new Promise(resolve => setTimeout(resolve, 200));
            window.location.reload();
            return;
          }
          // Wait 1 second before next check
          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        console.log('[IBKR] ⚠️ Auto-check complete - user can click "Check now" if needed');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Also check on window focus (when user clicks back to the tab)
    window.addEventListener('focus', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [ibkrAuth]);

  // Calculate open risk in R multiples
  // Assuming daily loss limit is from trade plan or default 2000
  const dailyLossLimit = tradePlan?.dailyLossLimitUsd || 2000;
  const totalUnrealizedRisk = Math.abs(
    dashboard?.account?.unrealizedPnl || 0
  );
  const openRiskR = dailyLossLimit > 0 ? totalUnrealizedRisk / dailyLossLimit : 0;
  const riskSeverity = getRiskSeverity(openRiskR);

  // Calculate daily PnL (for now use unrealized, later track realized separately)
  const dailyPnl = dashboard?.account?.unrealizedPnl || 0;

  // Get current session
  const getCurrentSession = (): "Asia" | "London" | "NY" | "Closed" => {
    const hour = new Date().getUTCHours();
    if (hour >= 0 && hour < 8) return "Asia";
    if (hour >= 8 && hour < 16) return "London";
    if (hour >= 16 && hour < 22) return "NY";
    return "Closed";
  };

  // Determine IBKR connection status - use account data availability as source of truth
  // Account data flows through Bridge session, which is the functional indicator of connectivity
  // Require BOTH accountId (non-empty string) AND at least one real finite number
  const hasAccountId =
    typeof dashboard?.account?.accountId === "string" &&
    dashboard.account.accountId.trim().length > 0;

  const hasRealNumber =
  Number.isFinite(Number(dashboard?.account?.equity)) ||
  Number.isFinite(Number(dashboard?.account?.unrealizedPnl)) ||
  Number.isFinite(Number(dashboard?.account?.buyingPower)) ||
  Number.isFinite(Number(dashboard?.account?.balance));
  // Determine IBKR connection status (sticky once true)
  // Reason: dashboard/account can briefly be undefined during hydration/polling; controls must not flicker.
  const account = dashboard?.account;

  const hasCurrentConnectionEvidence = Boolean(
    typeof account?.accountId === "string" &&
      account.accountId.trim().length > 0 &&
      (Number.isFinite(Number(account?.equity ?? 0)) ||
        Number.isFinite(Number(account?.unrealizedPnl ?? 0)) ||
        Number.isFinite(Number(account?.buyingPower ?? 0)) ||
        Number.isFinite(Number(account?.balance ?? 0)))
  );

  useEffect(() => {
    if (hasCurrentConnectionEvidence) {
      setIbkrConnectionEstablished(true);
      if (typeof window !== 'undefined') sessionStorage.setItem('ibkrConnected', '1');
    }
  }, [hasCurrentConnectionEvidence]);

  const isIbkrConnected = ibkrConnectionEstablished;

  // Determine IBKR status for account card
  const ibkrCardStatus = isIbkrConnected ? "LIVE" : "ERROR";

  // Prepare watchlist items
  const watchlistItems =
    dashboard?.marketOverview?.tiles?.map((tile) => ({
      symbol: tile.symbol,
      lastPrice: tile.value || 0,
      changePct: tile.changePct || 0,
      sparklineData: [
        (tile.value || 0) * 0.98,
        (tile.value || 0) * 0.99,
        tile.value || 0,
      ], // Mock sparkline data for now
      spread: tile.symbol.includes("USD") ? 0.25 : undefined,
      status: tile.source === "LIVE" ? ("LIVE" as const) : ("DEGRADED" as const),
    })) || [];

  // Prepare economic calendar events
  const calendarEvents =
    dashboard?.economicCalendar?.items?.slice(0, 3).map((event) => ({
      id: event.id,
      title: event.title,
      releaseTime: event.timeUtc,
      impactLevel:
        (event.importance === "HIGH"
          ? "HIGH"
          : event.importance === "MEDIUM"
          ? "MED"
          : "LOW") as "LOW" | "MED" | "HIGH",
    })) || [];

  // Get actionable bullets from trade plan
  const actionableBullets =
    tradePlan?.orders
      ?.slice(0, 3)
      .map(
        (order) =>
          `${order.side} ${order.symbol} ${order.orderType === 'LIMIT' && order.entry ? `@ ${order.entry.toFixed(2)}` : 'market'}`
      ) || [];

  async function checkIbkrAuthStatus(): Promise<{ authenticated: boolean; data?: any }> {
    try {
      const url = `/api/ibkr/status?ts=${Date.now()}`;
      console.log('[IBKR Check] Fetching:', url);
      
      const res = await fetch(url, { 
        cache: "no-store",
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!res.ok) {
        console.error('[IBKR Check] HTTP error:', res.status, res.statusText);
        return { authenticated: false };
      }
      
      const data = await res.json();
      console.log('[IBKR Check] Full response:', JSON.stringify(data, null, 2));

      // SIMPLIFIED: Just check the top-level authenticated field that the API computes
      // The API route already does the complex logic and sets authenticated: true/false
      const isAuthenticated = data?.authenticated === true;
      
      console.log('[IBKR Check] Authenticated:', isAuthenticated, '(from data.authenticated:', data?.authenticated, ')');

      return { authenticated: isAuthenticated, data };
    } catch (err) {
      console.error('[IBKR Check] Exception:', err);
      return { authenticated: false };
    }
  }

  async function pollIbkrStatus(maxMs = 120000) {
    const start = Date.now();
    let pollCount = 0;
    const pollInterval = 3000; // Poll every 3 seconds (faster)

    console.log('[IBKR Poll] Starting, will poll for', maxMs / 1000, 'seconds');

    while (Date.now() - start < maxMs) {
      pollCount++;
      const elapsed = Math.floor((Date.now() - start) / 1000);
      console.log(`[IBKR Poll] Attempt ${pollCount} (${elapsed}s elapsed)`);

      const { authenticated, data } = await checkIbkrAuthStatus();

      if (authenticated && data) {
        console.log('[IBKR Poll] ✅ Authentication detected!');
        // Update both states immediately when authentication is detected
        setIbkrStatus({
          ok: data.ok,
          bridge: { ok: data.bridge?.ok === true ? true : undefined },
          authenticated: data.authenticated,
          gatewayAuthenticated: true,
          gateway: data.gateway,
        });
        setIbkrAuth("authed");
        return { ok: true as const, data };
      } else {
        console.log(`[IBKR Poll] Not authenticated yet, waiting ${pollInterval / 1000}s...`);
      }

      // Wait before next poll
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    console.warn('[IBKR Poll] ⏱️ Timeout reached after', maxMs / 1000, 'seconds');
    return { ok: false as const, error: "Timed out waiting for broker auth" };
  }

  const handleConnectIbkr = async () => {
    console.log('[IBKR] Connect button clicked');
    
    try {
      // 1) open gateway login tab (manual login)
      const GATEWAY_URL = process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL || "https://ibkr.agentyctrader.com";
      console.log('[IBKR] Opening Gateway URL:', GATEWAY_URL);
      window.open(GATEWAY_URL, "_blank", "noopener,noreferrer");

      // 2) Set state to connecting - user will manually check when done
      console.log('[IBKR] Setting state to connecting');
      setIbkrAuth("connecting");

      // Start background polling as a convenience (but don't rely on it)
      // User should use "Check now" button or visibility auto-check
      pollIbkrStatus(120000).then((result) => {
        if (result.ok) {
          console.log('[IBKR] Background polling detected auth!');
          setIbkrStatus({
            ok: result.data?.ok,
            bridge: { ok: result.data?.bridge?.ok === true ? true : undefined },
            authenticated: result.data?.authenticated,
            gatewayAuthenticated: true,
            gateway: result.data?.gateway,
          });
          setIbkrAuth("authed");
          window.location.reload();
        }
      }).catch((err) => {
        console.error('[IBKR] Background polling error:', err);
        // Don't set to failed - let user manually check
      });
    } catch (err) {
      console.error('[IBKR] Exception in handleConnectIbkr:', err);
      setIbkrAuth("failed");
    }
  };

  const handleCheckNow = async () => {
    console.log('[IBKR] Check now button clicked');
    setIbkrAuth("connecting"); // Show connecting state while checking
    
    try {
      const { authenticated, data } = await checkIbkrAuthStatus();
      
      if (authenticated && data) {
        console.log('[IBKR] ✅ Authentication detected via Check Now!');
        setIbkrStatus({
          ok: data.ok,
          bridge: { ok: data.bridge?.ok === true ? true : undefined },
          authenticated: data.authenticated,
          gatewayAuthenticated: true,
          gateway: data.gateway,
        });
        setIbkrAuth("authed");
        // Reload to refresh all data
        await new Promise(resolve => setTimeout(resolve, 200));
        window.location.reload();
      } else {
        console.log('[IBKR] ⚠️ Not authenticated yet');
        setIbkrAuth("connecting"); // Stay in connecting state, user can try again
      }
    } catch (err) {
      console.error('[IBKR] Error in handleCheckNow:', err);
      setIbkrAuth("connecting"); // Stay in connecting state on error
    }
  };

  async function handleDisconnectIbkr() {
    if (ibkrDisconnecting) return;
    setIbkrDisconnecting(true);
    setIbkrDisconnectError(null);

    try {
      // Call logout endpoint which proxies to Bridge /logout (clears Session API cache + Gateway logout)
      const res = await fetch("/api/ibkr/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();
      
      if (!data.ok) {
        setIbkrDisconnectError("Logout failed - session not cleared");
      }
    } catch (e: any) {
      setIbkrDisconnectError(`Logout error: ${e?.message || "Unknown error"}`);
    }

    // Always clear sticky state locally; reload will re-evaluate real connection state
    setIbkrConnectionEstablished(false);
    if (typeof window !== "undefined") sessionStorage.removeItem("ibkrConnected");

    setIbkrDisconnecting(false);
    window.location.reload();
  }

  // Format date and time for hero section
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'long' });
  const time = today.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="bg-[#0A0A0A] min-h-screen flex flex-col">
      {/* Hero Section - Full visibility on load */}
      <div className="relative">
        <HeroSection dateStr={dateStr} dayStr={dayStr} time={time} />
        <div className="absolute top-4 right-6 z-10">
          <AgentStatusBadge />
        </div>
      </div>

      {/* Broker Connection Status Banner - Only shows when NOT connected */}
      {/* Use agentStatus.safety OR ibkrStatus.authenticated - NOT health.overall */}
      {!isIbkrConnected && (
        <section className="px-6 pt-4 pb-6">
          <div className="relative rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 backdrop-blur-2xl border border-amber-500/30 p-4 shadow-[0_8px_24px_rgba(245,99,0,0.2)]">
            <div className="flex items-start justify-between gap-3">
              {ibkrAuth === "connecting" ? (
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-bold text-amber-400">Waiting for broker authentication</h3>
                  <p className="text-xs text-amber-300/90 leading-relaxed">
                    Complete login in the Gateway tab (username, password, 2FA), then return here and tap "Check now".
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleCheckNow}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold rounded-lg transition-colors duration-200"
                    >
                      Check now
                    </button>
                    <button
                      onClick={() => setIbkrAuth("idle")}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white text-xs font-bold rounded-lg transition-colors duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-bold text-amber-400">Broker not connected</h3>
                    <p className="text-xs text-amber-300/90 leading-relaxed">
                      To refresh your live brokerage data, tap Connect and complete login in the Gateway window.
                    </p>
                    {ibkrAuth === "failed" && (
                      <p className="text-xs text-amber-400/80 leading-relaxed mt-1">
                        Auth not detected. Re-open the Gateway tab, complete login + 2FA, then click Connect again.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleConnectIbkr}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors duration-200 whitespace-nowrap"
                  >
                    Connect Broker
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Dashboard Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-6">
        {/* Section A: Account Snapshot Strip - Compact metrics at a glance */}
        {dashboard?.account && (
          <AccountSnapshotStrip
            metrics={[
              { 
                label: "Net Liquidity", 
                value: dashboard.account.equity || 0, 
                href: "/performance" 
              },
              { 
                label: "Day P&L", 
                value: dailyPnl, 
                href: "/performance" 
              },
              { 
                label: "Unrealized", 
                value: dashboard.account.unrealizedPnl || 0, 
                href: "/trades" 
              },
              { 
                label: "Buying Power", 
                value: dashboard.account.buyingPower || 0, 
                href: "/performance" 
              },
              { 
                label: "Margin Used", 
                value: (dashboard.account.equity || 0) - (dashboard.account.buyingPower || 0), 
                href: "/performance" 
              },
              { 
                label: "Risk", 
                value: `${openRiskR.toFixed(1)}R`, 
                href: "/performance" 
              },
            ]}
          />
        )}

        {/* Section B: Positions That Matter - Top 5 by impact */}
        <PositionsTopImpact
          positions={
            dashboard?.positions?.map((pos) => ({
              symbol: pos.symbol,
              quantity: pos.quantity,
              unrealizedPnl: pos.unrealizedPnl,
              percentMove: pos.avgPrice > 0 
                ? ((pos.marketPrice - pos.avgPrice) / pos.avgPrice) * 100 
                : 0,
              marketPrice: pos.marketPrice,
              avgPrice: pos.avgPrice,
            })) || []
          }
        />

        {/* Section C: Risk Guardrails - Safety at a glance */}
        <RiskGuardrailsCard
          dailyPnl={dailyPnl}
          dailyLimit={dailyLossLimit}
          openRiskR={openRiskR}
        />

      {/* Section D: Market Regime - Compact summary */}
      <div>
        <h2 className="text-[#9EA6AE] text-[13px] uppercase tracking-[0.08em] mb-2 px-6">
          Market Regime
        </h2>
        <div className="px-6">
        <MarketRegimeCard
          trendRegime="RANGE" // TODO: Derive from market data
          volatilityState="ATR 45th" // TODO: Calculate from ATR
          session={getCurrentSession()}
          summary="Stability. Low volatility. Best setups: pullbacks to support."
          fmpStatus="LIVE"
          derivedStatus="OK"
          agentHint={<AgentHintTag text="conditions assessed" />}
        />
        </div>
      </div>

      {/* Section E: Next Action - Single primary CTA */}
      <NextActionCard
        action={actionableBullets?.[0]}
        riskSeverity={riskSeverity}
        imminentHighImpact={imminentHighImpact}
        onViewPlan={() => window.location.href = "/agent"}
      />

      {/* Section F: Secondary Content - Collapsible */}
      {watchlistItems.length > 0 && (
        <CollapsibleSection title="Watchlist" defaultCollapsed={true}>
          <InteractiveWatchlist items={watchlistItems} />
        </CollapsibleSection>
      )}

      {calendarEvents.length > 0 && (
        <CollapsibleSection title="Upcoming Risk Events" defaultCollapsed={true}>
          <NewsRiskEvents 
            events={calendarEvents} 
            status="LIVE"
            onImminentHighImpact={setImminentHighImpact}
          />
        </CollapsibleSection>
      )}
      </section>

      {/* Disconnect IBKR Button - Only show when connected */}
      {isIbkrConnected && (
        <div className="fixed bottom-14 left-0 right-0 px-6 pb-2 flex flex-col items-center gap-1">
          <button
            onClick={handleDisconnectIbkr}
            disabled={ibkrDisconnecting}
            className="px-3 py-1 rounded-md text-xs border border-[#2B2F36] text-[#E6EDF3] hover:bg-[#14181F] disabled:opacity-50"
          >
            {ibkrDisconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
          {ibkrDisconnectError && (
            <div className="text-xs text-[#FF6B6B]">{ibkrDisconnectError}</div>
          )}
        </div>
      )}

      {/* System Health Footer */}
      <SystemHealthFooter
        items={[
          {
            label: "BROKER",
            // Use ibkrStatus only (agentStatus.safety is placeholder)
            status: isIbkrConnected ? "LIVE" : "ERROR",
          },
          {
            label: "SYSTEM",
            // Overall health is separate from IBKR connection
            status: agentStatus?.health?.overall === 'healthy' ? "LIVE" :
                    agentStatus?.health?.overall === 'degraded' ? "DEGRADED" : "ERROR",
          },
          {
            label: "MARKET FEED",
            status: "LIVE",
          },
          {
            label: "AGENT",
            status: tradePlan ? "LIVE" : "IDLE",
          },
        ]}
      />
    </main>
  );
}

