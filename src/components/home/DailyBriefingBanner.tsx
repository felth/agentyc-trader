"use client";

import { useRouter } from "next/navigation";
import SourceStatusBadge from "@/components/ui/SourceStatusBadge";

type DailyBriefingProps = {
  dateDisplay: string;
  timeDisplay: string;
  systemStatus: "GREEN" | "AMBER" | "RED";
};

export default function DailyBriefingBanner({
  dateDisplay,
  timeDisplay,
  systemStatus,
}: DailyBriefingProps) {
  const router = useRouter();

  const statusText =
    systemStatus === "GREEN"
      ? "SYSTEM: ALL GREEN"
      : systemStatus === "AMBER"
      ? "SYSTEM: DEGRADED"
      : "SYSTEM: ERROR";

  return (
    <div
      onClick={() => router.push("/status")}
      className="relative w-full rounded-[24px] bg-[#111111] p-8 cursor-pointer transition-transform duration-150 hover:scale-[1.01] active:scale-[0.99]"
    >
      <SourceStatusBadge provider="AGENTYC" status="LIVE" />
      <div className="text-[42px] font-semibold text-white leading-none tracking-tight">
        {dateDisplay}
      </div>
      <div className="text-[16px] text-[#9EA6AE] mt-1">
        {timeDisplay}
      </div>
      <div
        className={`absolute right-8 bottom-8 text-[13px] font-semibold ${
          systemStatus === "GREEN"
            ? "text-[#00FF7F]"
            : systemStatus === "AMBER"
            ? "text-[#FFBF00]"
            : "text-[#FF4D4D]"
        }`}
      >
        {statusText}
      </div>
    </div>
  );
}

