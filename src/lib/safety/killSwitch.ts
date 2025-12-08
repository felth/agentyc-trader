// src/lib/safety/killSwitch.ts
// Kill Switch - Global trading enable/disable

/**
 * Phase 3: Full kill switch implementation
 * Backed by agent_config table
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Checks if trading is enabled (kill switch is OFF)
 * Returns true if trading is allowed, false if kill switch is active
 */
export async function isTradingEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('agent_config')
      .select('agent_trading_enabled')
      .single();

    if (error || !data) {
      // Default to disabled if no config found
      return false;
    }

    return data.agent_trading_enabled ?? false;
  } catch (err) {
    console.error('[killSwitch] Error checking kill switch:', err);
    // Fail safe: default to disabled
    return false;
  }
}

/**
 * Sets the kill switch state
 */
export async function setKillSwitch(enabled: boolean): Promise<void> {
  try {
    const { error } = await supabase
      .from('agent_config')
      .upsert({
        id: '00000000-0000-0000-0000-000000000001',
        agent_trading_enabled: enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('[killSwitch] Error setting kill switch:', err);
    throw err;
  }
}

/**
 * Enables trading (turns kill switch OFF)
 */
export async function enableTrading(): Promise<void> {
  await setKillSwitch(true);
}

/**
 * Disables trading (turns kill switch ON)
 */
export async function disableTrading(): Promise<void> {
  await setKillSwitch(false);
}

/**
 * Cancels all agent orders (placeholder for Phase 4)
 */
export async function cancelAllAgentOrders(): Promise<void> {
  // TODO Phase 4: Implement order cancellation
  // - Query IBKR for open orders
  // - Cancel all orders placed by agent
  console.warn('[killSwitch] cancelAllAgentOrders() not yet implemented');
}
