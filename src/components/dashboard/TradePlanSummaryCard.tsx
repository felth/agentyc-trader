"use client";

import React from "react";
import Link from "next/link";
import type { TradePlan } from "@/lib/agent/tradeSchema";

export type TradePlanSummaryProps = {
  plan: TradePlan | null;
  loading: boolean;
  onGeneratePlan?: () => void;
};

export function TradePlanSummaryCard({
  plan,
  loading,
  onGeneratePlan,
}: TradePlanSummaryProps) {
  return (
    <section className="mb-6">
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Trade Plan</h3>
          {onGeneratePlan && (
            <button
              onClick={onGeneratePlan}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-ultra-accent/20 hover:bg-ultra-accent/30 active:bg-ultra-accent/40 border border-ultra-accent/30 text-ultra-accent text-xs font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Plan"}
            </button>
          )}
        </div>

        {!plan ? (
          <div className="text-center py-4">
            <p className="text-sm text-white/50 mb-1">No trade plan generated yet</p>
            <p className="text-xs text-white/40">
              {onGeneratePlan ? 'Click "Generate Plan" to create a trade plan' : "No trades fit your rules right now"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Mode</p>
                  <p className="text-sm font-semibold text-white">{plan.mode.replace("_", "-")}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Daily Loss Limit</p>
                  <p className="text-sm font-semibold text-white">
                    ${plan.dailyLossLimitUsd.toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Per-Trade Limit</p>
                  <p className="text-sm font-semibold text-white">
                    ${plan.singleTradeLimitUsd.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                {plan.orders.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Active Orders</p>
                    <p className="text-sm font-semibold text-white">{plan.orders.length}</p>
                  </div>
                )}
                {plan.orders.length === 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-white/50 italic">
                      No trades fit your rules right now. The agent is waiting for a better setup.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {plan && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                <Link
                  href="/agent?view=plan"
                  className="text-xs text-white/60 hover:text-white transition-colors"
                >
                  View full plan →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

