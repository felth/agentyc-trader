// src/app/agent/decisions/page.tsx
// Decision & Audit Log Screen

/**
 * Phase 2: Decision & Audit Log Screen
 * TODO Phase 3: Add expandable brain breakdown view
 * TODO Phase 4: Add filtering and pagination
 */

"use client";

import React, { useEffect, useState } from 'react';
import SourceStatusBadge from '@/components/ui/SourceStatusBadge';

interface Decision {
  id: string;
  timestamp: Date;
  symbol?: string;
  direction?: 'BUY' | 'SELL';
  confidence?: number;
  safety?: any;
  userAction: 'approved' | 'rejected' | 'modified' | 'pending';
  reason?: string;
  result?: any;
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);

  useEffect(() => {
    fetchDecisions();
  }, []);

  async function fetchDecisions() {
    try {
      const res = await fetch('/api/agent/decisions?limit=100');
      const data = await res.json();
      if (data.ok) {
        setDecisions(data.decisions);
      }
    } catch (err) {
      console.error('Failed to fetch decisions:', err);
    } finally {
      setLoading(false);
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'approved': return 'text-green-500';
      case 'rejected': return 'text-red-500';
      case 'modified': return 'text-yellow-500';
      case 'pending': return 'text-white/60';
      default: return 'text-white/60';
    }
  };

  const getResultLabel = (result: any) => {
    if (!result) return 'N/A';
    if (result.filled) {
      return result.simulated ? 'SIMULATED' : 'EXECUTED';
    }
    return 'BLOCKED';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Decision & Audit Log</h1>
          <p className="text-white/60">All agent proposals and decisions</p>
        </div>

        {/* Decisions Table */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0A0A0A] border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Symbol</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Direction</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Mode</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Confidence</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Result</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80"></th>
                </tr>
              </thead>
              <tbody>
                {decisions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-white/60">
                      No decisions yet
                    </td>
                  </tr>
                ) : (
                  decisions.map((decision) => (
                    <tr
                      key={decision.id}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                      onClick={() => setSelectedDecision(decision)}
                    >
                      <td className="px-4 py-3 text-sm">
                        {new Date(decision.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">
                        {decision.symbol || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {decision.direction || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {decision.mode === 'live_assisted' ? 'LIVE' : decision.mode.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {decision.confidence ? `${(decision.confidence * 100).toFixed(0)}%` : 'N/A'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${getActionColor(decision.userAction)}`}>
                        {decision.userAction.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getResultLabel(decision.result)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        →
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Decision Detail Modal */}
        {selectedDecision && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setSelectedDecision(null)}>
            <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-2xl w-full mx-4 border border-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Decision Details</h2>
                <button onClick={() => setSelectedDecision(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-white/60 text-sm">Time</p>
                  <p className="text-white">{new Date(selectedDecision.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Symbol</p>
                  <p className="text-white">{selectedDecision.symbol || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Direction</p>
                  <p className="text-white">{selectedDecision.direction || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Mode</p>
                  <p className="text-white">{selectedDecision.mode === 'live_assisted' ? 'LIVE ASSISTED' : selectedDecision.mode.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">User Action</p>
                  <p className={`font-semibold ${getActionColor(selectedDecision.userAction)}`}>
                    {selectedDecision.userAction.toUpperCase()}
                  </p>
                </div>
                {selectedDecision.reason && (
                  <div>
                    <p className="text-white/60 text-sm">Reason</p>
                    <p className="text-white">{selectedDecision.reason}</p>
                  </div>
                )}
                {selectedDecision.result && (
                  <div>
                    <p className="text-white/60 text-sm">Result</p>
                    <pre className="text-white text-xs bg-[#0A0A0A] p-3 rounded overflow-auto">
                      {JSON.stringify(selectedDecision.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

