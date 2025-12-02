// Performance Insight - AI-generated insight based on market overview
import { fetchMarketOverview, type MarketOverviewSnapshot } from "@/lib/data/marketOverview";
import OpenAI from "openai";

export type PerformanceInsight = {
  insightText: string;
  keyLevels: string[];
  regime: string;
  setupScore: number;
  volumeScore: number;
};

export async function generatePerformanceInsight(): Promise<PerformanceInsight> {
  // Fallback if OpenAI API key is missing
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return {
      insightText: "Market data loading. Check key levels and wait for confirmation.",
      keyLevels: ["—", "—", "—"],
      regime: "RANGING",
      setupScore: 50,
      volumeScore: 50,
    };
  }

  try {
    const marketOverview = await fetchMarketOverview();
    
    // Create OpenAI client lazily (only when function is called)
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const prompt = `Given this market snapshot, provide a concise trading insight in JSON format:
- SPX: ${marketOverview.spx.value} (${marketOverview.spx.changePct > 0 ? '+' : ''}${marketOverview.spx.changePct.toFixed(2)}%)
- NDX: ${marketOverview.ndx.value} (${marketOverview.ndx.changePct > 0 ? '+' : ''}${marketOverview.ndx.changePct.toFixed(2)}%)
- DXY: ${marketOverview.dxy.value} (${marketOverview.dxy.changePct > 0 ? '+' : ''}${marketOverview.dxy.changePct.toFixed(2)}%)
- VIX: ${marketOverview.vix.value} (${marketOverview.vix.changePct > 0 ? '+' : ''}${marketOverview.vix.changePct.toFixed(2)}%)
- Gold: ${marketOverview.xauusd.value} (${marketOverview.xauusd.changePct > 0 ? '+' : ''}${marketOverview.xauusd.changePct.toFixed(2)}%)
- BTC: ${marketOverview.btcusd.value} (${marketOverview.btcusd.changePct > 0 ? '+' : ''}${marketOverview.btcusd.changePct.toFixed(2)}%)

Return JSON only:
{
  "insightText": "Brief 1-2 sentence market assessment",
  "keyLevels": ["level1", "level2", "level3"],
  "regime": "TRENDING_UP|TRENDING_DOWN|RANGING",
  "setupScore": 0-100,
  "volumeScore": 0-100
}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_AGENT_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "You are a trading analyst. Return only valid JSON, no markdown, no explanation.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content) as PerformanceInsight;
    return parsed;
  } catch (err) {
    // Fallback to default insight
    return {
      insightText: "Market data loading. Check key levels and wait for confirmation.",
      keyLevels: ["—", "—", "—"],
      regime: "RANGING",
      setupScore: 50,
      volumeScore: 50,
    };
  }
}

