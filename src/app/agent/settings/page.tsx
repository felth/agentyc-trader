// src/app/agent/settings/page.tsx
// Risk Settings UI - Agent risk profile configuration

/**
 * Phase 2: Risk Settings UI
 * TODO Phase 3: Wire up to riskBrain and safetyChecks
 */

"use client";

import React, { useEffect, useState } from 'react';

interface AgentConfig {
  max_risk_per_trade: number;
  daily_loss_limit: number;
  allowed_symbols: string[];
  psychology_mode: 'aggressive' | 'normal' | 'cautious';
  allow_overnight: boolean;
}

export default function AgentSettingsPage() {
  const [config, setConfig] = useState<AgentConfig>({
    max_risk_per_trade: 500,
    daily_loss_limit: 2000,
    allowed_symbols: [],
    psychology_mode: 'normal',
    allow_overnight: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const res = await fetch('/api/agent/mode');
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const res = await fetch('/api/agent/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'off', // Don't change mode, just update config
          ...config,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        alert('Settings saved');
      } else {
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  function addSymbol() {
    if (newSymbol.trim() && !config.allowed_symbols.includes(newSymbol.toUpperCase())) {
      setConfig({
        ...config,
        allowed_symbols: [...config.allowed_symbols, newSymbol.toUpperCase()],
      });
      setNewSymbol('');
    }
  }

  function removeSymbol(symbol: string) {
    setConfig({
      ...config,
      allowed_symbols: config.allowed_symbols.filter(s => s !== symbol),
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Agent Risk Settings</h1>
          <p className="text-white/60">Configure risk limits and trading parameters</p>
        </div>

        <div className="space-y-6">
          {/* Max Risk Per Trade */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Max Risk Per Trade</h2>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={config.max_risk_per_trade}
                onChange={(e) => setConfig({ ...config, max_risk_per_trade: parseFloat(e.target.value) || 0 })}
                className="bg-[#0A0A0A] border border-white/20 rounded-lg px-4 py-2 text-white w-32"
                min="0"
                step="10"
              />
              <span className="text-white/60">USD</span>
            </div>
            <p className="text-sm text-white/60 mt-2">
              Maximum dollar amount at risk per trade. Used by RiskBrain for position sizing.
            </p>
          </div>

          {/* Daily Loss Limit */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Daily Loss Limit</h2>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={config.daily_loss_limit}
                onChange={(e) => setConfig({ ...config, daily_loss_limit: parseFloat(e.target.value) || 0 })}
                className="bg-[#0A0A0A] border border-white/20 rounded-lg px-4 py-2 text-white w-32"
                min="0"
                step="100"
              />
              <span className="text-white/60">USD</span>
            </div>
            <p className="text-sm text-white/60 mt-2">
              Maximum daily loss before agent stops trading. Enforced by SafetyChecks.
            </p>
          </div>

          {/* Allowed Symbols */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Allowed Symbols</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
                placeholder="Enter symbol (e.g., AAPL)"
                className="flex-1 bg-[#0A0A0A] border border-white/20 rounded-lg px-4 py-2 text-white"
              />
              <button
                onClick={addSymbol}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
              >
                Add
              </button>
            </div>
            {config.allowed_symbols.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {config.allowed_symbols.map((symbol) => (
                  <div
                    key={symbol}
                    className="flex items-center gap-2 bg-[#0A0A0A] px-3 py-1 rounded-lg"
                  >
                    <span>{symbol}</span>
                    <button
                      onClick={() => removeSymbol(symbol)}
                      className="text-red-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/60">No restrictions - all symbols allowed</p>
            )}
            <p className="text-sm text-white/60 mt-2">
              If empty, all symbols are allowed. If populated, agent will only propose trades for these symbols.
            </p>
          </div>

          {/* Psychology Mode */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Psychology Mode</h2>
            <div className="flex gap-4">
              {(['aggressive', 'normal', 'cautious'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setConfig({ ...config, psychology_mode: mode })}
                  className={`px-6 py-3 rounded-lg font-medium transition ${
                    config.psychology_mode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-sm text-white/60 mt-2">
              Affects PsychologyBrain sensitivity to tilt, fatigue, and risk factors.
            </p>
          </div>

          {/* Allow Overnight */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Overnight Positions</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setConfig({ ...config, allow_overnight: !config.allow_overnight })}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  config.allow_overnight
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {config.allow_overnight ? 'Allowed' : 'Intraday Only'}
              </button>
            </div>
            <p className="text-sm text-white/60 mt-2">
              {config.allow_overnight
                ? 'Agent can propose positions that may be held overnight.'
                : 'Agent will only propose intraday positions (close before market close).'}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-white/10 disabled:text-white/40 rounded-lg font-semibold transition"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

