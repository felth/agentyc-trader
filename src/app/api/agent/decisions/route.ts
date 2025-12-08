// src/app/api/agent/decisions/route.ts
// Audit Log Query Endpoint

/**
 * Phase 2: Audit log query endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface DecisionsResponse {
  ok: boolean;
  decisions: Array<{
    id: string;
    timestamp: Date;
    symbol?: string;
    direction?: 'BUY' | 'SELL';
    confidence?: number;
    safety?: any;
    userAction: 'approved' | 'rejected' | 'modified' | 'pending';
    reason?: string;
    result?: any;
    mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  }>;
  error?: string;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const since = searchParams.get('since');
    const userAction = searchParams.get('user_action') as 'approved' | 'rejected' | 'modified' | 'pending' | null;
    
    let query = supabase
      .from('agent_decisions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (since) {
      query = query.gte('timestamp', since);
    }
    
    if (userAction) {
      query = query.eq('user_action', userAction);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      ok: true,
      decisions: (data || []).map(d => ({
        id: d.id,
        timestamp: new Date(d.timestamp),
        symbol: d.symbol,
        direction: d.direction,
        confidence: d.confidence ? Number(d.confidence) : undefined,
        safety: d.safety,
        userAction: d.user_action,
        reason: d.user_reason,
        result: d.result,
        mode: d.mode,
      })),
    } as DecisionsResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, decisions: [], error: err?.message ?? 'Unknown error' } as DecisionsResponse,
      { status: 500 }
    );
  }
}

