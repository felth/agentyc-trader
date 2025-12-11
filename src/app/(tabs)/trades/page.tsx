"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OpenPositionsTable from "@/components/trades/OpenPositionsTable";
import OrdersPlaceholder from "@/components/trades/OrdersPlaceholder";
import HistoryPlaceholder from "@/components/trades/HistoryPlaceholder";
import AgentStatusBadge from "@/components/ui/AgentStatusBadge";
import type { DashboardSnapshot } from "@/lib/data/dashboard";

type TradeExecution = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  value: number;
  realizedPnl?: number;
  time: string;
};

function TradesContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"open" | "orders" | "history">(
    (searchParams.get("tab") as "open" | "orders" | "history") || "open"
  );
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [trades, setTrades] = useState<TradeExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState(30);
  const [ibkrStatus, setIbkrStatus] = useState<"LIVE" | "DEGRADED" | "ERROR">("ERROR");

  useEffect(() => {
    async function fetchData() {
      try {
        const [dashboardRes, tradesRes, statusRes] = await Promise.all([
          fetch("/api/dashboard/home").then((r) => r.json()),
          fetch("/api/ibkr/trades").then((r) => r.json()),
          fetch("/api/ibkr/status").then((r) => r.json()),
        ]);

        if (dashboardRes.ok && dashboardRes.snapshot) {
          setDashboard(dashboardRes.snapshot);
        }

        if (tradesRes.ok && Array.isArray(tradesRes.trades)) {
          setTrades(tradesRes.trades);
        }

            if (statusRes.ok) {
              const bridgeOk = statusRes.bridge?.ok === true;
              // Use IBeam status if available, fall back to gateway for backward compatibility
              const ibeamStatus = statusRes.ibeam || statusRes.gateway;
              const gatewayOk = ibeamStatus?.ok === true &&
                ibeamStatus?.status?.authenticated === true &&
                ibeamStatus?.status?.connected === true &&
                ibeamStatus?.status?.running === true;
              setIbkrStatus(
                bridgeOk && gatewayOk ? "LIVE" : bridgeOk || gatewayOk ? "DEGRADED" : "ERROR"
              );
            }
      } catch (err) {
        console.error("Failed to fetch trades data:", err);
        setIbkrStatus("ERROR");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const positions = dashboard?.positions || [];
  const netLiquidity = dashboard?.account?.equity || 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading trades data...</p>
          </div>
        </div>
      </main>
    );
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="bg-[#0A0A0A] min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-12">
        <div className="relative min-h-[50vh] md:min-h-[60vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-journal.jpeg')" }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="relative h-full flex flex-col px-6 py-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white/90 tracking-tight">AGENTYC</span>
              </div>
              <div className="flex items-center gap-3 relative">
                <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <span className="text-sm">🔍</span>
                </button>
                <AgentStatusBadge />
              </div>
            </div>

            {/* Content */}
            <div className="mt-auto">
              <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent mb-2">Trades</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">Positions & Orders</h1>
              <p className="text-sm text-white/70">{dayStr} · {dateStr}</p>
              <p className="text-xs text-white/60 mt-1">{time}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-9 max-w-6xl mx-auto w-full">
        <div className="space-y-6">

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10">
            <button
              onClick={() => setActiveTab("open")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "open"
                  ? "text-white border-b-2 border-orange-500"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Open Positions
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "orders"
                  ? "text-white border-b-2 border-orange-500"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "text-white border-b-2 border-orange-500"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              History
            </button>
          </div>

          {/* Open Positions Tab */}
          {activeTab === "open" && (
            <OpenPositionsTable
              positions={positions}
              netLiquidity={netLiquidity}
              status={ibkrStatus}
            />
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && <OrdersPlaceholder />}

          {/* Trade History Tab */}
          {activeTab === "history" && <HistoryPlaceholder />}
        </div>
      </section>
    </main>
  );
}

export default function TradesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-black text-white">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-sm text-white/50">Loading trades data...</p>
            </div>
          </div>
        </main>
      }
    >
      <TradesContent />
    </Suspense>
  );
}
