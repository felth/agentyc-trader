// src/app/api/agent/trading/route.ts

import { NextResponse } from "next/server";

import { getTradingContext } from "@/lib/agent/tradingContext";

type AgentRequest = {

  input: string;

};

export async function POST(req: Request) {

  try {

    const body = (await req.json()) as AgentRequest;

    if (!body.input || typeof body.input !== "string") {

      return NextResponse.json(

        { ok: false, error: "Missing 'input' string" },

        { status: 400 },

      );

    }

    const context = await getTradingContext();

    const reply = {

      message:

        "Trading agent stub. LLM wiring not yet connected, but context is ready.",

    };

    return NextResponse.json({

      ok: true,

      reply,

      context,

    });

  } catch (err: any) {
    return NextResponse.json(

      { ok: false, error: err?.message ?? "Trading agent error" },

      { status: 500 },

    );

  }

}

