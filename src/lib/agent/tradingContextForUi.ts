// src/lib/agent/tradingContextForUi.ts

import { buildTradingContext } from "@/lib/agent/tradingContext";

export async function getTradingContextForUi() {

  const ctx = await buildTradingContext();

  return ctx;

}

