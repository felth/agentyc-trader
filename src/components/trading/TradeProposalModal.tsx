// src/components/trading/TradeProposalModal.tsx
// Trade Proposal Modal - Fully wired with backend

/**
 * Phase 5: Fully wired Trade Proposal Modal
 */

"use client";

import React, { useState, useEffect } from 'react';

interface TradeProposal {
  id: string;
  ticker: string;
  side: 'LONG' | 'SHORT';
  entry: {
    type: 'LIMIT' | 'MARKET';
    price: number | null;
    zone?: { min: number; max: number };
  };
  stop_loss: {
    price: number;
    reason: string;
  };
  targets: Array<{ price: number; weight: number; label?: string }>;
  size: {
    units: number;
    notional_usd: number;
    risk_perc_equity: number;
  };
  risk: {
    allowed: boolean;
    reasons: string[];
    risk_reward_ratio: number;
    est_max_loss_usd: number;
    est_max_gain_usd: number;
    category: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  psychology: {
    allowed: boolean;
    reasons: string[];
    behaviour_flags: string[];
    size_multiplier: number;
  };
  brains: {
    market: any;
    risk: any;
    psychology: any;
  };
  meta: {
    confidence: number;
    created_at: string;
    source: string;
  };
}

interface SafetyStatus {
  allowed: boolean;
  reasons: string[];
  flags: string[];
}

interface TradeProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  direction?: 'LONG' | 'SHORT';
  onProposalComplete?: () => void;
}

export default function TradeProposalModal({
  isOpen,
  onClose,
  ticker,
  direction,
  onProposalComplete,
}: TradeProposalModalProps) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<TradeProposal | null>(null);
  const [safety, setSafety] = useState<SafetyStatus | null>(null);
  const [mode, setMode] = useState<'off' | 'learn' | 'paper' | 'live_assisted'>('off');
  const [killSwitch, setKillSwitch] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && ticker) {
      fetchModeAndKillSwitch();
      fetchProposal();
    }
  }, [isOpen, ticker]);

  async function fetchModeAndKillSwitch() {
    try {
      const [modeRes, statusRes] = await Promise.all([
        fetch('/api/agent/mode'),
        fetch('/api/agent/status'),
      ]);
      const modeData = await modeRes.json();
      const statusData = await statusRes.json();
      
      if (modeData.ok) {
        setMode(modeData.mode);
      }
      if (statusData.ok) {
        setKillSwitch(!statusData.killSwitch.enabled);
      }
    } catch (err) {
      console.error('Failed to fetch mode/kill switch:', err);
    }
  }

  async function fetchProposal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agent/propose-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          timeframe: 'H1',
        }),
      });
      const data = await res.json();
      
      if (data.ok && data.proposal) {
        setProposal(data.proposal);
        setSafety(data.safety);
      } else {
        setError(data.error || 'Failed to generate proposal');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch proposal');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (mode === 'off') {
      alert('Agent is OFF - cannot approve trades. Enable at least LEARN/PAPER/LIVE_ASSISTED mode.');
      return;
    }

    if (killSwitch && (mode === 'paper' || mode === 'live_assisted')) {
      alert('Kill switch is ON - execution blocked. Disable kill switch to allow trades.');
      return;
    }

    if (mode === 'live_assisted') {
      const confirmed = confirm(
        '⚠️ LIVE ASSISTED MODE\n\n' +
        'This will send a REAL order to IBKR.\n\n' +
        `Symbol: ${proposal?.ticker}\n` +
        `Side: ${proposal?.side}\n` +
        `Size: ${proposal?.size.units.toFixed(2)} units\n` +
        `Entry: $${proposal?.entry.price?.toFixed(2) || 'Market'}\n\n` +
        'Are you sure you want to proceed?'
      );
      if (!confirmed) return;
    }

    if (!proposal) {
      alert('No proposal available');
      return;
    }

    setApproving(true);
    try {
      const res = await fetch('/api/agent/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
        }),
      });
      const data = await res.json();
      
      if (data.ok) {
        if (mode === 'paper') {
          alert('✅ Paper trade submitted successfully');
        } else if (mode === 'live_assisted') {
          alert(`✅ Live order ${data.result?.filled ? 'filled' : 'submitted'}`);
        } else if (mode === 'learn') {
          alert('✅ Decision logged (LEARN mode - no execution)');
        }
        onProposalComplete?.();
        onClose();
      } else {
        alert(`Failed to approve: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Failed to approve: ${err?.message}`);
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!proposal) return;
    
    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }

    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setRejecting(true);
    try {
      const res = await fetch('/api/agent/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: proposal.id,
          reason: rejectReason,
        }),
      });
      const data = await res.json();
      
      if (data.ok) {
        alert('Proposal rejected');
        onClose();
        setRejectReason('');
        setShowRejectInput(false);
      } else {
        alert(`Failed to reject: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Failed to reject: ${err?.message}`);
    } finally {
      setRejecting(false);
    }
  }

  if (!isOpen) return null;

  const getStateColor = (state: 'green' | 'amber' | 'red') => {
    switch (state) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
    }
  };

  const canApprove = mode !== 'off' && 
                     (!killSwitch || mode === 'learn') && 
                     safety?.allowed !== false &&
                     proposal !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div 
        className="bg-[#1A1A1A] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Trade Proposal</h2>
            <p className="text-white/60 text-sm mt-1">
              {ticker} • {proposal?.side || direction || 'N/A'} • Mode: {mode === 'live_assisted' ? 'LIVE ASSISTED' : mode.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Mode/Kill Switch Banner */}
        {mode === 'off' && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="font-semibold text-red-400">Agent is OFF – enable at least LEARN/PAPER/LIVE_ASSISTED to use proposals.</p>
          </div>
        )}

        {killSwitch && (mode === 'paper' || mode === 'live_assisted') && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="font-semibold text-red-400">⚠️ KILL SWITCH ON – ALL EXECUTION BLOCKED</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/60">Generating proposal...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/50">
            <p className="font-semibold text-red-400">Error: {error}</p>
            <button
              onClick={fetchProposal}
              className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Proposal Content */}
        {!loading && !error && proposal && (
          <>
            {/* Safety Status Banner */}
            {safety && (
              <div className={`mb-6 p-4 rounded-lg ${
                safety.allowed ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${safety.allowed ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="font-semibold">
                    {safety.allowed ? 'Safety checks passed' : 'BLOCKED BY SAFETY'}
                  </span>
                </div>
                {!safety.allowed && safety.reasons.length > 0 && (
                  <ul className="text-sm text-white/80 ml-5 list-disc">
                    {safety.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Proposal Summary */}
            <div className="mb-6 bg-[#0A0A0A] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recommendation</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-white/60 text-sm">Direction</p>
                  <p className="text-xl font-bold">{proposal.side}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Size</p>
                  <p className="text-xl font-bold">{proposal.size.units.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Entry</p>
                  <p className="text-xl font-bold">
                    {proposal.entry.price ? `$${proposal.entry.price.toFixed(2)}` : 'Market'}
                  </p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">R:R</p>
                  <p className="text-xl font-bold">{proposal.risk.risk_reward_ratio.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm">Stop</p>
                  <p className="text-lg font-semibold">${proposal.stop_loss.price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Target</p>
                  <p className="text-lg font-semibold">${proposal.targets[0]?.price.toFixed(2) || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm">Risk</p>
                  <p className="text-lg font-semibold">${proposal.risk.est_max_loss_usd.toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm">Reward</p>
                  <p className="text-lg font-semibold">${proposal.risk.est_max_gain_usd.toFixed(0)}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-white/60 text-sm">Confidence</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        proposal.meta.confidence > 0.7 ? 'bg-green-500' :
                        proposal.meta.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${proposal.meta.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold">{(proposal.meta.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Brain Breakdown */}
            {proposal.brains && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Brain Breakdown</h3>
                <div className="space-y-4">
                  {/* Market Brain */}
                  {proposal.brains.market && (
                    <div className="bg-[#0A0A0A] rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${getStateColor(proposal.brains.market.state || 'amber')}`} />
                        <span className="font-semibold">Market Brain</span>
                      </div>
                      <p className="text-sm text-white/80 mb-1">
                        {proposal.brains.market.setup_label || 'Analysis complete'}
                      </p>
                      <p className="text-xs text-white/60">
                        Bias: {proposal.brains.market.bias || 'N/A'} • Conviction: {(proposal.brains.market.conviction || 0) * 100}%
                      </p>
                    </div>
                  )}

                  {/* Risk Brain */}
                  {proposal.brains.risk && (
                    <div className="bg-[#0A0A0A] rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${proposal.brains.risk.allowed ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="font-semibold">Risk Brain</span>
                      </div>
                      <p className="text-sm text-white/80 mb-1">
                        Position size: ${proposal.brains.risk.position_size_usd.toFixed(0)} • Risk: ${proposal.brains.risk.est_max_loss_usd.toFixed(0)}
                      </p>
                      {proposal.brains.risk.reasons.length > 0 && (
                        <p className="text-xs text-white/60">
                          {proposal.brains.risk.reasons.join('; ')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Psychology Brain */}
                  {proposal.brains.psychology && (
                    <div className="bg-[#0A0A0A] rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${proposal.brains.psychology.allowed ? 'bg-green-500' : 'bg-amber-500'}`} />
                        <span className="font-semibold">Psychology Brain</span>
                      </div>
                      <p className="text-sm text-white/80 mb-1">
                        Mode: {proposal.brains.psychology.mode} • Size multiplier: {(proposal.brains.psychology.adjusted_size_multiplier || 1) * 100}%
                      </p>
                      {proposal.brains.psychology.behavioural_warnings.length > 0 && (
                        <p className="text-xs text-white/60">
                          Warnings: {proposal.brains.psychology.behavioural_warnings.join('; ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={approving || !canApprove}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-white/10 disabled:text-white/40 rounded-lg font-semibold transition"
              >
                {approving ? 'Approving...' : mode === 'learn' ? 'Log Decision (LEARN)' : 'Approve Trade'}
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-white/10 disabled:text-white/40 rounded-lg font-semibold transition"
              >
                {rejecting ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
            </div>

            {/* Reject Reason Input */}
            {showRejectInput && (
              <div className="mt-4">
                <label className="block text-sm text-white/80 mb-2">Rejection Reason (required)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why are you rejecting this proposal?"
                  className="w-full bg-[#0A0A0A] border border-white/20 rounded-lg p-3 text-white resize-none"
                  rows={3}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || rejecting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-white/10 disabled:text-white/40 rounded-lg text-sm font-semibold"
                  >
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectInput(false);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
