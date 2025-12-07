"use client";

type PerformanceHeroProps = {
  monthPnl?: number;
  monthPnlR?: number;
  riskStatus?: "OK" | "ELEVATED" | "DANGER";
};

export default function PerformanceHero({
  monthPnl,
  monthPnlR,
  riskStatus,
}: PerformanceHeroProps) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10">
      <div className="relative min-h-[40vh] md:min-h-[50vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-performance.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="relative h-full flex flex-col px-6 py-6">
          <div className="mt-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white/90 tracking-tight mb-2">
              Performance Overview
            </h1>
            <p className="text-base md:text-lg text-white/70 font-medium">
              Equity, risk, and behaviour.
            </p>

            {/* Mini Stats */}
            <div className="mt-6 flex flex-wrap gap-4">
              {monthPnl !== undefined && monthPnlR !== undefined ? (
                <>
                  <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                    <span className="text-xs text-white/70">This month:</span>
                    <span className={`ml-2 text-sm font-bold ${
                      monthPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
                    }`}>
                      {monthPnl >= 0 ? "+" : ""}
                      {monthPnlR.toFixed(1)}R
                    </span>
                    <span className={`ml-1 text-xs ${
                      monthPnl >= 0 ? "text-[#00FF7F]" : "text-[#FF4D4D]"
                    }`}>
                      {monthPnl !== undefined && monthPnlR !== undefined ? (
                        <>
                          ({monthPnl >= 0 ? "+" : ""}
                          ${Math.abs(monthPnl).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })})
                        </>
                      ) : null}
                    </span>
                  </div>
                </>
              ) : (
                <div className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
                  <span className="text-xs text-white/50">
                    Data pending – equity history endpoint not connected.
                  </span>
                </div>
              )}

              {riskStatus && (
                <div className={`px-3 py-1.5 rounded-full backdrop-blur-sm ${
                  riskStatus === "OK" ? "bg-[#00FF7F]/20 text-[#00FF7F]" :
                  riskStatus === "ELEVATED" ? "bg-[#FFBF00]/20 text-[#FFBF00]" :
                  "bg-[#FF4D4D]/20 text-[#FF4D4D]"
                }`}>
                  <span className="text-xs font-semibold">
                    {riskStatus === "OK" ? "Within risk profile" :
                     riskStatus === "ELEVATED" ? "Risk elevated" :
                     "Risk breach detected"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

