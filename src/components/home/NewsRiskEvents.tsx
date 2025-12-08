"use client";

import React from "react";
import Link from "next/link";
import SourceStatusBadge, { type Status } from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";
import { minutesUntil as calcMinutesUntil } from "@/lib/timeUtils";

type Event = {
  id: string;
  title: string;
  releaseTime: string; // ISO string
  impactLevel: "LOW" | "MED" | "HIGH";
  countdownMinutes?: number; // Minutes until release
};

type NewsRiskEventsProps = {
  events: Event[];
  status: Status;
  onImminentHighImpact?: (hasImminent: boolean) => void; // Callback to notify parent
};

export default function NewsRiskEvents({
  events,
  status,
  onImminentHighImpact,
}: NewsRiskEventsProps) {
  // Show only next 3 events
  const displayEvents = events.slice(0, 3);

  // Check for imminent high-impact events
  const imminentHighImpact = events?.some(
    (e) => e.impactLevel === "HIGH" && calcMinutesUntil(e.releaseTime) <= 45
  );

  // Notify parent component (use useEffect to avoid stale closures)
  React.useEffect(() => {
    if (onImminentHighImpact) {
      onImminentHighImpact(imminentHighImpact);
    }
  }, [imminentHighImpact, onImminentHighImpact]);

  if (displayEvents.length === 0) {
    return (
      <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7">
        <SourceStatusBadge provider="FMP" status={status} />
        <p className="text-white/50 text-[14px]">No upcoming events</p>
      </div>
    );
  }

  return (
    <Link
      href="/calendar"
      className="relative block rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-7 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:border-white/25 active:scale-[0.99]"
    >
      <SourceStatusBadge provider="FMP" status={status} />
      {imminentHighImpact && (
        <div className="absolute top-2 left-4 z-10">
          <AgentHintTag text="news risk — no new trades" />
        </div>
      )}

      <div className={`pr-20 mb-4 ${imminentHighImpact ? 'pt-6' : ''}`}>
        <h3 className="text-[16px] font-semibold text-white">
          News & Risk Events
        </h3>
      </div>

      <div className="space-y-3">
        {displayEvents.map((event) => {
          const minsUntil = calcMinutesUntil(event.releaseTime);
          const hours = Math.max(0, Math.floor(minsUntil / 60));
          const mins = Math.max(0, minsUntil % 60);
          const countdownText = minsUntil > 0 ? `${hours}h ${mins}m` : "Past";

          const isHighRisk = event.impactLevel === "HIGH" && minsUntil <= 45;
          const borderColor =
            event.impactLevel === "HIGH"
              ? "border-[#FF4D4D]"
              : event.impactLevel === "MED"
              ? "border-[#FFBF00]"
              : "border-white/20";

          return (
            <div
              key={event.id}
              className={`rounded-xl border-2 ${borderColor} ${
                isHighRisk ? "bg-[#FF4D4D]/10" : "bg-white/5"
              } p-4`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-white mb-1">
                    {event.title}
                  </p>
                  <p className="text-[12px] text-white/50">
                    {new Date(event.releaseTime).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-[10px] uppercase font-semibold ${
                      event.impactLevel === "HIGH"
                        ? "text-[#FF4D4D]"
                        : event.impactLevel === "MED"
                        ? "text-[#FFBF00]"
                        : "text-white/60"
                    }`}
                  >
                    {event.impactLevel}
                  </span>
                  <span className="text-[11px] text-white/50">
                    {countdownText}
                  </span>
                </div>
              </div>
              {isHighRisk && (
                <p className="text-[12px] text-[#FF4D4D] font-medium mt-2">
                  No new trades
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Link>
  );
}

