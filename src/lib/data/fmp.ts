// src/lib/data/fmp.ts

import { cache } from "react";

const FMP_BASE_URL = process.env.FMP_BASE_URL || "https://financialmodelingprep.com/api/v3";

const FMP_API_KEY = process.env.FMP_API_KEY;

if (!FMP_API_KEY) {
  throw new Error("Missing FMP_API_KEY in environment");
}

// After the check above, TypeScript knows it's defined
const API_KEY = FMP_API_KEY;

type FmpParams = Record<string, string | number | boolean | undefined>;

export async function fmp(path: string, params?: FmpParams) {
  const url = new URL(`${FMP_BASE_URL}${path}`);
  
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }
  }
  
  url.searchParams.append("apikey", API_KEY);

  const res = await fetch(url.toString(), {
    // economic calendar can be near-real-time, but not tick data
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`FMP error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export type EconomicCalendarItem = {
  date: string;             // "2025-11-22"
  time?: string;            // "13:30"
  country?: string;         // "US"
  event?: string;           // "Non Farm Payrolls"
  impact?: string;          // "High" | "Medium" | "Low"
  actual?: number | null;
  previous?: number | null;
  forecast?: number | null;
  unit?: string | null;
};

export const getEconomicCalendar = cache(
  async (from: string, to: string): Promise<EconomicCalendarItem[]> => {
    // FMP economic calendar endpoint
    const data = await fmp("/economic_calendar", { from, to });
    return data as EconomicCalendarItem[];
  }
);

