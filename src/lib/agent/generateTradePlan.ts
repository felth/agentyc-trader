import { TradePlan } from "@/lib/agent/tradeSchema";
import { TradingContext } from "@/lib/agent/tradingContext";
import OpenAI from "openai";

export async function generateTradePlan(context: TradingContext): Promise<TradePlan> {
  const systemPrompt = `
You are Agentyc Trader, a cautious trading co-pilot.

Rules:
- Never place trades directly. You only SUGGEST trades as structured JSON.
- New trades MUST respect:
  - maxSingleTradeRiskUsd: ${context.riskProfile.maxSingleTradeRiskUsd}
  - maxDailyLossUsd: ${context.riskProfile.maxDailyLossUsd}
  - allowShortSelling: ${context.riskProfile.allowShortSelling} (if false, no short entries).
- Closing trades is always allowed, but still explain why.
- If the user seems emotional, reduce size or suggest no trade.

You MUST respond with a JSON object of type TradePlan only.
Do not include any extra text or code fences.

TradePlan structure:
{
  "mode": "SIMULATION" | "LIVE_CONFIRM_REQUIRED",
  "contextSummary": "Brief summary of market context",
  "suggestedCommands": [
    {
      "action": "OPEN_LONG" | "OPEN_SHORT" | "CLOSE_POSITION" | "CANCEL_ORDER",
      "symbol": "AAPL",
      "quantity": 10,
      "timeInForce": "DAY" | "GTC",
      "orderType": "MARKET" | "LIMIT",
      "limitPrice": 150.00,
      "reason": "Brief 1-2 sentence explanation",
      "riskNotes": "What is at risk and why it fits limits"
    }
  ]
}
`;

  const contextSummary = `
Account:
- Balance: ${context.account.balance}
- Equity: ${context.account.equity}
- Unrealized PnL: ${context.account.unrealizedPnl}
- Buying power: ${context.account.buyingPower}

Positions:
${context.positions.length > 0
  ? context.positions
      .map(
        (p) =>
          `- ${p.symbol}: ${p.quantity} @ ${p.avgPrice} (mkt ${p.marketPrice}, uPnL ${p.unrealizedPnl})`
      )
      .join("\n")
  : "- None"}

Open orders:
${context.orders.length > 0
  ? context.orders.map((o) => `- ${o.symbol} ${o.side} ${o.quantity} (${o.status})`).join("\n")
  : "- None"}
`;

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Generate a trade plan based on current trading context:\n${contextSummary}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error("Agent did not return a response");
  }

  let plan: TradePlan;
  try {
    plan = JSON.parse(rawContent) as TradePlan;
  } catch (parseError) {
    throw new Error("Agent did not return valid JSON");
  }

  if (!plan || !Array.isArray(plan.suggestedCommands)) {
    throw new Error("Agent did not return a valid TradePlan");
  }

  return plan;
}

