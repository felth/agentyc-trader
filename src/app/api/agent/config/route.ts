// src/app/api/agent/config/route.ts
// Agent Config Endpoint - GET/POST for risk settings

/**
 * Phase 5: Agent config endpoint for risk settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface AgentConfigResponse {
  ok: boolean;
  config?: {
    max_risk_per_trade: number;
    daily_loss_limit: number;
    allowed_symbols: string[];
    psychology_mode: 'aggressive' | 'normal' | 'cautious';
    allow_overnight: boolean;
    max_open_positions?: number;
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
      return NextResponse.json({
        ok: true,
        config: {
          max_risk_per_trade: 500,
          daily_loss_limit: 2000,
          allowed_symbols: [],
          psychology_mode: 'normal',
          allow_overnight: false,
          max_open_positions: 5,
        },
      } as AgentConfigResponse);
    }
    
    return NextResponse.json({
      ok: true,
      config: {
        max_risk_per_trade: Number(data.max_risk_per_trade) || 500,
        daily_loss_limit: Number(data.daily_loss_limit) || 2000,
        allowed_symbols: data.allowed_symbols || [],
        psychology_mode: (data.psychology_mode || 'normal') as 'aggressive' | 'normal' | 'cautious',
        allow_overnight: data.allow_overnight ?? false,
        max_open_positions: 5, // Default
      },
    } as AgentConfigResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' } as AgentConfigResponse,
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Get existing config to preserve mode
    const { data: existing } = await supabase
      .from('agent_config')
      .select('*')
      .single();
    
    const { error } = await supabase
      .from('agent_config')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        mode: existing?.mode || 'off',
        max_risk_per_trade: body.max_risk_per_trade ?? existing?.max_risk_per_trade ?? 500,
        daily_loss_limit: body.daily_loss_limit ?? existing?.daily_loss_limit ?? 2000,
        allowed_symbols: body.allowed_symbols ?? existing?.allowed_symbols ?? [],
        psychology_mode: body.psychology_mode ?? existing?.psychology_mode ?? 'normal',
        allow_overnight: body.allow_overnight ?? existing?.allow_overnight ?? false,
        agent_trading_enabled: existing?.agent_trading_enabled ?? false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      ok: true,
      config: {
        max_risk_per_trade: Number(body.max_risk_per_trade ?? existing?.max_risk_per_trade ?? 500),
        daily_loss_limit: Number(body.daily_loss_limit ?? existing?.daily_loss_limit ?? 2000),
        allowed_symbols: body.allowed_symbols ?? existing?.allowed_symbols ?? [],
        psychology_mode: (body.psychology_mode ?? existing?.psychology_mode ?? 'normal') as 'aggressive' | 'normal' | 'cautious',
        allow_overnight: body.allow_overnight ?? existing?.allow_overnight ?? false,
        max_open_positions: 5,
      },
    } as AgentConfigResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' } as AgentConfigResponse,
      { status: 500 }
    );
  }
}

