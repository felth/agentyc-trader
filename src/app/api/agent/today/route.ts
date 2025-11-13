import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { AgentTodayResponse } from "../../../../types/agent";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const user_prompt = String(body.user_prompt || "").trim();

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const system = [
    "You are Agentyc Today.",
    "Base your analysis ONLY on the user's saved lessons.",
    "Provide actionable trading insights.",
    "Return STRICT JSON: { ideas: string[], bullets: string[] }"
  ].join(" ");

  const user = [
    { type: "text", text: user_prompt || "What looks good today?" }
  ];

  const chat = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user as any }
    ],
    temperature: 0.2
  });

  let raw = chat.choices?.[0]?.message?.content || "";
  let jsonString = "{}";

  try {
    const m = raw.match(/\{[\s\S]*\}/);
    jsonString = m ? m[0] : raw;
  } catch {}

  let parsed: AgentTodayResponse = { ideas: [], bullets: [] };

  try {
    parsed = JSON.parse(jsonString);
  } catch {}

  return NextResponse.json({ ok: true, ...parsed });
}

