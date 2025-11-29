// src/lib/agent/tradingContextForUi.ts

import { getTradingContext } from "@/lib/agent/tradingContext";

export async function getTradingContextForUi() {

  const ctx = await getTradingContext();

  return ctx;

}

