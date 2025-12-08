"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AgentycHero from "@/components/agent/AgentycHero";
import AgencyChatPanel from "@/components/agent/AgencyChatPanel";
import AccountSnapshotMini from "@/components/agent/AccountSnapshotMini";
import PositionsMiniList from "@/components/agent/PositionsMiniList";
import TodayCalendarMini from "@/components/agent/TodayCalendarMini";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import { getRiskSeverity } from "@/lib/riskUtils";
import type { DashboardSnapshot } from "@/lib/data/dashboard";

function AgentContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "chat";
  const ticker = searchParams.get("ticker") || "";

  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [ibkrStatus, setIbkrStatus] = useState<{
    bridgeOk: boolean;
    gatewayAuthenticated: boolean;
  } | null>(null);
  const [journalCount, setJournalCount] = useState<number>(0);
  const [playbookCount, setPlaybookCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContext() {
      try {
        const [dashboardRes, ibkrRes, journalRes, libraryRes] = await Promise.all([
          fetch("/api/dashboard/home").then((r) => r.json()),
          fetch("/api/ibkr/status").then((r) => r.json()),
          fetch("/api/journal/entries").then((r) => r.json()).catch(() => ({ ok: false, entries: [] })),
          fetch("/api/library").then((r) => r.json()).catch(() => ({ ok: false, documents: [] })),
        ]);

        if (dashboardRes.ok && dashboardRes.snapshot) {
          setDashboard(dashboardRes.snapshot);
        }

            if (ibkrRes.ok) {
              // Use IBeam status if available, fall back to gateway for backward compatibility
              const ibeamStatus = ibkrRes.ibeam || ibkrRes.gateway;
              const isAuthenticated = ibeamStatus?.ok === true &&
                ibeamStatus?.status?.authenticated === true &&
                ibeamStatus?.status?.connected === true &&
                ibeamStatus?.status?.running === true;
              
              setIbkrStatus({
                bridgeOk: ibkrRes.bridge?.ok === true,
                gatewayAuthenticated: isAuthenticated,
              });
            }

        if (journalRes.ok && Array.isArray(journalRes.entries)) {
          setJournalCount(journalRes.entries.length);
        }

        if (libraryRes.ok && Array.isArray(libraryRes.documents)) {
          // Count playbook documents (for now, all documents are counted)
          // TODO: Filter by actual index metadata when available
          setPlaybookCount(libraryRes.documents.length);
        }
      } catch (err) {
        console.error("Failed to fetch agent context:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchContext();
  }, [view, ticker]);

  if (loading) {
    return (
      <main className="bg-[#0A0A0A] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/50">Loading agency context...</p>
        </div>
      </main>
    );
  }

  // Calculate IBKR status
  const ibkrStatusDisplay: "LIVE" | "DEGRADED" | "DOWN" =
    ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated
      ? "LIVE"
      : ibkrStatus?.bridgeOk || ibkrStatus?.gatewayAuthenticated
      ? "DEGRADED"
      : "DOWN";

  // Calculate data status
  const dataStatus: "LIVE" | "STALE" = dashboard ? "LIVE" : "STALE";

  // Calculate open risk in R multiples
  const dailyLossLimit = 2000;
  const openRiskR =
    dashboard?.account?.unrealizedPnl && dailyLossLimit > 0
      ? Math.abs(dashboard.account.unrealizedPnl) / dailyLossLimit
      : 0;
  const riskSeverityValue = getRiskSeverity(openRiskR);
  const riskSeverityDisplay: "OK" | "ELEVATED" | "DANGEROUS" =
    riskSeverityValue === "DANGER" ? "DANGEROUS" : riskSeverityValue;

  // Prepare positions data
  const positions =
    dashboard?.positions?.map((pos) => ({
      symbol: pos.symbol,
      quantity: pos.quantity,
      unrealizedPnl: pos.unrealizedPnl,
      correlationAlert: false,
    })) || [];

  // Prepare calendar events
  const calendarEvents =
    dashboard?.economicCalendar?.items.map((item) => ({
      id: item.id,
      title: item.title,
      timeUtc: item.timeUtc,
      importance:
        item.importance === "HIGH"
          ? ("HIGH" as const)
          : item.importance === "MEDIUM"
          ? ("MEDIUM" as const)
          : ("LOW" as const),
    })) || [];

  return (
    <main className="bg-[#0A0A0A] min-h-screen flex flex-col">
      {/* Hero Section */}
      <AgentycHero
        ibkrStatus={ibkrStatusDisplay}
        dataStatus={dataStatus}
        riskSeverity={riskSeverityDisplay}
        openRiskR={openRiskR}
      />

      {/* Main Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-32 flex-1">
        <div className="max-w-7xl mx-auto mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1.2fr] gap-6">
            {/* Left: Chat Panel */}
            <AgencyChatPanel />

            {/* Right: Sidebar Cards */}
            <div className="space-y-6">
              {/* Account Snapshot */}
              {dashboard?.account && (
                <AccountSnapshotMini
                  netLiquidity={dashboard.account.equity}
                  buyingPower={dashboard.account.buyingPower}
                  unrealizedPnl={dashboard.account.unrealizedPnl}
                  openRiskR={openRiskR}
                  status={
                    ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated
                      ? "LIVE"
                      : ibkrStatus?.bridgeOk || ibkrStatus?.gatewayAuthenticated
                      ? "DEGRADED"
                      : "ERROR"
                  }
                />
              )}

              {/* Positions */}
              <PositionsMiniList
                positions={positions}
                status={
                  ibkrStatus?.bridgeOk && ibkrStatus?.gatewayAuthenticated
                    ? positions.length > 0
                      ? "LIVE"
                      : "EMPTY"
                    : ibkrStatus?.bridgeOk || ibkrStatus?.gatewayAuthenticated
                    ? "DEGRADED"
                    : "ERROR"
                }
              />

              {/* Today's Calendar */}
              <TodayCalendarMini
                events={calendarEvents}
                status={
                  dashboard?.economicCalendar?.source === "LIVE"
                    ? "LIVE"
                    : dashboard?.economicCalendar?.source === "SIMULATED"
                    ? "DEGRADED"
                    : "ERROR"
                }
              />

              {/* Memory Status Card */}
              <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
                <SourceStatusBadge provider="MEMORY" status={journalCount > 0 || playbookCount > 0 ? "OK" : "OFF"} />
                <div className="pr-20 mb-3">
                  <h3 className="text-[14px] font-bold text-white">Memory Status</h3>
                </div>
                <div className="space-y-2 text-xs text-white/60">
                  <div className="flex justify-between">
                    <span>Journal entries:</span>
                    <span className="text-white/80 font-medium">{journalCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Playbook docs:</span>
                    <span className="text-white/80 font-medium">{playbookCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AgentPage() {
  return (
    <Suspense
      fallback={
        <main className="bg-[#0A0A0A] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading...</p>
          </div>
        </main>
      }
    >
      <AgentContent />
    </Suspense>
  );
}
