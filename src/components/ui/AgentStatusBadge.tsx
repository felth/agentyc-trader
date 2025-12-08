// src/components/ui/AgentStatusBadge.tsx
// Agent Status Badge - Shows mode and kill switch status

"use client";

import React, { useEffect, useState } from 'react';

interface AgentStatus {
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  killSwitch: { enabled: boolean };
}

export default function AgentStatusBadge() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading || !status) {
    return null;
  }

  const modeLabel = status.mode === 'live_assisted' ? 'LIVE' : status.mode.toUpperCase();
  const modeColor = status.mode === 'off' ? 'bg-gray-500' :
                    status.mode === 'learn' ? 'bg-blue-500' :
                    status.mode === 'paper' ? 'bg-yellow-500' : 'bg-green-500';

  const killSwitchColor = status.killSwitch.enabled ? 'bg-green-500' : 'bg-red-500';
  const killSwitchLabel = status.killSwitch.enabled ? 'ON' : 'OFF';

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${modeColor}`} />
        <span className="text-white/70">Agent: {modeLabel}</span>
      </div>
      {(status.mode === 'paper' || status.mode === 'live_assisted') && (
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${killSwitchColor}`} />
          <span className="text-white/70">Kill: {killSwitchLabel}</span>
        </div>
      )}
    </div>
  );
}

