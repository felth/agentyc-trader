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
  const [ibkrCheckStatus, setIbkrCheckStatus] = useState<
    "idle" | "checking" | "ok" | "error"
  >("idle");
  const [ibkrStatus, setIbkrStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
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
          fetch(`/api/ibkr/status?t=${Date.now()}`).then((r) => r.json()),
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

        // Check both bridge health AND gateway authentication
        const bridgeOk = ibkrRes.bridge?.ok === true;
        const gatewayAuthenticated = ibkrRes.gateway?.authenticated === true;
        
        // Debug logging (remove in production)
        console.log("IBKR Status Check:", {
          bridgeOk,
          gatewayAuthenticated,
          gatewayStatus: ibkrRes.gateway,
          fullResponse: ibkrRes,
        });
        
        if (bridgeOk && gatewayAuthenticated) {
          setIbkrStatus({
            ok: true,
            message: "IBKR connected and authenticated.",
          });
          setIbkrCheckStatus("ok");
        } else if (bridgeOk) {
          // Bridge is up but Gateway not authenticated
          setIbkrStatus({
            ok: false,
            message: "Bridge online. Click Connect to authenticate with Gateway.",
          });
          setIbkrCheckStatus("error");
        } else {
          setIbkrStatus({
            ok: false,
            message:
              ibkrRes.bridge?.error ||
              "IBKR bridge is not reachable. Check the droplet or bridge service.",
          });
          setIbkrCheckStatus("error");
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

  // Determine IBKR status for account card (simplified: bridge ok = LIVE)
  const ibkrCardStatus = ibkrStatus?.ok ? "LIVE" : "ERROR";

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

  // Handle IBKR connection - opens Gateway in new tab for manual login + 2FA
  const handleConnectIbkr = () => {
    const GATEWAY_URL = process.env.NEXT_PUBLIC_IBKR_GATEWAY_URL ?? "https://ibkr.agentyctrader.com";
    window.open(GATEWAY_URL, '_blank', 'noopener,noreferrer');
    
    // Poll status after opening the Gateway page
    setIbkrCheckStatus("checking");
    setTimeout(() => {
      let pollCount = 0;
      const maxPolls = 12; // Poll for 1 minute (12 * 5s = 60s)
      const pollInterval = setInterval(async () => {
        pollCount++;
        const res = await fetch(`/api/ibkr/status?t=${Date.now()}`).catch(() => null);
        if (res) {
          const data = await res.json().catch(() => null);
          if (data?.ok) {
            const bridgeOk = data.bridge?.ok === true;
            const gatewayAuthenticated = data.gateway?.authenticated === true;
            
            if (bridgeOk && gatewayAuthenticated) {
              setIbkrCheckStatus("ok");
              setIbkrStatus({
                ok: true,
                message: "IBKR connected and authenticated.",
              });
              clearInterval(pollInterval);
              // Refresh dashboard data
              window.location.reload();
              return;
            } else if (bridgeOk) {
              setIbkrCheckStatus("checking");
              setIbkrStatus({
                ok: false,
                message: "Waiting for authentication... Complete login in the opened window.",
              });
            }
          }
        }
        // Stop polling after max attempts
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          if (ibkrCheckStatus === "checking") {
            setIbkrCheckStatus("error");
            setIbkrStatus({
              ok: false,
              message: "Connection timeout. Please try again.",
            });
          }
        }
      }, 5000);
    }, 3000);
  };

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

      {/* IBKR Connection Status Card - Always visible */}
      <section className="px-6 pt-4 pb-6">
        <div
          className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 text-sm ${
            ibkrCheckStatus === "ok"
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
              : ibkrCheckStatus === "error"
              ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
              : "bg-white/5 border-white/10 text-white/70"
          }`}
        >
          <div className="flex flex-col">
            <span className="font-semibold tracking-tight">
              IBKR Connection
            </span>
            <span className="text-xs opacity-80">
              {ibkrStatus
                ? ibkrStatus.message
                : "Click Connect to open Gateway login in a new window. Complete login with 2FA."}
            </span>
          </div>

          <button
            onClick={handleConnectIbkr}
            disabled={ibkrCheckStatus === "checking"}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold bg-ultra-accent text-black hover:bg-ultra-accentHover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {ibkrCheckStatus === "checking"
              ? "Connecting..."
              : ibkrCheckStatus === "ok"
              ? "Connected"
              : "Connect IBKR"}
          </button>
        </div>
      </section>

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
            status: ibkrStatus?.ok ? "LIVE" : "ERROR",
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

