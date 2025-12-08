// src/app/api/agent/status/route.ts
// Agent Status Endpoint - Brain + Safety + Mode + Health

/**
 * Phase 2: Agent status endpoint
 */

import { NextResponse } from 'next/server';
import { isTradingEnabled } from '@/lib/safety/killSwitch';
import { checkDataFreshness } from '@/lib/safety/dataIntegrity';
import { getSystemHealth } from '@/lib/telemetry/metrics';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface AgentStatusResponse {
  ok: boolean;
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  killSwitch: {
    enabled: boolean;
  };
  brains: {
    market: {
      state: 'green' | 'amber' | 'red';
      lastUpdate?: Date;
    };
    risk: {
      state: 'green' | 'amber' | 'red';
      lastUpdate?: Date;
    };
    psychology: {
      state: 'green' | 'amber' | 'red';
      lastUpdate?: Date;
    };
  };
  safety: {
    dataIntegrity: 'green' | 'amber' | 'red';
    ibkrConnected: boolean;
    ibkrAuthenticated: boolean;
  };
  health: {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    ibkr: 'ok' | 'degraded' | 'down';
    bridge: 'ok' | 'degraded' | 'down';
    ibeam: 'ok' | 'degraded' | 'down';
  };
  error?: string;
}

export async function GET() {
  try {
    // Get mode
    const { data: config } = await supabase
      .from('agent_config')
      .select('mode, agent_trading_enabled')
      .single();
    
    const mode = (config?.mode || 'off') as 'off' | 'learn' | 'paper' | 'live_assisted';
    const killSwitchEnabled = config?.agent_trading_enabled ?? false;
    
    // Check kill switch
    const killSwitchStatus = await isTradingEnabled();
    
    // Check data integrity
    // Data integrity check (simplified for now)
    const dataIntegrity = { 
      ok: true, 
      state: 'green' as const, 
      errors: [], 
      warnings: [],
      ibkrConnected: true,
      ibkrAuthenticated: true,
    };
    
    // Get system health (placeholder - will return default in Phase 2)
    const health = await getSystemHealth();
    
    // Get latest brain metrics (placeholder - will be implemented in Phase 3)
    const { data: brainMetrics } = await supabase
      .from('brain_metrics')
      .select('brain_name, state, timestamp')
      .order('timestamp', { ascending: false })
      .limit(3);
    
    const brainStates: AgentStatusResponse['brains'] = {
      market: { state: 'red' },
      risk: { state: 'red' },
      psychology: { state: 'red' },
    };
    
    if (brainMetrics) {
      brainMetrics.forEach(metric => {
        const state = metric.state as 'green' | 'amber' | 'red';
        const lastUpdate = new Date(metric.timestamp);
        
        if (metric.brain_name === 'market') {
          brainStates.market = { state, lastUpdate };
        } else if (metric.brain_name === 'risk') {
          brainStates.risk = { state, lastUpdate };
        } else if (metric.brain_name === 'psychology') {
          brainStates.psychology = { state, lastUpdate };
        }
      });
    }
    
    return NextResponse.json({
      ok: true,
      mode,
      killSwitch: {
        enabled: killSwitchStatus,
      },
      brains: brainStates,
      safety: {
        dataIntegrity: dataIntegrity.state,
        ibkrConnected: dataIntegrity.ibkrConnected,
        ibkrAuthenticated: dataIntegrity.ibkrAuthenticated,
      },
      health: {
        overall: 'unhealthy', // TODO: Get from health check in Phase 3
        ibkr: dataIntegrity.ibkrConnected ? 'ok' : 'down',
        bridge: dataIntegrity.ibkrConnected ? 'ok' : 'down',
        ibeam: dataIntegrity.ibkrAuthenticated ? 'ok' : 'down',
      },
    } as AgentStatusResponse);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, mode: 'off', error: err?.message ?? 'Unknown error' } as Partial<AgentStatusResponse>,
      { status: 500 }
    );
  }
}

