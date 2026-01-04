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
  const [ibkrAuth, setIbkrAuth] = useState<"idle" | "connecting" | "connected" | "disconnecting">("idle");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldPollRef = useRef<boolean>(false);
  // Sticky IBKR connection flag (prevents UI flicker during hydration/polling)
  const [ibkrConnectionEstablished, setIbkrConnectionEstablished] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('ibkrConnected') === '1';
  });
  const [loading, setLoading] = useState(true);
  const [imminentHighImpact, setImminentHighImpact] = useState(false);
  const [ibkrDisconnecting, setIbkrDisconnecting] = useState(false);
  const [ibkrDisconnectError, setIbkrDisconnectError] = useState<string | null>(null);

  // Initialize state from sessionStorage on mount and fetch dashboard if connected
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasIntent = sessionStorage.getItem('ibkrIntent') === '1';
      const wasConnected = sessionStorage.getItem('ibkrConnected') === '1';
      
      if (wasConnected && hasIntent) {
        // Restore connected state if intent flag exists
        setIbkrConnectionEstablished(true);
        setIbkrAuth("connected");
        // Fetch dashboard with intent (IBKR data)
        fetchDashboardWithIntent();
      }
    }
  }, []);

  // Fetch NON-IBKR data only (NO IBKR calls on load to prevent 2FA spam)
  useEffect(() => {
    async function fetchNonIbkrData() {
      try {
        const [systemRes, planRes, agentStatusRes] = await Promise.all([
          fetch("/api/system/status").then((r) => r.json()),
          fetch("/api/agent/trade-plan").then((r) => r.json()),
          fetch("/api/agent/status").then((r) => r.json()),
        ]);

        if (systemRes.systemStatus) {
          setSystemStatus(systemRes);
        }

        if (planRes.ok && planRes.plan) {
          setTradePlan(planRes.plan);
        }

        // Get agent status for overall health (NOT IBKR connection - that's gated by intent)
        if (agentStatusRes.ok) {
          setAgentStatus({
            safety: {
              ibkrConnected: false, // Don't use agent status for IBKR connection
              ibkrAuthenticated: false,
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

    fetchNonIbkrData();

    // Cleanup: stop any polling on unmount
    return () => {
      shouldPollRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Fetch dashboard/home WITH intent ONLY after authenticated
  async function fetchDashboardWithIntent() {
    try {
      const dashboardRes = await fetch("/api/dashboard/home?intent=1").then((r) => r.json());
      if (dashboardRes.ok && dashboardRes.snapshot) {
        setDashboard((prev) => ({
          ...dashboardRes.snapshot,
          account: dashboardRes.snapshot.account ?? prev?.account,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch dashboard with intent:", err);
    }
  }

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
  // Determine IBKR connection status - ONLY based on auth state + intent, NOT dashboard data
  // DO NOT infer connection from dashboard.account on load (prevents 2FA spam)
  const isIbkrConnected = ibkrAuth === "connected" && ibkrConnectionEstablished;

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
      // REQUIRED: Include intent=1 to prevent backend from skipping the call
      const url = `/api/ibkr/status?intent=1&ts=${Date.now()}`;
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

      // Check if skipped (no intent)
      if (data?.skipped === true) {
        console.log('[IBKR Check] Skipped - no intent flag');
        return { authenticated: false };
      }

      // Check the top-level authenticated field
      const isAuthenticated = data?.authenticated === true;
      
      console.log('[IBKR Check] Authenticated:', isAuthenticated, '(from data.authenticated:', data?.authenticated, ')');

      return { authenticated: isAuthenticated, data };
    } catch (err) {
      console.error('[IBKR Check] Exception:', err);
      return { authenticated: false };
    }
  }

  async function startPollingIbkrStatus(maxMs = 60000) {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    shouldPollRef.current = true;
    const start = Date.now();
    let pollCount = 0;
    const pollInterval = 5000; // Poll every 5 seconds

    console.log('[IBKR Poll] Starting, will poll for', maxMs / 1000, 'seconds');

    const poll = async () => {
      // Stop if we should no longer poll
      if (!shouldPollRef.current) {
        console.log('[IBKR Poll] Stopped - shouldPollRef set to false');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        return;
      }

      // Stop if timeout reached
      if (Date.now() - start >= maxMs) {
        console.warn('[IBKR Poll] ⏱️ Timeout reached after', maxMs / 1000, 'seconds');
        shouldPollRef.current = false;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        // Clear intent and connection flags to prevent stuck state
        setIbkrConnectionEstablished(false);
        setIbkrAuth("idle");
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('ibkrIntent');
          sessionStorage.removeItem('ibkrConnected');
        }
        return;
      }

      pollCount++;
      const elapsed = Math.floor((Date.now() - start) / 1000);
      console.log(`[IBKR Poll] Attempt ${pollCount} (${elapsed}s elapsed)`);

      const { authenticated, data } = await checkIbkrAuthStatus();

      if (authenticated && data) {
        console.log('[IBKR Poll] ✅ Authentication detected!');
        // Stop polling
        shouldPollRef.current = false;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        // Update states
        setIbkrStatus({
          ok: data.ok,
          bridge: { ok: data.bridge?.ok === true ? true : undefined },
          authenticated: data.authenticated,
          gatewayAuthenticated: true,
          gateway: data.gateway,
        });
        setIbkrAuth("connected");
        setIbkrConnectionEstablished(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ibkrConnected', '1');
          sessionStorage.setItem('ibkrIntent', '1'); // Keep intent flag
        }
        // Reload to refresh all data (dashboard will be fetched on mount if connected)
        window.location.reload();
      } else {
        console.log(`[IBKR Poll] Not authenticated yet, will check again in ${pollInterval / 1000}s...`);
      }
    };

    // Start polling immediately
    poll();
    // Then poll at intervals
    pollIntervalRef.current = setInterval(poll, pollInterval);
  }

  const handleConnectIbkr = async () => {
    console.log('[IBKR] Connect button clicked');
    
    try {
      // 1) Set intent flag FIRST (enables IBKR backend calls)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ibkrIntent', '1');
      }

      // 2) Set state to connecting
      console.log('[IBKR] Setting state to connecting');
      setIbkrAuth("connecting");

      // 3) Open gateway login tab (manual login)
      const GATEWAY_URL = process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL || "https://ibkr.agentyctrader.com";
      console.log('[IBKR] Opening Gateway URL:', GATEWAY_URL);
      window.open(GATEWAY_URL, "_blank", "noopener,noreferrer");

      // 4) Start polling with intent flag (will stop automatically when connected or timeout)
      startPollingIbkrStatus(60000); // Poll for max 60 seconds
    } catch (err) {
      console.error('[IBKR] Exception in handleConnectIbkr:', err);
      setIbkrAuth("idle");
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ibkrIntent');
      }
    }
  };

  const handleCheckNow = async () => {
    console.log('[IBKR] Check now button clicked');
    
    try {
      const { authenticated, data } = await checkIbkrAuthStatus();
      
      if (authenticated && data) {
        console.log('[IBKR] ✅ Authentication detected via Check Now!');
        // Stop polling if running
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        // Update states
        setIbkrStatus({
          ok: data.ok,
          bridge: { ok: data.bridge?.ok === true ? true : undefined },
          authenticated: data.authenticated,
          gatewayAuthenticated: true,
          gateway: data.gateway,
        });
        setIbkrAuth("connected");
        setIbkrConnectionEstablished(true);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ibkrConnected', '1');
          sessionStorage.setItem('ibkrIntent', '1'); // Keep intent flag
        }
        // Fetch dashboard with intent (IBKR data)
        await fetchDashboardWithIntent();
        // Reload to refresh all data
        await new Promise(resolve => setTimeout(resolve, 200));
        window.location.reload();
      } else {
        console.log('[IBKR] ⚠️ Not authenticated yet - stay in connecting state');
        // Stay in connecting state, user can try again
      }
    } catch (err) {
      console.error('[IBKR] Error in handleCheckNow:', err);
      // Stay in connecting state on error
    }
  };

  async function handleDisconnectIbkr() {
    if (ibkrDisconnecting || ibkrAuth === "disconnecting") return;
    
    // Stop any polling immediately
    shouldPollRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    setIbkrDisconnecting(true);
    setIbkrDisconnectError(null);
    setIbkrAuth("disconnecting");

    try {
      // Call logout endpoint WITH intent flag (enables backend call)
      const res = await fetch("/api/ibkr/logout?intent=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await res.json();
      
      if (!data.ok || data.skipped) {
        setIbkrDisconnectError("Logout failed - session not cleared");
      }
    } catch (e: any) {
      setIbkrDisconnectError(`Logout error: ${e?.message || "Unknown error"}`);
    }

    // Always clear sticky state and intent flag locally
    setIbkrConnectionEstablished(false);
    setIbkrAuth("idle");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("ibkrConnected");
      sessionStorage.removeItem("ibkrIntent"); // Clear intent flag
    }

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
                      onClick={() => {
                        shouldPollRef.current = false;
                        if (pollIntervalRef.current) {
                          clearInterval(pollIntervalRef.current);
                          pollIntervalRef.current = null;
                        }
                        setIbkrConnectionEstablished(false);
                        setIbkrAuth("idle");
                        // Clear intent flag on cancel to prevent stuck state
                        if (typeof window !== 'undefined') {
                          sessionStorage.removeItem('ibkrIntent');
                          sessionStorage.removeItem('ibkrConnected');
                        }
                      }}
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

