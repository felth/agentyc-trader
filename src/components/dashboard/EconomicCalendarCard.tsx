"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { EconomicCalendarSnapshot } from "@/lib/data/dashboard";

type EconomicCalendarCardProps = {
  calendar: EconomicCalendarSnapshot;
};

export function EconomicCalendarCard({ calendar }: EconomicCalendarCardProps) {
  const [showAll, setShowAll] = useState(false);
  const initialCount = 3;
  const visibleEvents = showAll ? calendar.items : calendar.items.slice(0, initialCount);
  const remaining = Math.max(calendar.items.length - initialCount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <h2 className="text-base font-bold text-white">Economic Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            {calendar.source === "LIVE" ? "FMP (live)" : "Simulated"}
          </span>
          <span className="text-xs text-white/50 font-medium">
            {new Date(calendar.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
      
      <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.4)] overflow-hidden">
        <div className="divide-y divide-white/10">
          {visibleEvents.map((event) => {
            const eventTime = new Date(event.timeUtc);
            const isUpcoming = eventTime > new Date();
            const isPast = eventTime < new Date();
            const timeDisplay = eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const impactColors = {
              HIGH: { bg: "from-red-500/20 via-red-500/15 to-orange-500/10", border: "border-red-500/30", dot: "bg-red-500", text: "text-red-300" },
              MEDIUM: { bg: "from-yellow-500/20 via-yellow-500/15 to-amber-500/10", border: "border-yellow-500/30", dot: "bg-yellow-500", text: "text-yellow-300" },
              LOW: { bg: "from-slate-500/15 via-slate-500/10 to-slate-500/5", border: "border-slate-500/20", dot: "bg-slate-500", text: "text-slate-300" },
            };
            const colors = impactColors[event.importance];
            
            return (
              <button
                key={event.id}
                type="button"
                className={`relative w-full px-5 py-4 text-left transition-all duration-300 hover:bg-white/[0.03] ${
                  isPast ? "opacity-60" : ""
                }`}
              >
                {/* Time & Impact Indicator */}
                <div className="flex items-start gap-4">
                  {/* Time Column */}
                  <div className="flex-shrink-0 w-20">
                    <p className={`text-sm font-semibold ${isUpcoming ? "text-white" : "text-white/50"}`}>
                      {timeDisplay}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                      {event.region}
                    </p>
                  </div>
                  
                  {/* Impact Dot */}
                  <div className="flex-shrink-0 pt-1">
                    <div className={`w-2 h-2 rounded-full ${colors.dot} ${isUpcoming ? "ring-2 ring-offset-2 ring-offset-black/20" : ""}`} />
                  </div>
                  
                  {/* Event Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm font-semibold leading-tight ${isUpcoming ? "text-white" : "text-white/70"}`}>
                          {event.title}
                        </h3>
                      </div>
                      
                      {/* Impact Badge */}
                      <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-br ${colors.bg} border ${colors.border} backdrop-blur-sm`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                          {event.importance}
                        </span>
                      </div>
                    </div>
                    
                    {/* Forecast/Previous */}
                    {(event.forecast || event.previous) && (
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                        {event.forecast && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider">Forecast</span>
                            <span className="text-xs font-semibold text-white/70">{event.forecast}</span>
                          </div>
                        )}
                        {event.previous && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/40 uppercase tracking-wider">Previous</span>
                            <span className="text-xs font-semibold text-white/50">{event.previous}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Subtle gradient accent on hover */}
                {isUpcoming && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg`} />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Expand/Collapse Button */}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full px-5 py-3 border-t border-white/10 bg-white/[0.02] text-xs text-white/60 hover:text-white/90 font-medium transition-colors"
          >
            {showAll ? "Show fewer events" : `Show ${remaining} more event${remaining > 1 ? 's' : ''}`}
          </button>
        )}
        
        {/* View Full Calendar Button */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
          <Link
            href="/performance?tab=calendar"
            className="block w-full text-center text-xs text-white/60 hover:text-white/90 font-medium transition-colors"
          >
            View full calendar →
          </Link>
        </div>
      </div>
    </div>
  );
}

