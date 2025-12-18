"use client";

import Link from "next/link";
import { getRiskSeverity } from "@/lib/riskUtils";

type RiskGuardrailsCardProps = {
  dailyPnl: number;
  dailyLimit: number;
  openRiskR: number;
  killSwitchEnabled?: boolean;
};

export default function RiskGuardrailsCard({
  dailyPnl,
  dailyLimit,
  openRiskR,
  killSwitchEnabled,
}: RiskGuardrailsCardProps) {
  const severity = getRiskSeverity(openRiskR);
  const severityColor =
    severity === "OK" ? "#00FF7F" :
    severity === "ELEVATED" ? "#FFBF00" : "#FF4D4D";
  
  const limitProgress = dailyLimit > 0 ? Math.min(Math.abs(dailyPnl) / dailyLimit, 1) : 0;
  const limitColor = limitProgress > 0.8 ? "#FF4D4D" : limitProgress > 0.5 ? "#FFBF00" : "#00FF7F";

  return (
    <section className="px-6 py-4">
      <Link
        href="/performance"
        className="block rounded-2xl bg-white/[0.03] border border-white/5 p-5 hover:bg-white/[0.05] hover:border-white/10 transition-all active:scale-[0.99]"
      >
        <div className="space-y-4">
          {/* Daily Limit Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                Daily Limit
              </p>
              <p className="text-[12px] font-medium text-white/70">
                ${Math.abs(dailyPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${dailyLimit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${limitProgress * 100}%`,
                  backgroundColor: limitColor,
                }}
              />
            </div>
          </div>

          {/* Risk Indicator */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
              Open Risk
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: severityColor }}
              />
              <p
                className="text-[14px] font-semibold"
                style={{ color: severityColor }}
              >
                {openRiskR.toFixed(1)}R
              </p>
            </div>
          </div>

          {/* Kill Switch (if available) */}
          {killSwitchEnabled !== undefined && (
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <p className="text-[10px] uppercase tracking-wider text-white/50 font-medium">
                Kill Switch
              </p>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${killSwitchEnabled ? "bg-[#00FF7F]" : "bg-[#FF4D4D]"}`} />
                <p className="text-[12px] font-medium text-white/70">
                  {killSwitchEnabled ? "ON" : "OFF"}
                </p>
              </div>
            </div>
          )}
        </div>
      </Link>
    </section>
  );
}

