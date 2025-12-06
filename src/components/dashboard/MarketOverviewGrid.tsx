"use client";

import React from "react";
import Link from "next/link";
import type { PriceTile } from "@/lib/data/dashboard";

export type MarketOverviewGridProps = {
  tiles: PriceTile[];
};

export function MarketOverviewGrid({ tiles }: MarketOverviewGridProps) {
  if (!tiles || tiles.length === 0) {
    return (
      <section className="mb-6">
        <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          <h3 className="text-base font-bold text-white mb-4">Market Overview</h3>
          <p className="text-sm text-white/50">Market data unavailable</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-2xl border border-white/15 p-5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">Market Overview</h3>
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            {tiles.length > 0 && tiles[0].source === "LIVE" 
              ? "FMP / Coinbase / CoinGecko (live)" 
              : "Derived"}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {tiles.map((tile, index) => {
            const changeColor =
              tile.changePct === null
                ? "text-white/50"
                : tile.changePct >= 0
                ? "text-ultra-positive"
                : "text-ultra-negative";
            const changeSign = tile.changePct !== null && tile.changePct > 0 ? "+" : "";

            return (
              <Link
                key={`${tile.symbol}-${index}`}
                href={`/symbol/${tile.symbol}`}
                className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 text-left"
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white/90">{tile.label}</p>
                  {tile.value !== null ? (
                    <>
                      <p className="text-base font-semibold text-white">
                        {tile.value.toLocaleString(undefined, {
                          minimumFractionDigits: tile.label === "VIX" ? 2 : 0,
                          maximumFractionDigits: tile.label === "VIX" ? 2 : 2,
                        })}
                      </p>
                      {tile.changePct !== null && (
                        <p className={`text-xs font-medium ${changeColor}`}>
                          {changeSign}
                          {tile.changePct.toFixed(2)}%
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-white/40">—</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

