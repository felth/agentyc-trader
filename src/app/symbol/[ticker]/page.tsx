import SymbolHeader from "@/components/symbol/SymbolHeader";
import ChartPanel from "@/components/symbol/ChartPanel";
import StructureBlock from "@/components/symbol/StructureBlock";
import CorrelationBlock from "@/components/symbol/CorrelationBlock";
import EvidenceTiles from "@/components/symbol/EvidenceTiles";
import ActionButtons from "@/components/symbol/ActionButtons";

async function getSymbolData(ticker: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const res = await fetch(
      `${baseUrl}/api/market/price?ticker=${ticker}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { 
      symbol: ticker, 
      last: 0, 
      changePct: 0, 
      spread: 0, 
      session: "Closed", 
      status: "ERROR" as const 
    };
  }
}

export default async function SymbolPage({ 
  params 
}: { 
  params: Promise<{ ticker: string }> 
}) {
  const { ticker } = await params;
  const data = await getSymbolData(ticker);

  return (
    <main className="px-6 pt-10 pb-32 bg-black min-h-screen flex flex-col gap-8">
      <SymbolHeader {...data} />
      <ChartPanel ticker={ticker} />

      {/* Drop 3 — Agent structure panel */}
      <StructureBlock
        trend="RANGE"
        volatilityPctile={42}
        spread={data.spread}
        session={data.session}
      />

      {/* Drop 4 — Correlation Awareness */}
      <CorrelationBlock
        symbol={ticker}
        correlationScore={0.42} // placeholder until live calc added
      />

      {/* DROP 5 — Setup Evidence */}
      <EvidenceTiles
        symbol={ticker}
        strengthScore={67}   // placeholder until wired to logic
        pattern="Inside"
        momentum="Weak"
      />

      {/* CTA: Journal + Order Ticket */}
      <ActionButtons symbol={ticker} />
    </main>
  );
}
