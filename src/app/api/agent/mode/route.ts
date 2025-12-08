// src/app/api/agent/mode/route.ts
// Agent Mode Control - GET current mode, POST to change mode

/**
 * Phase 2: Agent mode control endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface AgentModeResponse {
  ok: boolean;
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  config?: {
    max_risk_per_trade: number;
    daily_loss_limit: number;
    allowed_symbols: string[];
    psychology_mode: 'aggressive' | 'normal' | 'cautious';
    agent_trading_enabled: boolean;
    allow_overnight: boolean;
  };
  error?: string;
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('agent_config')
      .select('*')
      .single();
    
    if (error || !data) {
      // Return default config if none exists
      return NextResponse.json({
        ok: true,
        mode: 'off',
        config: {
          max_risk_per_trade: 500,
          daily_loss_limit: 2000,
          allowed_symbols: [],
          psychology_mode: 'normal',
          agent_trading_enabled: false,
          allow_overnight: false,
        },
      } as AgentModeResponse);
    }
    
    return NextResponse.json({
      ok: true,
      mode: data.mode as 'off' | 'learn' | 'paper' | 'live_assisted',
      config: {
        max_risk_per_trade: Number(data.max_risk_per_trade) || 500,
        daily_loss_limit: Number(data.daily_loss_limit) || 2000,
        allowed_symbols: data.allowed_symbols || [],
        psychology_mode: data.psychology_mode || 'normal',
        agent_trading_enabled: data.agent_trading_enabled ?? false,
        allow_overnight: data.allow_overnight ?? false,
      },
    } as AgentModeResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, mode: 'off', error: err?.message ?? 'Unknown error' } as AgentModeResponse,
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { mode: 'off' | 'learn' | 'paper' | 'live_assisted' };
    
    if (!body.mode || !['off', 'learn', 'paper', 'live_assisted'].includes(body.mode)) {
      return NextResponse.json({
        ok: false,
        mode: 'off',
        error: 'Invalid mode. Must be: off, learn, paper, or live_assisted',
      } as AgentModeResponse, { status: 400 });
    }
    
    // Update or insert config
    const { data, error } = await supabase
      .from('agent_config')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        mode: body.mode,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      ok: true,
      mode: data.mode as 'off' | 'learn' | 'paper' | 'live_assisted',
      config: {
        max_risk_per_trade: Number(data.max_risk_per_trade) || 500,
        daily_loss_limit: Number(data.daily_loss_limit) || 2000,
        allowed_symbols: data.allowed_symbols || [],
        psychology_mode: data.psychology_mode || 'normal',
        agent_trading_enabled: data.agent_trading_enabled ?? false,
        allow_overnight: data.allow_overnight ?? false,
      },
    } as AgentModeResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, mode: 'off', error: err?.message ?? 'Unknown error' } as AgentModeResponse,
      { status: 500 }
    );
  }
}

