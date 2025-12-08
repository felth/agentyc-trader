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

  return (
    <main className="bg-black text-white min-h-screen flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 pb-32 flex-1">
        <div className="max-w-6xl mx-auto space-y-6 pt-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">Trades</h1>
            <AgentStatusBadge />
          </div>

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
      </div>
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
