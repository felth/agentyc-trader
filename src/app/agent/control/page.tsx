// src/app/agent/control/page.tsx
// Agent Control Panel - Mode selector, kill switch, brain status, system health

/**
 * Phase 2: Agent Control Panel UI
 * TODO Phase 3: Wire up actual brain status updates
 * TODO Phase 4: Add real-time updates
 */

"use client";

import React, { useEffect, useState } from 'react';
import SourceStatusBadge from '@/components/ui/SourceStatusBadge';

interface AgentStatus {
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  killSwitch: { enabled: boolean };
  brains: {
    market: { state: 'green' | 'amber' | 'red'; lastUpdate?: Date };
    risk: { state: 'green' | 'amber' | 'red'; lastUpdate?: Date };
    psychology: { state: 'green' | 'amber' | 'red'; lastUpdate?: Date };
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
}

export default function AgentControlPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modeChanging, setModeChanging] = useState(false);
  const [killSwitchToggling, setKillSwitchToggling] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/agent/status');
      const data = await res.json();
      if (data.ok) {
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch agent status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function changeMode(mode: 'off' | 'learn' | 'paper' | 'live_assisted') {
    setModeChanging(true);
    try {
      const res = await fetch('/api/agent/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchStatus();
      } else {
        alert(`Failed to change mode: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to change mode');
    } finally {
      setModeChanging(false);
    }
  }

  async function toggleKillSwitch() {
    if (!status) return;
    
    const newState = !status.killSwitch.enabled;
    if (newState && !confirm('Enable trading? This will allow LIVE mode to execute real trades.')) {
      return;
    }
    if (!newState && !confirm('Disable trading? This will prevent ALL executions (kill switch).')) {
      return;
    }
    
    setKillSwitchToggling(true);
    try {
      const res = await fetch('/api/agent/kill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchStatus();
      } else {
        alert(`Failed to toggle kill switch: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to toggle kill switch');
    } finally {
      setKillSwitchToggling(false);
    }
  }

  if (loading || !status) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const getStateColor = (state: 'green' | 'amber' | 'red') => {
    switch (state) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agent Control</h1>
        <p className="text-white/60">Multi-Brain Trading Agent Control Panel</p>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Mode Selector */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Trading Mode</h2>
          <div className="flex gap-4 flex-wrap">
            {(['off', 'learn', 'paper', 'live_assisted'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => changeMode(mode)}
                disabled={modeChanging || status.mode === mode}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  status.mode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                } disabled:opacity-50`}
              >
                {mode === 'live_assisted' ? 'LIVE ASSISTED' : mode.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/60">
            Current mode: <span className="font-semibold">{status.mode === 'live_assisted' ? 'LIVE ASSISTED' : status.mode.toUpperCase()}</span>
            {status.mode === 'off' && ' - Agent disabled, no proposals or executions'}
            {status.mode === 'learn' && ' - Advisory only, no execution'}
            {status.mode === 'paper' && ' - Simulated execution'}
            {status.mode === 'live_assisted' && ' - Real execution with explicit approval'}
          </p>
        </div>

        {/* Kill Switch */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Kill Switch</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleKillSwitch}
              disabled={killSwitchToggling}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition ${
                status.killSwitch.enabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } disabled:opacity-50`}
            >
              {status.killSwitch.enabled ? 'TRADING ENABLED' : 'TRADING DISABLED'}
            </button>
            <p className="text-sm text-white/60">
              {status.killSwitch.enabled
                ? 'Agent can execute trades in LIVE mode'
                : 'ALL executions are blocked'}
            </p>
          </div>
        </div>

        {/* Brain Status */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Brain Status</h2>
          <div className="grid grid-cols-3 gap-4">
            {(['market', 'risk', 'psychology'] as const).map((brain) => {
              const brainState = status.brains[brain];
              return (
                <div key={brain} className="bg-[#0A0A0A] rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-3 h-3 rounded-full ${getStateColor(brainState.state)}`} />
                    <span className="font-semibold capitalize">{brain}</span>
                  </div>
                  <p className="text-sm text-white/60">
                    State: <span className="font-semibold uppercase">{brainState.state}</span>
                  </p>
                  {brainState.lastUpdate && (
                    <p className="text-xs text-white/40 mt-1">
                      Updated: {new Date(brainState.lastUpdate).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-semibold mb-4">System Health</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80">Data Integrity</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStateColor(status.safety.dataIntegrity)}`} />
                <span className="text-sm uppercase">{status.safety.dataIntegrity}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">IBKR Connection</span>
              <SourceStatusBadge
                provider="IBKR"
                status={status.safety.ibkrConnected && status.safety.ibkrAuthenticated ? 'LIVE' : 'ERROR'}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">Bridge</span>
              <span className="text-sm uppercase">{status.health.bridge}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/80">IBeam</span>
              <span className="text-sm uppercase">{status.health.ibeam}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

