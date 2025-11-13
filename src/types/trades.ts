export interface Trade {
  id: string;
  symbol: string;
  direction: "long" | "short";
  entry?: number | null;
  stop?: number | null;
  risk?: number | null;
  current?: number | null;
  pnl_r?: number | null;
  status: "open" | "closed";
  notes?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
}

