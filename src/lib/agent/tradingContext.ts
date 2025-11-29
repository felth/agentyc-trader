// src/lib/agent/tradingContext.ts

import { getIbkrOverview, IbkrOverviewSnapshot } from "@/lib/data/ibkrBridge";

import { getEconomicCalendar, EconomicCalendarItem } from "@/lib/data/fmp";

// -------------------------------

// TYPES

// -------------------------------

export type TradingRiskConfig = {

  maxPositionSizePct: number;

  maxPortfolioDrawdownPct: number;

  minCashBufferPct: number;

};

export type TimeContext = {

  nowIso: string;

  timezone: string;

  tradingDay: string;

};

export type CalendarContext = {

  from: string;

  to: string;

  items: EconomicCalendarItem[];

};

export type TradingContext = {

  time: TimeContext;

  risk: TradingRiskConfig;

  ibkr: IbkrOverviewSnapshot;

  calendar: CalendarContext;

};

// -------------------------------

// HELPERS

// -------------------------------

function getIsoDate(offsetDays = 0): string {

  const d = new Date();

  d.setUTCDate(d.getUTCDate() + offsetDays);

  return d.toISOString().slice(0, 10);

}

// -------------------------------

// MAIN CONTEXT FUNCTION

// -------------------------------

export async function getTradingContext(): Promise<TradingContext> {

  const from = getIsoDate(-1);

  const to = getIsoDate(2);

  const [ibkr, calendarItems] = await Promise.all([

    getIbkrOverview(),

    getEconomicCalendar(from, to),

  ]);

  const now = new Date();

  const time: TimeContext = {

    nowIso: now.toISOString(),

    timezone: "Asia/Tokyo",

    tradingDay: getIsoDate(0),

  };

  const risk: TradingRiskConfig = {

    maxPositionSizePct: 10,

    maxPortfolioDrawdownPct: 25,

    minCashBufferPct: 10,

  };

  const calendar: CalendarContext = {

    from,

    to,

    items: calendarItems,

  };

  return {

    time,

    risk,

    ibkr,

    calendar,

  };

}

