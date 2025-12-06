"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { EconomicCalendarSnapshot, EconomicCalendarItem } from "@/lib/data/dashboard";

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<EconomicCalendarSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [impactFilter, setImpactFilter] = useState<"ALL" | "HIGH" | "MEDIUM" | "LOW">("ALL");
  const [countryFilter, setCountryFilter] = useState<string>("ALL");

  useEffect(() => {
    async function fetchCalendar() {
      try {
        const res = await fetch("/api/calendar/today");
        const data = await res.json();
        if (data.ok && data.calendar) {
          setCalendar(data.calendar);
        }
      } catch (err) {
        console.error("Failed to fetch calendar:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCalendar();
  }, []);

  const filteredEvents = calendar?.items.filter((event) => {
    if (impactFilter !== "ALL" && event.importance !== impactFilter) return false;
    if (countryFilter !== "ALL" && event.region !== countryFilter) return false;
    return true;
  }) || [];

  const countries = Array.from(new Set(calendar?.items.map((e) => e.region) || []));

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-sm text-white/50">Loading economic calendar...</p>
          </div>
        </div>
      </main>
    );
  }

  const getImpactColors = (importance: EconomicCalendarItem["importance"]) => {
    switch (importance) {
      case "HIGH": return { bg: "bg-red-500/15", text: "text-red-300", dot: "bg-red-500" };
      case "MEDIUM": return { bg: "bg-amber-500/15", text: "text-amber-200", dot: "bg-amber-500" };
      case "LOW": return { bg: "bg-slate-500/15", text: "text-slate-300", dot: "bg-slate-500" };
      default: return { bg: "bg-slate-500/15", text: "text-slate-300", dot: "bg-slate-500" };
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Economic Calendar</h1>
            <p className="text-sm text-white/50 mt-1">
              {calendar?.date ? new Date(calendar.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/40 uppercase tracking-wider">
              {calendar?.source === "LIVE" ? "FMP (live)" : "Simulated"}
            </span>
            <Link
              href="/"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">Impact:</span>
            {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((impact) => (
              <button
                key={impact}
                onClick={() => setImpactFilter(impact)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  impactFilter === impact
                    ? "bg-orange-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {impact}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">Country:</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-white/5 text-white border border-white/10 focus:outline-none focus:border-orange-500"
            >
              <option value="ALL">All</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Events List */}
        <div className="rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 overflow-hidden">
          <div className="divide-y divide-white/10">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const eventTime = new Date(event.timeUtc);
                const isUpcoming = eventTime > new Date();
                const isPast = eventTime < new Date();
                const timeDisplay = eventTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                const colors = getImpactColors(event.importance);

                return (
                  <button
                    key={event.id}
                    type="button"
                    className={`w-full px-5 py-4 text-left transition-all duration-300 hover:bg-white/[0.03] ${
                      isPast ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-20">
                        <p className={`text-sm font-semibold ${isUpcoming ? "text-white" : "text-white/50"}`}>
                          {timeDisplay}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">
                          {event.region}
                        </p>
                      </div>

                      <div className="flex-shrink-0 pt-1">
                        <div className={`w-2 h-2 rounded-full ${colors.dot} ${isUpcoming ? "ring-2 ring-offset-2 ring-offset-black/20" : ""}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-semibold leading-tight ${isUpcoming ? "text-white" : "text-white/70"}`}>
                              {event.title}
                            </h3>
                          </div>

                          <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg ${colors.bg} border ${colors.border || "border-transparent"} backdrop-blur-sm`}>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${colors.text}`}>
                              {event.importance}
                            </span>
                          </div>
                        </div>

                        {(event.forecast || event.previous || event.actual) && (
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
                            {event.actual && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">Actual</span>
                                <span className="text-xs font-semibold text-white">{event.actual}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-white/50">No events found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

