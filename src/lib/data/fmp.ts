// src/lib/data/fmp.ts

import { cache } from "react";

// FMP has moved from /api/v3 to /stable endpoints (legacy v3 endpoints deprecated Aug 31, 2025)
const FMP_BASE_URL = process.env.FMP_BASE_URL || "https://financialmodelingprep.com/stable";

// Lazy getter for API key - only checked when function is called, not at module load time
function getFmpApiKey(): string {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    throw new Error("Missing FMP_API_KEY in environment");
  }
  return apiKey;
}

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
  
  // Check API key only when function is called, not at module load
  // FMP uses "apikey" as query parameter
  const apiKey = getFmpApiKey();
  url.searchParams.append("apikey", apiKey);
  
  // Also try "apiKey" if "apikey" doesn't work (some endpoints use different names)
  // url.searchParams.append("apiKey", apiKey);

  const fullUrl = url.toString();
  console.log(`[FMP] Calling: ${fullUrl.replace(apiKey, "***REDACTED***")}`);

  const res = await fetch(fullUrl, {
    // economic calendar can be near-real-time, but not tick data
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`[FMP] Error ${res.status}: ${errorText}`);
    throw new Error(`FMP error: ${res.status} ${res.statusText}. ${errorText.substring(0, 200)}`);
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

