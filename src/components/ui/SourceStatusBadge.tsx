"use client";

type Status = "LIVE" | "OK" | "IDLE" | "DEGRADED" | "ERROR" | "OFF" | "TODO";
type Provider = "IBKR" | "FMP" | "DERIVED" | "AGENT" | "AGENCY" | "AGENTYC" | "COINGECKO" | "MEMORY" | "JOURNAL";

const statusColors: Record<Status, string> = {
  LIVE: "#00FF7F",
  OK: "#7FE1FF",
  IDLE: "#7FE1FF",
  DEGRADED: "#FFBF00",
  ERROR: "#FF4D4D",
  OFF: "#9EA6AE",
  TODO: "#9EA6AE",
};

export default function SourceStatusBadge({
  provider,
  status,
}: {
  provider: Provider;
  status: Status;
}) {
  return (
    <div
      className="absolute top-4 right-4 text-[12px] uppercase font-semibold tracking-wide"
      style={{ color: statusColors[status] }}
    >
      {provider} • {status}
    </div>
  );
}

export type { Status, Provider };

