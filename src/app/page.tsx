"use client";

import React, { useEffect, useState } from "react";
import HeroSection from "@/components/home/HeroSection";
import AccountRiskCard from "@/components/home/AccountRiskCard";
import PositionsSnapshot from "@/components/home/PositionsSnapshot";
import MarketRegimeCard from "@/components/home/MarketRegimeCard";
import InteractiveWatchlist from "@/components/home/InteractiveWatchlist";
import NewsRiskEvents from "@/components/home/NewsRiskEvents";
import AgentTradePlanCard from "@/components/home/AgentTradePlanCard";
import SystemHealthFooter from "@/components/home/SystemHealthFooter";
import AgentHintTag from "@/components/ui/AgentHintTag";
import AgentStatusBadge from "@/components/ui/AgentStatusBadge";
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
    bridgeOk: boolean;
    gatewayAuthenticated: boolean;
  } | null>(null);
  const [ibkrCheckStatus, setIbkrCheckStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [ibkrMessage, setIbkrMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imminentHighImpact, setImminentHighImpact] = useState(false);

  // Fetch all data
  useEffect(() => {
    async function fetchAllData() {
      try {
        const [dashboardRes, systemRes, planRes, ibkrRes] = await Promise.all([
          fetch("/api/dashboard/home").then((r) => r.json()),
          fetch("/api/system/status").then((r) => r.json()),
          fetch("/api/agent/trade-plan").then((r) => r.json()),
          fetch("/api/ibkr/status").then((r) => r.json()),
        ]);

        if (dashboardRes.ok && dashboardRes.snapshot) {
          setDashboard(dashboardRes.snapshot);
        }

        if (systemRes.systemStatus) {
          setSystemStatus(systemRes);
        }

        if (planRes.ok && planRes.plan) {
          setTradePlan(planRes.plan);
        }

        if (ibkrRes.ok) {
          // Gateway health endpoint doesn't require auth, so gateway.ok means it's running
          const gatewayOk = ibkrRes.gateway?.ok === true;
          const bridgeOk = ibkrRes.bridge?.ok === true;
          
          setIbkrStatus({
            bridgeOk,
            gatewayAuthenticated: gatewayOk,
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

  // Determine IBKR status
  const ibkrCardStatus =
    ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated
      ? "LIVE"
      : ibkrStatus?.bridgeOk || ibkrStatus?.gatewayAuthenticated
      ? "DEGRADED"
      : "ERROR";

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

  // Handle IBKR connection check (replaces external redirect)
  async function handleConnectIbkr(e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    
    setIbkrCheckStatus("checking");
    setIbkrMessage("Checking IBKR gateway connection...");
    
    try {
      const res = await fetch('/api/ibkr/status');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      
      // Debug: log the response
      console.log('IBKR Status Response:', data);
      
      const gatewayOk = data?.gateway?.ok === true;
      const bridgeOk = data?.bridge?.ok === true;
      
      // Update main status always
      setIbkrStatus({
        bridgeOk: bridgeOk || false,
        gatewayAuthenticated: gatewayOk || false,
      });
      
      // Set check status and message based on gateway status
      if (gatewayOk) {
        setIbkrCheckStatus("ok");
        setIbkrMessage("✓ IBKR gateway is connected and running");
        // Don't auto-reset - keep showing success status
      } else {
        setIbkrCheckStatus("error");
        const errorMsg = data?.gateway?.error || data?.error || 'Gateway is not reachable';
        setIbkrMessage(`✗ ${errorMsg}`);
      }
    } catch (err: any) {
      console.error('IBKR status check error:', err);
      setIbkrCheckStatus("error");
      setIbkrMessage(`✗ Error checking IBKR connection: ${err?.message || 'Network error'}`);
    }
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

      {/* IBKR Connection Status Banner - Always visible, even during loading */}
      <div className="px-6 pt-6">
        <div className={`relative rounded-2xl backdrop-blur-2xl border p-4 shadow-[0_8px_24px_rgba(245,99,0,0.2)] z-10 ${
          ibkrCheckStatus === "ok" 
            ? "bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30"
            : ibkrCheckStatus === "checking"
            ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/30"
            : "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/30"
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <h3 className={`text-sm font-bold ${
                ibkrCheckStatus === "ok" ? "text-green-400" :
                ibkrCheckStatus === "checking" ? "text-blue-400" :
                "text-amber-400"
              }`}>
                {ibkrCheckStatus === "ok" ? "IBKR connected" :
                 ibkrCheckStatus === "checking" ? "Checking IBKR..." :
                 "IBKR not connected"}
              </h3>
              <p className={`text-xs leading-relaxed ${
                ibkrCheckStatus === "ok" ? "text-green-300/90" :
                ibkrCheckStatus === "checking" ? "text-blue-300/90" :
                "text-amber-300/90"
              }`}>
                {ibkrMessage || 
                 (ibkrStatus && (!ibkrStatus.bridgeOk || !ibkrStatus.gatewayAuthenticated)
                   ? "Click the button to check IBKR gateway connection status."
                   : "To refresh your live brokerage data, check the connection status.")}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleConnectIbkr(e);
              }}
              disabled={ibkrCheckStatus === "checking"}
              style={{ minWidth: '140px', minHeight: '40px' }}
              className={`px-6 py-2.5 text-white text-sm font-bold rounded-lg transition-colors duration-200 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                ibkrCheckStatus === "ok"
                  ? "bg-green-500 hover:bg-green-600 active:bg-green-700"
                  : ibkrCheckStatus === "checking"
                  ? "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                  : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700"
              }`}
            >
              {ibkrCheckStatus === "checking" ? "Checking..." :
               ibkrCheckStatus === "ok" ? "Connected" :
               ibkrCheckStatus === "error" ? "Retry Connection" :
               "Check IBKR Status"}
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-9">
        {/* Section 2: Account & Risk */}
        <div>
          <h2 className="text-[#9EA6AE] text-[15px] uppercase tracking-[0.08em] mb-2">
            Today's Account & Risk
          </h2>
          {dashboard?.account && (
          <AccountRiskCard
            netLiquidity={dashboard.account.equity}
            buyingPower={dashboard.account.buyingPower}
            dailyPnl={dailyPnl}
            openRiskR={openRiskR}
            positionsCount={dashboard.positions?.length || 0}
            status={ibkrCardStatus}
          />
        )}
      </div>

      {/* Section 3: Positions Snapshot */}
      <div>
        <h2 className="text-[#9EA6AE] text-[15px] uppercase tracking-[0.08em] mb-2">
          Open Positions
        </h2>
        <PositionsSnapshot
          positions={
            dashboard?.positions?.map((pos) => ({
              symbol: pos.symbol,
              unrealizedPnl: pos.unrealizedPnl,
              quantity: pos.quantity,
              correlationAlert: false, // TODO: Calculate correlations
            })) || []
          }
          status={ibkrCardStatus}
          agentHint={<AgentHintTag text="correlation watch" />}
        />
      </div>

      {/* Section 4: Market Regime Context */}
      <div>
        <h2 className="text-[#9EA6AE] text-[15px] uppercase tracking-[0.08em] mb-2">
          Market Regime (Agency View)
        </h2>
        <MarketRegimeCard
          trendRegime="RANGE" // TODO: Derive from market data
          volatilityState="ATR 45th percentile" // TODO: Calculate from ATR
          session={getCurrentSession()}
          summary="Stability. Low volatility. Best setups: pullbacks to support."
          fmpStatus="LIVE"
          derivedStatus="OK"
          agentHint={<AgentHintTag text="conditions assessed" />}
        />
      </div>

      {/* Section 5: Interactive Watchlist */}
      <div>
        <h2 className="text-[#9EA6AE] text-[15px] uppercase tracking-[0.08em] mb-2">
          Watchlist
        </h2>
        {watchlistItems.length > 0 && (
          <InteractiveWatchlist items={watchlistItems} />
        )}
      </div>

      {/* Section 6: News & Risk Events */}
      <div>
        <h2 className="text-[#9EA6AE] text-[15px] uppercase tracking-[0.08em] mb-2">
          Upcoming Risk Events
        </h2>
        {calendarEvents.length > 0 && (
          <NewsRiskEvents 
            events={calendarEvents} 
            status="LIVE"
            onImminentHighImpact={setImminentHighImpact}
          />
        )}
      </div>

      {/* Section 7: Agency Trade Plan */}
      <div>
        <h2 className="text-[#9EA6AE] text-[15px] uppercase tracking-[0.08em] mb-2">
          Trade Plan
        </h2>
        <AgentTradePlanCard
          defaultSymbol="SPX"
          hasPlan={!!tradePlan && (tradePlan.orders?.length || 0) > 0}
          actionableBullets={actionableBullets}
          status={tradePlan ? "LIVE" : "IDLE"}
          riskSeverity={riskSeverity}
          imminentHighImpact={imminentHighImpact}
          onGeneratePlan={async () => {
            const res = await fetch("/api/agent/trade-plan", { method: "POST" });
            if (res.ok) {
              const data = await res.json();
              if (data.ok && data.plan) {
                setTradePlan(data.plan);
              }
            }
          }}
        />
      </div>
      </section>

      {/* System Health Footer */}
      <SystemHealthFooter
        items={[
          {
            label: "IBKR",
            status: ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated
              ? "LIVE"
              : ibkrStatus?.bridgeOk || ibkrStatus?.gatewayAuthenticated
              ? "DEGRADED"
              : "ERROR",
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

