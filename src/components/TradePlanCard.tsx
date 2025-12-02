"use client";

import React from "react";
import type { TradePlan } from "@/lib/agent/tradeSchema";

interface TradePlanCardProps {
  plan: TradePlan | null;
  loading: boolean;
  onGenerate: () => void;
}

export function TradePlanCard({ plan, loading, onGenerate }: TradePlanCardProps) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">Trade Plan</h2>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-ultra-accent/20 hover:bg-ultra-accent/30 active:bg-ultra-accent/40 border border-ultra-accent/30 text-ultra-accent text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Plan"}
        </button>
      </div>

      <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        {!plan ? (
          <div className="text-center py-8">
            <p className="text-sm text-white/50 mb-1">No trade plan generated yet</p>
            <p className="text-xs text-white/40">
              Click "Generate Plan" to create a trade plan based on current context
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mode & Limits Row */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/50 font-medium">Mode:</span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white">
                  {plan.mode}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-white/50">Daily Limit:</span>
                  <span className="text-white font-semibold ml-1.5">
                    ${plan.dailyLossLimitUsd.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-white/50">Trade Limit:</span>
                  <span className="text-white font-semibold ml-1.5">
                    ${plan.singleTradeLimitUsd.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Suggested Orders */}
            <div>
              <h3 className="text-sm font-bold text-white mb-3">Suggested Orders</h3>
              {plan.orders && plan.orders.length > 0 ? (
                <div className="space-y-3">
                  {plan.orders.map((order, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
                    >
                      {/* Header: Side, Symbol, Size */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                              order.side === "BUY"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-300 border border-red-500/30"
                            }`}
                          >
                            {order.side}
                          </span>
                          <span className="text-base font-bold text-white">{order.symbol}</span>
                          {order.entry && (
                            <span className="text-sm text-white/60">@ ${order.entry.toFixed(2)}</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-white">qty {order.size}</span>
                      </div>

                      {/* Price Levels */}
                      {(order.stopLoss || order.takeProfit) && (
                        <div className="flex items-center gap-4 text-xs pt-2 border-t border-white/10">
                          {order.stopLoss && (
                            <div>
                              <span className="text-white/50">Stop:</span>
                              <span className="text-red-300 font-semibold ml-1.5">
                                ${order.stopLoss.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {order.takeProfit && (
                            <div>
                              <span className="text-white/50">Target:</span>
                              <span className="text-emerald-300 font-semibold ml-1.5">
                                ${order.takeProfit.toFixed(2)}
                              </span>
                            </div>
                          )}
                          <div className="ml-auto">
                            <span className="text-white/50">Risk:</span>
                            <span className="text-white font-semibold ml-1.5">
                              ${order.maxRiskUsd.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Rationale */}
                      {order.rationale && (
                        <p className="text-xs text-white/70 leading-relaxed pt-2 border-t border-white/10">
                          {order.rationale}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-white/50">No trades fit your rules right now.</p>
                  <p className="text-xs text-white/40 mt-1">The agent is waiting for a better setup.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

