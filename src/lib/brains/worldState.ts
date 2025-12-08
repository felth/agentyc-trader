// src/lib/brains/worldState.ts
// World State Builder - Single source of truth for all brains

/**
 * Phase 3: Full world state implementation
 * Gathers market data, account state, positions, and system health
 */

import { getOhlcv, getLatestOhlc, type Timeframe } from '@/lib/data/ohlcv';
import { getIbkrPrice, getIbkrOverview, getIbkrPositions, getIbkrOrders } from '@/lib/data/ibkrBridge';
import type { WorldState } from './types';
import type { AgentContext } from '@/lib/memory/agentMemory';

export interface WorldStateParams {
  ticker: string;
  timeframe?: Timeframe;
  agentContext: AgentContext;
}

/**
 * Builds complete world state for a given ticker
 */
export async function buildWorldState(params: WorldStateParams): Promise<WorldState> {
  const { ticker, timeframe = 'H1', agentContext } = params;
  const now = new Date();

  // 1. Get market data (OHLCV)
  let ohlcData: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }> = [];
  let currentPrice = 0;
  let volatility = { atr: 0, atr_pct: 0 };

  try {
    const [{ candles }, latestOhlc] = await Promise.all([
      getOhlcv(ticker, timeframe),
      getLatestOhlc(ticker, timeframe).catch(() => null),
    ]);

    if (candles && candles.length > 0) {
      ohlcData = candles.slice(-100).map((c) => ({
        t: c.timestamp,
        o: c.open,
        h: c.high,
        l: c.low,
        c: c.close,
        v: c.volume || 0,
      }));

      // Current price from latest candle
      if (latestOhlc) {
        currentPrice = latestOhlc.close;
      } else if (ohlcData.length > 0) {
        currentPrice = ohlcData[ohlcData.length - 1].c;
      }

      // Calculate ATR (Average True Range) for volatility
      if (ohlcData.length >= 14) {
        const trueRanges: number[] = [];
        for (let i = 1; i < ohlcData.length; i++) {
          const prev = ohlcData[i - 1];
          const curr = ohlcData[i];
          const tr = Math.max(
            curr.h - curr.l,
            Math.abs(curr.h - prev.c),
            Math.abs(curr.l - prev.c)
          );
          trueRanges.push(tr);
        }
        const atr = trueRanges.slice(-14).reduce((a, b) => a + b, 0) / 14;
        volatility = {
          atr,
          atr_pct: currentPrice > 0 ? (atr / currentPrice) * 100 : 0,
        };
      }
    }
  } catch (err) {
    console.error('[buildWorldState] Error fetching OHLCV:', err);
  }

  // 2. Get IBKR account data
  let accountData = {
    accountId: 'unknown',
    balance: 0,
    equity: 0,
    unrealizedPnl: 0,
    buyingPower: 0,
    dailyPnL: 0,
    openRiskPercent: 0,
  };

  try {
    const overview = await getIbkrOverview();
    accountData = {
      accountId: 'ibkr',
      balance: overview.cash || 0,
      equity: overview.equity || 0,
      unrealizedPnl: overview.pnl_unrealized || 0,
      buyingPower: overview.margin_available || 0,
      dailyPnL: overview.pnl_day || 0,
      openRiskPercent: 0, // Calculate from positions
    };
  } catch (err) {
    console.error('[buildWorldState] Error fetching IBKR overview:', err);
  }

  // 3. Get positions
  let positions: WorldState['positions'] = [];
  try {
    const posData = await getIbkrPositions();
    if (posData.ok && posData.positions) {
      positions = posData.positions.map((p) => ({
        symbol: p.symbol || '',
        quantity: p.quantity || 0,
        avgPrice: p.avgPrice || 0,
        marketPrice: p.marketPrice || 0,
        unrealizedPnl: p.unrealizedPnl || 0,
        exposure: (p.quantity || 0) * (p.marketPrice || 0),
      }));

      // Calculate open risk percent
      const totalExposure = positions.reduce((sum, p) => sum + Math.abs(p.exposure), 0);
      accountData.openRiskPercent = accountData.equity > 0 
        ? (totalExposure / accountData.equity) * 100 
        : 0;
    }
  } catch (err) {
    console.error('[buildWorldState] Error fetching positions:', err);
  }

  // 4. Get orders
  let orders: WorldState['orders'] = [];
  try {
    const orderData = await getIbkrOrders();
    if (orderData.ok && orderData.orders) {
      orders = orderData.orders.map((o) => ({
        id: o.id || '',
        symbol: o.symbol || '',
        side: (o.side === 'BUY' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
        quantity: o.quantity || 0,
        orderType: 'LIMIT', // Default
        status: o.status || 'unknown',
      }));
    }
  } catch (err) {
    console.error('[buildWorldState] Error fetching orders:', err);
  }

  // 5. Build memory context from agentContext
  const memory = {
    corpus: agentContext.corpusChunks.map((c) => ({
      concept: c.text,
      relevance: c.score,
    })),
    playbook: agentContext.playbookChunks.map((p) => ({
      rule: p.text,
      relevance: p.score,
    })),
    recentTrades: agentContext.recentTrades.map((t) => ({
      symbol: t.ticker,
      outcome: t.pnl_usd > 0 ? 'win' as const : t.pnl_usd < 0 ? 'loss' as const : 'breakeven' as const,
      timestamp: new Date(t.opened_at),
    })),
  };

  // 6. Build user state from agentContext
  const user = {
    journalEntries: [], // TODO: Load from Supabase if needed
    overrideHistory: agentContext.agentDecisions
      .filter((d) => d.decision_type === 'APPROVE' || d.decision_type === 'REJECT')
      .map((d) => ({
        action: d.decision_type === 'APPROVE' ? 'approved' as const : 'rejected' as const,
        timestamp: new Date(d.created_at),
      })),
    sessionLength: 0, // TODO: Track session
    recentLosses: agentContext.psychologySignals.recent_loss_streak,
    timeOfDay: getTimeOfDay(now),
  };

  // 7. Calculate trend and regime
  const trend = calculateTrend(ohlcData);
  const regime = calculateRegime(ohlcData, volatility);

  // 8. Build market indicators
  const indicators: Record<string, unknown> = {
    trend,
    regime,
    volatility,
    sma20: calculateSMA(ohlcData, 20),
    sma50: calculateSMA(ohlcData, 50),
  };

  // 9. Build system state
  const system = {
    dataFreshness: {
      market: 0, // Assume fresh for now
      account: 0,
      positions: 0,
    },
    ibkrConnected: true, // TODO: Check actual connection
    ibkrAuthenticated: true, // TODO: Check actual auth
  };

  return {
    market: {
      prices: { [ticker]: currentPrice },
      volumes: { [ticker]: ohlcData.length > 0 ? ohlcData[ohlcData.length - 1].v : 0 },
      indicators,
      volatility: { [ticker]: volatility.atr_pct },
      newsSentiment: undefined, // TODO: Integrate news sentiment
    },
    account: accountData,
    positions,
    orders,
    memory,
    user,
    system,
    timestamp: now,
  };
}

/**
 * Calculates trend direction and strength
 */
function calculateTrend(
  ohlc: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>
): { direction: 'UP' | 'DOWN' | 'SIDEWAYS'; strength: number } {
  if (ohlc.length < 20) {
    return { direction: 'SIDEWAYS', strength: 0 };
  }

  const recent = ohlc.slice(-20);
  const first = recent[0].c;
  const last = recent[recent.length - 1].c;
  const change = ((last - first) / first) * 100;

  const sma20 = calculateSMA(recent, 20);
  const priceVsSMA = last > sma20 ? 1 : -1;

  if (Math.abs(change) < 1) {
    return { direction: 'SIDEWAYS', strength: Math.abs(change) / 10 };
  }

  return {
    direction: change > 0 ? 'UP' : 'DOWN',
    strength: Math.min(Math.abs(change) / 10, 1),
  };
}

/**
 * Calculates market regime
 */
function calculateRegime(
  ohlc: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>,
  volatility: { atr: number; atr_pct: number }
): { label: string; risk_off: boolean; event_risk: boolean } {
  const volPct = volatility.atr_pct;
  
  let label = 'NORMAL';
  let risk_off = false;
  let event_risk = false;

  if (volPct > 3) {
    label = 'HIGH_VOL';
    event_risk = true;
  } else if (volPct < 0.5) {
    label = 'LOW_VOL';
  }

  // Check for risk-off (VIX-like behavior)
  if (ohlc.length > 0) {
    const recent = ohlc.slice(-5);
    const allDown = recent.every((c) => c.c < c.o);
    if (allDown && volPct > 2) {
      risk_off = true;
      label = 'RISK_OFF';
    }
  }

  return { label, risk_off, event_risk };
}

/**
 * Calculates Simple Moving Average
 */
function calculateSMA(
  ohlc: Array<{ t: string; o: number; h: number; l: number; c: number; v: number }>,
  period: number
): number {
  if (ohlc.length < period) return 0;
  const recent = ohlc.slice(-period);
  const sum = recent.reduce((acc, c) => acc + c.c, 0);
  return sum / period;
}

/**
 * Gets time of day category
 */
function getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}
