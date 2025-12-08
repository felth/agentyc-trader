// src/app/agent/decisions/page.tsx
// Decision & Audit Log Screen - Fully wired

/**
 * Phase 5: Full decision & audit log implementation
 */

"use client";

import React, { useEffect, useState } from 'react';

interface Decision {
  id: string;
  timestamp: Date | string;
  symbol?: string;
  direction?: 'BUY' | 'SELL';
  confidence?: number;
  safety?: any;
  userAction: 'approved' | 'rejected' | 'modified' | 'pending';
  reason?: string;
  result?: any;
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  proposal?: any;
  brains?: any;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [filter, setFilter] = useState<{
    mode?: string;
    action?: string;
  }>({});

  useEffect(() => {
    fetchDecisions();
  }, [filter]);

  async function fetchDecisions() {
    try {
      let url = '/api/agent/decisions?limit=100';
      if (filter.mode) url += `&mode=${filter.mode}`;
      if (filter.action) url += `&user_action=${filter.action}`;
      
      const res = await fetch(url);
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

  const getOutcomeType = (decision: Decision) => {
    if (decision.mode === 'learn' && decision.userAction === 'approved') {
      return 'WOULD_HAVE_TAKEN';
    }
    if (decision.userAction === 'approved') {
      return decision.result?.filled ? 'EXECUTED' : 'BLOCKED';
    }
    if (decision.userAction === 'rejected') {
      return 'REJECTED';
    }
    return 'PROPOSED';
  };

  const getBrainSummary = (brains: any) => {
    if (!brains) return 'N/A';
    const states = [];
    if (brains.market?.state) states.push(`Market:${brains.market.state}`);
    if (brains.risk?.state) states.push(`Risk:${brains.risk.state}`);
    if (brains.psychology?.state) states.push(`Psych:${brains.psychology.state}`);
    return states.join(', ') || 'N/A';
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

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={filter.mode || ''}
            onChange={(e) => setFilter({ ...filter, mode: e.target.value || undefined })}
            className="bg-[#1A1A1A] border border-white/20 rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Modes</option>
            <option value="off">OFF</option>
            <option value="learn">LEARN</option>
            <option value="paper">PAPER</option>
            <option value="live_assisted">LIVE_ASSISTED</option>
          </select>
          <select
            value={filter.action || ''}
            onChange={(e) => setFilter({ ...filter, action: e.target.value || undefined })}
            className="bg-[#1A1A1A] border border-white/20 rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Actions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="pending">Pending</option>
          </select>
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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Outcome</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Confidence</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80">Brains</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white/80"></th>
                </tr>
              </thead>
              <tbody>
                {decisions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-white/60">
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
                        {getOutcomeType(decision)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {decision.confidence ? `${(decision.confidence * 100).toFixed(0)}%` : 'N/A'}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${getActionColor(decision.userAction)}`}>
                        {decision.userAction.toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/60">
                        {getBrainSummary(decision.brains)}
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
            <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Decision Details</h2>
                <button onClick={() => setSelectedDecision(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <p className="text-white/60 text-sm">Outcome</p>
                    <p className="text-white">{getOutcomeType(selectedDecision)}</p>
                  </div>
                </div>

                {selectedDecision.reason && (
                  <div>
                    <p className="text-white/60 text-sm mb-1">Reason</p>
                    <p className="text-white bg-[#0A0A0A] p-3 rounded-lg">{selectedDecision.reason}</p>
                  </div>
                )}

                {selectedDecision.brains && (
                  <div>
                    <p className="text-white/60 text-sm mb-2">Brain Outputs</p>
                    <div className="bg-[#0A0A0A] p-4 rounded-lg space-y-3">
                      {selectedDecision.brains.market && (
                        <div>
                          <p className="text-white/80 font-semibold mb-1">Market Brain</p>
                          <pre className="text-white text-xs overflow-auto">
                            {JSON.stringify(selectedDecision.brains.market, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedDecision.brains.risk && (
                        <div>
                          <p className="text-white/80 font-semibold mb-1">Risk Brain</p>
                          <pre className="text-white text-xs overflow-auto">
                            {JSON.stringify(selectedDecision.brains.risk, null, 2)}
                          </pre>
                        </div>
                      )}
                      {selectedDecision.brains.psychology && (
                        <div>
                          <p className="text-white/80 font-semibold mb-1">Psychology Brain</p>
                          <pre className="text-white text-xs overflow-auto">
                            {JSON.stringify(selectedDecision.brains.psychology, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedDecision.proposal && (
                  <div>
                    <p className="text-white/60 text-sm mb-2">Full Proposal</p>
                    <pre className="text-white text-xs bg-[#0A0A0A] p-3 rounded overflow-auto max-h-64">
                      {JSON.stringify(selectedDecision.proposal, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedDecision.result && (
                  <div>
                    <p className="text-white/60 text-sm mb-2">Execution Result</p>
                    <pre className="text-white text-xs bg-[#0A0A0A] p-3 rounded overflow-auto">
                      {JSON.stringify(selectedDecision.result, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedDecision.safety && (
                  <div>
                    <p className="text-white/60 text-sm mb-2">Safety Checks</p>
                    <pre className="text-white text-xs bg-[#0A0A0A] p-3 rounded overflow-auto">
                      {JSON.stringify(selectedDecision.safety, null, 2)}
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
