"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

type HealthItem = {
  label: string;
  status: "LIVE" | "DEGRADED" | "ERROR" | "IDLE";
};

type SystemHealthFooterProps = {
  items: HealthItem[];
};

export default function SystemHealthFooter({
  items,
}: SystemHealthFooterProps) {
  const router = useRouter();

  const getStatusColor = (status: HealthItem["status"]) => {
    switch (status) {
      case "LIVE":
        return "text-[#00FF7F]";
      case "DEGRADED":
        return "text-[#FFBF00]";
      case "ERROR":
        return "text-[#FF4D4D]";
      case "IDLE":
        return "text-white/50";
      default:
        return "text-white/50";
    }
  };

  return (
    <Link
      href="/settings?tab=diagnostics"
      className="fixed bottom-0 left-0 right-0 h-12 bg-[#0A0A0A]/95 backdrop-blur-xl border-t border-white/10 px-6 flex items-center justify-between cursor-pointer hover:bg-[#0A0A0A] transition-colors"
    >
      <div className="flex items-center gap-6">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-[12px] text-white/60 uppercase tracking-wider">
              {item.label}:
            </span>
            <span className={`text-[12px] font-semibold ${getStatusColor(item.status)}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
      <span className="text-[11px] text-white/40">Tap for diagnostics →</span>
    </Link>
  );
}

