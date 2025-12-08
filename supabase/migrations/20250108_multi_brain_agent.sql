-- Multi-Brain Trading Agent - Database Schema
-- Phase 2: Core tables for agent configuration, decisions, metrics, and telemetry

-- Agent configuration table
CREATE TABLE IF NOT EXISTS agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'learn' CHECK (mode IN ('learn', 'paper', 'live')),
  max_risk_per_trade NUMERIC DEFAULT 500,
  daily_loss_limit NUMERIC DEFAULT 2000,
  allowed_symbols TEXT[] DEFAULT ARRAY[]::TEXT[],
  psychology_mode TEXT DEFAULT 'normal' CHECK (psychology_mode IN ('aggressive', 'normal', 'cautious')),
  agent_trading_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id) -- Only one config row
);

-- Insert default config if none exists
INSERT INTO agent_config (id, mode, agent_trading_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', 'learn', false)
ON CONFLICT (id) DO NOTHING;

-- Agent decisions audit log
CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  symbol TEXT,
  action TEXT CHECK (action IN ('propose', 'approve', 'reject', 'execute')),
  direction TEXT CHECK (direction IN ('BUY', 'SELL')),
  brains JSONB, -- Full brain outputs
  confidence NUMERIC, -- 0-1 scale
  safety JSONB, -- Safety check results
  user_action TEXT CHECK (user_action IN ('approved', 'rejected', 'modified', 'pending')),
  user_reason TEXT,
  proposal JSONB, -- Full trade proposal (entry, stop, target, size, etc.)
  result JSONB, -- Execution result (filled, fill_price, pnl, etc.)
  mode TEXT CHECK (mode IN ('learn', 'paper', 'live')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Brain metrics table
CREATE TABLE IF NOT EXISTS brain_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  brain_name TEXT NOT NULL CHECK (brain_name IN ('market', 'risk', 'psychology')),
  state TEXT NOT NULL CHECK (state IN ('green', 'amber', 'red')),
  confidence NUMERIC, -- 0-1 scale
  reasoning TEXT,
  inputs_snapshot JSONB,
  latency_ms INTEGER, -- Processing time in milliseconds
  created_at TIMESTAMPTZ DEFAULT now()
);

-- System telemetry table
CREATE TABLE IF NOT EXISTS system_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  metric_type TEXT NOT NULL, -- 'data_integrity', 'brain_consensus', 'drift', 'ibkr_status', etc.
  metric_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_decisions_timestamp ON agent_decisions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_symbol ON agent_decisions(symbol);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_user_action ON agent_decisions(user_action);
CREATE INDEX IF NOT EXISTS idx_brain_metrics_timestamp ON brain_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_brain_metrics_brain_name ON brain_metrics(brain_name);
CREATE INDEX IF NOT EXISTS idx_system_telemetry_timestamp ON system_telemetry(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_telemetry_type ON system_telemetry(metric_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent_config
DROP TRIGGER IF EXISTS update_agent_config_updated_at ON agent_config;
CREATE TRIGGER update_agent_config_updated_at
  BEFORE UPDATE ON agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

