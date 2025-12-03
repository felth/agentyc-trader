import { cache } from "react";

// Lazy getters for API credentials - only checked when functions are called
function getMassiveBaseUrl(): string {
  const baseUrl = process.env.MASSIVE_BASE_URL;
  if (!baseUrl) {
    throw new Error("MASSIVE_BASE_URL is not set");
  }
  return baseUrl;
}

function getMassiveApiKey(): string {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    throw new Error("MASSIVE_API_KEY is not set");
  }
  return apiKey;
}

function buildUrl(path: string, params?: Record<string, any>): string {
  const BASE_URL = getMassiveBaseUrl();
  const API_KEY = getMassiveApiKey();
  
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, String(value));
    }
  }
  url.searchParams.append("apiKey", API_KEY);
  return url.toString();
}

export async function massive(
  path: string,
  params?: Record<string, any>
): Promise<any> {
  const url = buildUrl(path, params);
  const res = await fetch(url, {
    // very short revalidate – we'll tune later
    next: { revalidate: 1 },
  });

  if (!res.ok) {
    throw new Error(`Massive API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// Simple helpers – we'll refine types later
export const getQuote = cache((symbol: string) => {
  return massive(`/v2/last/nbbo/${symbol}`);
});

export const getAggregates = cache((symbol: string, tf: string) => {
  // tf examples: "minute", "hour", "day"
  return massive(
    `/v2/aggs/ticker/${symbol}/range/1/${tf}/2024-01-01/2025-12-31`
  );
});

export const getMarketStatus = cache(() => {
  return massive(`/v1/marketstatus/now`);
});

