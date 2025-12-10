// src/app/agent/control/page.tsx
// Agent Control Panel - Fully wired with real backend

/**
 * Phase 5: Fully wired Agent Control Panel
 */

"use client";

import React, { useEffect, useState } from 'react';
import SourceStatusBadge from '@/components/ui/SourceStatusBadge';
import Link from 'next/link';

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

  const allBrainsGreen = status.brains.market.state === 'green' &&
                         status.brains.risk.state === 'green' &&
                         status.brains.psychology.state === 'green';

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const dayStr = now.toLocaleDateString('en-US', { weekday: 'long' });
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 pt-6 pb-10 lg:pb-12">
        <div className="relative min-h-[50vh] md:min-h-[60vh] rounded-[2rem] overflow-hidden -mx-4 sm:-mx-6 lg:-mx-8">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "url('/hero-journal.jpeg')" }}
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          <div className="relative h-full flex flex-col px-6 py-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white/90 tracking-tight">AGENTYC</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="w-8 h-8 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <span className="text-sm">🔍</span>
                </button>
                <Link
                  href="/profile"
                  className="w-8 h-8 rounded-full backdrop-blur-sm border bg-white/5 border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  aria-label="Settings"
                >
                  <span className="text-sm">⚙️</span>
                </Link>
              </div>
            </div>

            {/* Content */}
            <div className="mt-auto">
              <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-ultra-accent mb-2">Agent Control</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">Control Panel</h1>
              <p className="text-sm text-white/70">{dayStr} · {dateStr}</p>
              <p className="text-xs text-white/60 mt-1">{time}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="px-6 pb-32 flex flex-col gap-9 max-w-6xl mx-auto w-full">

        <div className="space-y-6">
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
              {status.mode === 'learn' && ' - Analysis only, no execution'}
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
                  ? 'Agent can execute trades in PAPER and LIVE_ASSISTED modes'
                  : 'ALL executions are blocked (kill switch active)'}
              </p>
            </div>
            {!status.killSwitch.enabled && (status.mode === 'paper' || status.mode === 'live_assisted') && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-sm text-red-400 font-semibold">⚠️ KILL SWITCH ON – All execution blocked</p>
              </div>
            )}
          </div>

          {/* Brain Status */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Brain Status</h2>
              {allBrainsGreen && (
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm font-semibold rounded-lg">
                  ALL GREEN
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {(['market', 'risk', 'psychology'] as const).map((brain) => {
                const brainState = status.brains[brain];
                return (
                  <div key={brain} className="bg-[#0A0A0A] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getStateColor(brainState.state)}`} />
                      <span className="font-semibold capitalize">{brain} Brain</span>
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
            {!allBrainsGreen && (
              <p className="mt-4 text-sm text-amber-400">
                ⚠️ Not all brains are GREEN – trades may be blocked or require caution
              </p>
            )}
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
                <span className={`text-sm uppercase ${
                  status.health.bridge === 'ok' ? 'text-green-400' :
                  status.health.bridge === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {status.health.bridge}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/80">IBeam</span>
                <span className={`text-sm uppercase ${
                  status.health.ibeam === 'ok' ? 'text-green-400' :
                  status.health.ibeam === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {status.health.ibeam}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="/agent/decisions"
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
              >
                View Audit Log
              </Link>
              <Link
                href="/agent/settings"
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg font-medium transition"
              >
                Risk Settings
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
