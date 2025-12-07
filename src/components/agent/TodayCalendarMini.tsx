"use client";

import Link from "next/link";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";
import AgentHintTag from "@/components/ui/AgentHintTag";
import { minutesUntil as calcMinutesUntil } from "@/lib/timeUtils";

type Event = {
  id: string;
  title: string;
  timeUtc: string;
  importance: "LOW" | "MEDIUM" | "HIGH";
};

type TodayCalendarMiniProps = {
  events: Event[];
  status: "LIVE" | "DEGRADED" | "ERROR";
};

export default function TodayCalendarMini({
  events,
  status,
}: TodayCalendarMiniProps) {
  const displayEvents = events.slice(0, 3);
  
  // Check for imminent high-impact events
  const imminentHighImpact = events?.some(
    (e) => e.importance === "HIGH" && calcMinutesUntil(e.timeUtc) <= 45
  );

  if (displayEvents.length === 0) {
    return (
      <div className="relative rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5">
        <SourceStatusBadge provider="FMP" status={status} />
        <h3 className="text-[14px] font-bold text-white mb-2">Today's Calendar</h3>
        <p className="text-white/50 text-[13px]">No upcoming events</p>
      </div>
    );
  }

  return (
    <Link
      href="/calendar"
      className="relative block rounded-[24px] bg-white/[0.08] backdrop-blur-xl border border-white/15 p-5 cursor-pointer transition-all duration-150 hover:scale-[1.01] hover:border-white/25 active:scale-[0.99]"
    >
      <SourceStatusBadge provider="FMP" status={status} />
      {imminentHighImpact && (
        <div className="absolute top-2 left-4 z-10">
          <AgentHintTag text="news risk — no new trades" />
        </div>
      )}

      <h3 className="text-[14px] font-bold text-white mb-3">Today's Calendar</h3>
      <div className="space-y-2">
        {displayEvents.map((event) => {
          const minsUntil = calcMinutesUntil(event.timeUtc);
          const hours = Math.max(0, Math.floor(minsUntil / 60));
          const mins = Math.max(0, minsUntil % 60);
          const countdownText = minsUntil > 0 ? `${hours}h ${mins}m` : "Past";

          return (
            <div
              key={event.id}
              className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white/5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white truncate">
                  {event.title}
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  {new Date(event.timeUtc).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-[10px] uppercase font-semibold ${
                    event.importance === "HIGH"
                      ? "text-[#FF4D4D]"
                      : event.importance === "MEDIUM"
                      ? "text-[#FFBF00]"
                      : "text-white/60"
                  }`}
                >
                  {event.importance === "MEDIUM" ? "MED" : event.importance}
                </span>
                <span className="text-[10px] text-white/50">{countdownText}</span>
              </div>
            </div>
          );
        })}
        <p className="text-[12px] text-white/60 hover:text-white transition-colors text-center pt-1">
          View full calendar →
        </p>
      </div>
    </Link>
  );
}

