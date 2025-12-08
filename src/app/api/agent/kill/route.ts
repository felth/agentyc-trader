// src/app/api/agent/kill/route.ts
// Kill Switch Control - POST to toggle kill switch

/**
 * Phase 2: Kill switch control endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { enableTrading, disableTrading } from '@/lib/safety/killSwitch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface KillSwitchResponse {
  ok: boolean;
  enabled: boolean;
  error?: string;
}

export async function GET() {
  try {
    const { data } = await supabase
      .from('agent_config')
      .select('agent_trading_enabled')
      .single();
    
    return NextResponse.json({
      ok: true,
      enabled: data?.agent_trading_enabled ?? false,
    } as KillSwitchResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, enabled: false, error: err?.message ?? 'Unknown error' } as KillSwitchResponse,
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { enabled: boolean };
    
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({
        ok: false,
        enabled: false,
        error: 'enabled must be a boolean',
      } as KillSwitchResponse, { status: 400 });
    }
    
    // Update database
    const { error } = await supabase
      .from('agent_config')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        agent_trading_enabled: body.enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });
    
    if (error) {
      throw error;
    }
    
    // Call kill switch functions (will throw in Phase 2, but DB is updated)
    if (body.enabled) {
      await enableTrading().catch(() => {}); // Ignore error in Phase 2
    } else {
      await disableTrading().catch(() => {}); // Ignore error in Phase 2
    }
    
    return NextResponse.json({
      ok: true,
      enabled: body.enabled,
    } as KillSwitchResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, enabled: false, error: err?.message ?? 'Unknown error' } as KillSwitchResponse,
      { status: 500 }
    );
  }
}

