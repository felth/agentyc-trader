"use client";

import { useEffect, useState, Suspense } from "react";
import { use } from "react";
import SymbolHeader from "@/components/symbol/SymbolHeader";
import ChartPanel from "@/components/symbol/ChartPanel";
import StructureBlock from "@/components/symbol/StructureBlock";
import CorrelationBlock from "@/components/symbol/CorrelationBlock";
import EvidenceTiles from "@/components/symbol/EvidenceTiles";
import ActionButtons from "@/components/symbol/ActionButtons";

type SymbolData = {
  symbol: string;
  last: number;
  changePct: number;
  spread: number;
  session: string;
  status: "LIVE" | "ERROR" | "OK";
};

type DerivedData = {
  trend: "UP" | "DOWN" | "RANGE";
  volPct: number;
  pattern: string;
  momentum: string;
  strengthScore: number;
};

function SymbolContent({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);
  const [symbolData, setSymbolData] = useState<SymbolData | null>(null);
  const [derived, setDerived] = useState<DerivedData>({
    trend: "RANGE",
    volPct: 50,
    pattern: "None",
    momentum: "Weak",
    strengthScore: 50,
  });

  useEffect(() => {
    async function fetchSymbolData() {
      try {
        const res = await fetch(`/api/market/price?ticker=${ticker}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSymbolData(data);
      } catch {
        setSymbolData({
          symbol: ticker,
          last: 0,
          changePct: 0,
          spread: 0,
          session: "Closed",
          status: "ERROR",
        });
      }
    }
    fetchSymbolData();
  }, [ticker]);

  if (!symbolData) {
    return (
      <main className="px-6 pt-10 pb-32 bg-black min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF7F]/30 border-t-[#00FF7F] rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-white/50">Loading symbol data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 pt-10 pb-32 bg-black min-h-screen flex flex-col gap-8">
      <SymbolHeader {...symbolData} />
      <ChartPanel
        ticker={ticker}
        onDerivedChange={(vals) => setDerived((prev) => ({ ...prev, ...vals }))}
      />

      {/* Drop 3 — Agent structure panel */}
      <StructureBlock
        trend={derived.trend}
        volatilityPctile={derived.volPct}
        spread={symbolData.spread}
        session={symbolData.session}
      />

      {/* Drop 4 — Correlation Awareness */}
      <CorrelationBlock
        symbol={ticker}
        correlationScore={0.42} // placeholder until live calc added
      />

      {/* DROP 5 — Setup Evidence */}
      <EvidenceTiles
        symbol={ticker}
        strengthScore={derived.strengthScore}
        pattern={derived.pattern}
        momentum={derived.momentum}
      />

      {/* CTA: Journal + Order Ticket */}
      <ActionButtons symbol={ticker} />
    </main>
  );
}

export default function SymbolPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="px-6 pt-10 pb-32 bg-black min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#00FF7F]/30 border-t-[#00FF7F] rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading...</p>
          </div>
        </main>
      }
    >
      <SymbolContent params={params} />
    </Suspense>
  );
}
