// src/lib/validation/paperTrading.ts
// Paper Trading - Simulated execution engine

/**
 * Phase 3: Full paper trading implementation
 */

import { createClient } from '@supabase/supabase-js';
import type { TradeProposal } from '../safety/safetyChecks';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Executes a paper trade (simulated)
 */
export async function executePaperTrade(
  proposal: TradeProposal
): Promise<{
  filled: boolean;
  fillPrice: number;
  fillQuantity: number;
  simulated: boolean;
  tradeId?: string;
}> {
  try {
    // Simulate fill at entry price (or slightly worse for realism)
    const fillPrice = proposal.entry.price || proposal.entry.zone?.min || 0;
    const fillQuantity = proposal.size.units;

    // Add slight slippage simulation (0.1% for market orders, 0% for limit)
    const slippage = proposal.entry.type === 'MARKET' ? 0.001 : 0;
    const adjustedFillPrice = proposal.side === 'LONG'
      ? fillPrice * (1 + slippage)
      : fillPrice * (1 - slippage);

    // Insert paper trade into trades table
    const { data: tradeData, error: tradeError } = await supabase
      .from('trades')
      .insert({
        symbol: proposal.ticker,
        direction: proposal.side === 'LONG' ? 'BUY' : 'SELL',
        quantity: fillQuantity,
        entry_price: adjustedFillPrice,
        status: 'open',
        is_paper: true,
        opened_at: new Date().toISOString(),
        source: 'AGENT',
        mode: proposal.mode,
      })
      .select('id')
      .single();

    if (tradeError) {
      throw tradeError;
    }

    return {
      filled: true,
      fillPrice: adjustedFillPrice,
      fillQuantity,
      simulated: true,
      tradeId: tradeData.id,
    };
  } catch (err) {
    console.error('[paperTrading] Error executing paper trade:', err);
    throw err;
  }
}

/**
 * Closes a paper trade (simulated)
 */
export async function closePaperTrade(
  tradeId: string,
  exitPrice: number
): Promise<{
  closed: boolean;
  pnl: number;
}> {
  try {
    // Get the trade
    const { data: trade, error: fetchError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .single();

    if (fetchError || !trade) {
      throw new Error('Trade not found');
    }

    // Calculate PnL
    const entryPrice = trade.entry_price || 0;
    const quantity = trade.quantity || 0;
    const pnl = trade.direction === 'BUY'
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;

    // Update trade
    const { error: updateError } = await supabase
      .from('trades')
      .update({
        exit_price: exitPrice,
        status: 'closed',
        closed_at: new Date().toISOString(),
        pnl: pnl,
        realized_pnl: pnl,
      })
      .eq('id', tradeId);

    if (updateError) {
      throw updateError;
    }

    return {
      closed: true,
      pnl,
    };
  } catch (err) {
    console.error('[paperTrading] Error closing paper trade:', err);
    throw err;
  }
}
