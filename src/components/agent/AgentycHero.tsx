"use client";

import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import { getRiskSeverity } from "@/lib/riskUtils";

type AgentycHeroProps = {
  ibkrStatus: "LIVE" | "DEGRADED" | "DOWN";
  dataStatus: "LIVE" | "STALE";
  riskSeverity: "OK" | "ELEVATED" | "DANGEROUS";
  openRiskR?: number;
};

export default function AgentycHero({
  ibkrStatus,
  dataStatus,
  riskSeverity,
  openRiskR,
}: AgentycHeroProps) {
  return (
    <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-12">
      <div className="relative min-h-[50vh] md:min-h-[60vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-agent.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="relative h-full flex flex-col px-6 py-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white/90 tracking-tight">
                AGENTYC COPILOT
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Status chips */}
              <div
                className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                  ibkrStatus === "LIVE"
                    ? "bg-[#00FF7F]/20 text-[#00FF7F]"
                    : ibkrStatus === "DEGRADED"
                    ? "bg-[#FFBF00]/20 text-[#FFBF00]"
                    : "bg-[#FF4D4D]/20 text-[#FF4D4D]"
                }`}
              >
                IBKR: {ibkrStatus}
              </div>
              <div
                className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                  dataStatus === "LIVE"
                    ? "bg-[#00FF7F]/20 text-[#00FF7F]"
                    : "bg-[#FFBF00]/20 text-[#FFBF00]"
                }`}
              >
                Data: {dataStatus}
              </div>
              <div
                className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                  riskSeverity === "OK"
                    ? "bg-[#00FF7F]/20 text-[#00FF7F]"
                    : riskSeverity === "ELEVATED"
                    ? "bg-[#FFBF00]/20 text-[#FFBF00]"
                    : "bg-[#FF4D4D]/20 text-[#FF4D4D]"
                }`}
              >
                Risk: {riskSeverity}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="mt-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white/90 tracking-tight mb-2">
              Agentyc Copilot
            </h1>
            <p className="text-base md:text-lg text-white/70 font-medium max-w-2xl">
              Agency reads your account, risk, and market state before answering.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

