// Economic Calendar Helper - Transform FMP data into dashboard format
import { cache } from "react";
import { getEconomicCalendar, type EconomicCalendarItem as FmpCalendarItem } from "./fmp";
import type { EconomicCalendarSnapshot, EconomicCalendarItem } from "./dashboard";

function mapFmpToDashboardItem(fmpItem: FmpCalendarItem, index: number): EconomicCalendarItem {
  const impact = fmpItem.impact || "LOW";
  const importance: "LOW" | "MEDIUM" | "HIGH" = 
    impact.toUpperCase() === "HIGH" ? "HIGH" :
    impact.toUpperCase() === "MEDIUM" ? "MEDIUM" : "LOW";

  // Construct time UTC from date and time fields
  let timeUtc = fmpItem.date || new Date().toISOString();
  if (fmpItem.time && fmpItem.date) {
    // Try to parse date + time into UTC
    try {
      const [hours, minutes] = fmpItem.time.split(":").map(Number);
      const date = new Date(fmpItem.date);
      date.setHours(hours || 0, minutes || 0, 0, 0);
      timeUtc = date.toISOString();
    } catch {
      // Fallback to date only
    }
  }

  return {
    id: `event-${index}-${fmpItem.date || Date.now()}`,
    timeUtc,
    region: fmpItem.country || "UNKNOWN",
    title: fmpItem.event || "Economic Event",
    importance,
    forecast: fmpItem.forecast ? String(fmpItem.forecast) : null,
    previous: fmpItem.previous ? String(fmpItem.previous) : null,
  };
}

export const getTodayEconomicCalendar = cache(async (): Promise<EconomicCalendarSnapshot> => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  try {
    const fmpItems = await getEconomicCalendar(todayStr, tomorrowStr);
    
    const items = fmpItems
      .filter((item) => {
        // Filter to today's events only
        const itemDate = item.date?.slice(0, 10);
        return itemDate === todayStr;
      })
      .map((item, idx) => mapFmpToDashboardItem(item, idx));

    return {
      date: todayStr,
      items,
      source: "LIVE",
    };
  } catch (err) {
    // Fallback to hard-coded high-impact events if FMP fails
    const fallbackItems: EconomicCalendarItem[] = [
      {
        id: "fallback-1",
        timeUtc: new Date(today.getTime() + 8.5 * 60 * 60 * 1000).toISOString(), // 08:30 ET
        region: "US",
        title: "Non-Farm Payrolls",
        importance: "HIGH",
        forecast: "200K",
        previous: "187K",
      },
      {
        id: "fallback-2",
        timeUtc: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10:00 ET
        region: "US",
        title: "ISM Manufacturing PMI",
        importance: "MEDIUM",
        forecast: "52.3",
        previous: "51.2",
      },
    ];

    return {
      date: todayStr,
      items: fallbackItems,
      source: "SIMULATED",
    };
  }
});

