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

  // Fetch all data (NO IBKR STATUS POLLING - only dashboard/account data)
  useEffect(() => {
    async function fetchAllData() {
      try {
        const [dashboardRes, systemRes, planRes, agentStatusRes] = await Promise.all([
          fetch("/api/dashboard/home").then((r) => r.json()),
          fetch("/api/system/status").then((r) => r.json()),
          fetch("/api/agent/trade-plan").then((r) => r.json()),
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

    // Cleanup: stop any polling on unmount
    return () => {
      shouldPollRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

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

  // Initialize connection state from sessionStorage if available, then sync with account data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ibkrConnected') === '1';
      if (stored && !ibkrConnectionEstablished) {
        setIbkrConnectionEstablished(true);
        setIbkrAuth("connected");
      }
    }
  }, []);

  useEffect(() => {
    if (hasCurrentConnectionEvidence) {
      setIbkrConnectionEstablished(true);
      setIbkrAuth("connected");
      if (typeof window !== 'undefined') sessionStorage.setItem('ibkrConnected', '1');
      // Stop polling if we're connected
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [hasCurrentConnectionEvidence]);

  const isIbkrConnected = ibkrConnectionEstablished && ibkrAuth === "connected";

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
        setIbkrAuth("idle");
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
        if (typeof window !== 'undefined') sessionStorage.setItem('ibkrConnected', '1');
        // Reload to refresh all data
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
      // 1) Set state to connecting FIRST
      console.log('[IBKR] Setting state to connecting');
      setIbkrAuth("connecting");

      // 2) Open gateway login tab (manual login)
      const GATEWAY_URL = process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL || "https://ibkr.agentyctrader.com";
      console.log('[IBKR] Opening Gateway URL:', GATEWAY_URL);
      window.open(GATEWAY_URL, "_blank", "noopener,noreferrer");

      // 3) Start polling (will stop automatically when connected or timeout)
      startPollingIbkrStatus(60000); // Poll for max 60 seconds
    } catch (err) {
      console.error('[IBKR] Exception in handleConnectIbkr:', err);
      setIbkrAuth("idle");
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
        if (typeof window !== 'undefined') sessionStorage.setItem('ibkrConnected', '1');
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
    setIbkrAuth("idle");
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
                      onClick={() => {
                        shouldPollRef.current = false;
                        if (pollIntervalRef.current) {
                          clearInterval(pollIntervalRef.current);
                          pollIntervalRef.current = null;
                        }
                        setIbkrAuth("idle");
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

