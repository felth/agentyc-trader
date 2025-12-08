// src/lib/memory/agentMemory.ts
// Central Memory Layer - Unified interface for Pinecone + Supabase

/**
 * Phase 3: Full memory layer implementation
 * Brains should ONLY use this layer, never call Supabase/Pinecone directly
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { AgentMode } from '@/lib/agent/agentMode';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type MemoryNamespace = 'corpus' | 'playbook' | 'trades';

export interface AgentContext {
  userId?: string;
  mode: AgentMode;
  ticker?: string;
  timeframe?: string;
  now: Date;

  // Risk & config
  config: {
    risk_per_trade_pct: number;
    max_open_positions: number;
    max_position_size_usd: number;
    allowed_symbols: string[];
    allow_overnight: boolean;
    psychology_mode: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
    daily_loss_limit: number;
    max_risk_per_trade: number;
  };

  // Historical / behavioural data
  recentTrades: Array<{
    id: string;
    ticker: string;
    side: 'LONG' | 'SHORT';
    size: number;
    pnl_usd: number;
    opened_at: string;
    closed_at?: string;
    is_paper: boolean;
  }>;

  agentDecisions: Array<{
    id: string;
    ticker: string;
    mode: AgentMode;
    decision_type: 'PROPOSE' | 'APPROVE' | 'REJECT' | 'PAPER_EXECUTE' | 'LIVE_EXECUTE' | 'HYPOTHETICAL';
    outcome?: 'WIN' | 'LOSS' | 'OPEN' | 'CANCELLED';
    confidence: number;
    risk_score: number;
    created_at: string;
  }>;

  // Vector memory slices
  playbookChunks: Array<{ id: string; text: string; score: number; metadata?: any }>;
  corpusChunks: Array<{ id: string; text: string; score: number; metadata?: any }>;

  // User psychology indicators
  psychologySignals: {
    recent_loss_streak: number;
    recent_win_streak: number;
    avg_holding_time_minutes: number;
    overnight_bias: 'AVOID' | 'NEUTRAL' | 'SEEKS';
    fatigue_score?: number;
  };
}

export interface AgentContextParams {
  userId?: string;
  ticker?: string;
  timeframe?: string;
  mode: AgentMode;
  maxItems?: number;
}

/**
 * Gets unified agent context from memory systems
 * This is the single function brains should call for memory access
 */
export async function getAgentContext(params: AgentContextParams): Promise<AgentContext> {
  const { userId, ticker, timeframe, mode, maxItems = 50 } = params;
  const now = new Date();

  // 1. Load agent config from Supabase
  const { data: configData } = await supabase
    .from('agent_config')
    .select('*')
    .single();

  const config = {
    risk_per_trade_pct: (configData?.max_risk_per_trade || 500) / 10000, // Assume 10k account for now
    max_open_positions: 5, // Default
    max_position_size_usd: 10000, // Default
    allowed_symbols: configData?.allowed_symbols || [],
    allow_overnight: configData?.allow_overnight ?? false,
    psychology_mode: (configData?.psychology_mode?.toUpperCase() || 'BALANCED') as 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE',
    daily_loss_limit: Number(configData?.daily_loss_limit) || 2000,
    max_risk_per_trade: Number(configData?.max_risk_per_trade) || 500,
  };

  // 2. Load recent trades from Supabase
  let recentTrades: AgentContext['recentTrades'] = [];
  try {
    const { data: tradesData } = await supabase
      .from('trades')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(maxItems);

    if (tradesData) {
      recentTrades = tradesData.map((t: any) => ({
        id: t.id || '',
        ticker: t.symbol || t.ticker || '',
        side: (t.side === 'BUY' || t.side === 'LONG' ? 'LONG' : 'SHORT') as 'LONG' | 'SHORT',
        size: Number(t.quantity || t.size || 0),
        pnl_usd: Number(t.pnl || t.realized_pnl || 0),
        opened_at: t.opened_at || t.created_at || '',
        closed_at: t.closed_at || undefined,
        is_paper: t.is_paper ?? false,
      }));
    }
  } catch (err) {
    console.error('[agentMemory] Error loading trades:', err);
  }

  // 3. Load agent decisions from Supabase
  let agentDecisions: AgentContext['agentDecisions'] = [];
  try {
    const { data: decisionsData } = await supabase
      .from('agent_decisions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(maxItems);

    if (decisionsData) {
      agentDecisions = decisionsData.map((d: any) => ({
        id: d.id || '',
        ticker: d.symbol || '',
        mode: (d.mode || 'off') as AgentMode,
        decision_type: (d.action || 'PROPOSE') as AgentContext['agentDecisions'][0]['decision_type'],
        outcome: d.result?.outcome as AgentContext['agentDecisions'][0]['outcome'],
        confidence: Number(d.confidence || 0),
        risk_score: Number(d.safety?.risk_score || 0),
        created_at: d.created_at || d.timestamp || '',
      }));
    }
  } catch (err) {
    console.error('[agentMemory] Error loading decisions:', err);
  }

  // 4. Query Pinecone for playbook and corpus
  let playbookChunks: AgentContext['playbookChunks'] = [];
  let corpusChunks: AgentContext['corpusChunks'] = [];

  if (ticker || timeframe) {
    try {
      const queryText = ticker 
        ? `Trading rules and strategies for ${ticker}${timeframe ? ` on ${timeframe} timeframe` : ''}`
        : 'General trading rules and strategies';

      // Generate embedding for query
      const embedRes = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: queryText,
      });

      const queryVector = embedRes.data[0]?.embedding || [];

      if (queryVector.length > 0) {
        const index = pc.index(process.env.PINECONE_INDEX!, process.env.PINECONE_HOST!);

        // Query for playbook (source = "playbook")
        const playbookQuery = await index.query({
          vector: queryVector,
          topK: 10,
          includeMetadata: true,
          filter: {
            source: { $eq: 'playbook' },
          },
        });

        playbookChunks = (playbookQuery.matches || []).map((match: any) => ({
          id: match.id || '',
          text: match.metadata?.notes || match.metadata?.concept || '',
          score: match.score || 0,
          metadata: match.metadata,
        }));

        // Query for corpus (general knowledge, not playbook)
        const corpusQuery = await index.query({
          vector: queryVector,
          topK: 10,
          includeMetadata: true,
          filter: {
            source: { $ne: 'playbook' },
          },
        });

        corpusChunks = (corpusQuery.matches || []).map((match: any) => ({
          id: match.id || '',
          text: match.metadata?.notes || match.metadata?.concept || '',
          score: match.score || 0,
          metadata: match.metadata,
        }));
      }
    } catch (err) {
      console.error('[agentMemory] Error querying Pinecone:', err);
    }
  }

  // 5. Derive psychology signals from trades + decisions
  const psychologySignals = derivePsychologySignals(recentTrades, agentDecisions);

  return {
    userId,
    mode,
    ticker,
    timeframe,
    now,
    config,
    recentTrades,
    agentDecisions,
    playbookChunks,
    corpusChunks,
    psychologySignals,
  };
}

/**
 * Derives psychology signals from trade history
 */
function derivePsychologySignals(
  trades: AgentContext['recentTrades'],
  decisions: AgentContext['agentDecisions']
): AgentContext['psychologySignals'] {
  const closedTrades = trades.filter(t => t.closed_at);
  
  // Calculate streaks
  let recent_loss_streak = 0;
  let recent_win_streak = 0;
  
  for (const trade of closedTrades.slice(0, 10)) {
    if (trade.pnl_usd > 0) {
      if (recent_loss_streak > 0) break;
      recent_win_streak++;
    } else if (trade.pnl_usd < 0) {
      if (recent_win_streak > 0) break;
      recent_loss_streak++;
    }
  }

  // Calculate avg holding time
  let totalMinutes = 0;
  let count = 0;
  for (const trade of closedTrades) {
    if (trade.opened_at && trade.closed_at) {
      const opened = new Date(trade.opened_at);
      const closed = new Date(trade.closed_at);
      const minutes = (closed.getTime() - opened.getTime()) / (1000 * 60);
      if (minutes > 0 && minutes < 10080) { // Less than 7 days
        totalMinutes += minutes;
        count++;
      }
    }
  }
  const avg_holding_time_minutes = count > 0 ? totalMinutes / count : 0;

  // Determine overnight bias
  let overnight_bias: 'AVOID' | 'NEUTRAL' | 'SEEKS' = 'NEUTRAL';
  // Simple heuristic: if most trades close same day, bias is AVOID
  if (avg_holding_time_minutes < 1440) { // Less than 24 hours
    overnight_bias = 'AVOID';
  } else if (avg_holding_time_minutes > 4320) { // More than 3 days
    overnight_bias = 'SEEKS';
  }

  return {
    recent_loss_streak,
    recent_win_streak,
    avg_holding_time_minutes,
    overnight_bias,
    fatigue_score: 0, // TODO: Implement fatigue scoring
  };
}

/**
 * Gets Pinecone index for a specific namespace
 */
export function getPineconeIndex(namespace: MemoryNamespace) {
  const indexName = process.env.PINECONE_INDEX!;
  const host = process.env.PINECONE_HOST!;
  return pc.index(indexName, host);
}

/**
 * Stores a vector in Pinecone with namespace metadata
 */
export async function storeInMemory(
  namespace: MemoryNamespace,
  id: string,
  vector: number[],
  metadata: {
    text: string;
    concept?: string;
    source?: string;
    [key: string]: any;
  }
): Promise<void> {
  const index = getPineconeIndex(namespace);
  
  await index.upsert([
    {
      id,
      values: vector,
      metadata: {
        ...metadata,
        namespace,
        source: metadata.source || namespace,
      },
    },
  ]);
}

/**
 * Queries memory for relevant entries
 */
export async function queryMemory(
  namespace: MemoryNamespace,
  queryVector: number[],
  topK: number = 10,
  filter?: Record<string, any>
): Promise<Array<{
  id: string;
  score: number;
  metadata: any;
}>> {
  const index = getPineconeIndex(namespace);
  
  const query = await index.query({
    vector: queryVector,
    topK,
    includeMetadata: true,
    filter: filter || {
      namespace: { $eq: namespace },
    },
  });

  return (query.matches || []).map((match: any) => ({
    id: match.id || '',
    score: match.score || 0,
    metadata: match.metadata || {},
  }));
}
