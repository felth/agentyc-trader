// src/components/trading/TradeProposalModal.tsx
// Trade Proposal Modal - Shows agent proposal with brain breakdown

/**
 * Phase 2: Trade Proposal Modal
 * TODO Phase 3: Wire up actual brain outputs
 * TODO Phase 4: Add real-time updates
 */

"use client";

import React, { useState } from 'react';
import SourceStatusBadge from '@/components/ui/SourceStatusBadge';

interface TradeProposal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  size: number;
  riskReward: number;
  confidence: number;
}

interface BrainBreakdown {
  market: {
    state: 'green' | 'amber' | 'red';
    conviction: string;
    notes: string;
  };
  risk: {
    state: 'green' | 'amber' | 'red';
    conviction: string;
    notes: string;
  };
  psychology: {
    state: 'green' | 'amber' | 'red';
    conviction: string;
    notes: string;
  };
}

interface SafetyStatus {
  checks: Array<{
    check: string;
    passed: boolean;
    reason: string;
  }>;
  canTrade: boolean;
}

interface TradeProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol?: string;
  direction?: 'BUY' | 'SELL';
  proposal?: TradeProposal;
  brains?: BrainBreakdown;
  safety?: SafetyStatus;
  mode: 'off' | 'learn' | 'paper' | 'live_assisted';
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export default function TradeProposalModal({
  isOpen,
  onClose,
  symbol,
  direction,
  proposal,
  brains,
  safety,
  mode,
  onApprove,
  onReject,
}: TradeProposalModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!isOpen) return null;

  const getStateColor = (state: 'green' | 'amber' | 'red') => {
    switch (state) {
      case 'green': return 'bg-green-500';
      case 'amber': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
    }
  };

  const handleApprove = async () => {
    if (mode === 'off') {
      alert('Agent is OFF - cannot approve trades');
      return;
    }
    setApproving(true);
    try {
      await onApprove();
      onClose();
    } catch (err: any) {
      alert(`Failed to approve: ${err?.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setRejecting(true);
    try {
      await onReject(rejectReason);
      onClose();
      setRejectReason('');
    } catch (err: any) {
      alert(`Failed to reject: ${err?.message}`);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Trade Proposal</h2>
            <p className="text-white/60 text-sm mt-1">
              {symbol} • {direction || 'N/A'} • Mode: {mode === 'live_assisted' ? 'LIVE ASSISTED' : mode.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Safety Status Banner */}
        {safety && (
          <div className={`mb-6 p-4 rounded-lg ${
            safety.canTrade ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${safety.canTrade ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-semibold">
                {safety.canTrade ? 'Safety checks passed' : 'BLOCKED BY SAFETY'}
              </span>
            </div>
            {!safety.canTrade && (
              <ul className="text-sm text-white/80 ml-5 list-disc">
                {safety.checks.filter(c => !c.passed).map((check, i) => (
                  <li key={i}>{check.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Proposal Summary */}
        {proposal && (
          <div className="mb-6 bg-[#0A0A0A] rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recommendation</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-white/60 text-sm">Direction</p>
                <p className="text-xl font-bold">{proposal.direction}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Size</p>
                <p className="text-xl font-bold">{proposal.size}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Entry</p>
                <p className="text-xl font-bold">${proposal.entry.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">R:R</p>
                <p className="text-xl font-bold">{proposal.riskReward.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/60 text-sm">Stop</p>
                <p className="text-lg font-semibold">${proposal.stop.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">Target</p>
                <p className="text-lg font-semibold">${proposal.target.toFixed(2)}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-white/60 text-sm">Confidence</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-white/10 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      proposal.confidence > 0.7 ? 'bg-green-500' :
                      proposal.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${proposal.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{(proposal.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Brain Breakdown */}
        {brains && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Brain Breakdown</h3>
            <div className="space-y-4">
              {(['market', 'risk', 'psychology'] as const).map((brain) => {
                const brainData = brains[brain];
                return (
                  <div key={brain} className="bg-[#0A0A0A] rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getStateColor(brainData.state)}`} />
                      <span className="font-semibold capitalize">{brain} Brain</span>
                    </div>
                    <p className="text-sm text-white/80 mb-1">{brainData.conviction}</p>
                    <p className="text-xs text-white/60">{brainData.notes}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleApprove}
            disabled={approving || mode === 'off' || (safety && !safety.canTrade)}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-white/10 disabled:text-white/40 rounded-lg font-semibold transition"
          >
            {approving ? 'Approving...' : 'Approve Trade'}
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
        {rejecting && (
          <div className="mt-4">
            <label className="block text-sm text-white/80 mb-2">Rejection Reason (required)</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why are you rejecting this proposal?"
              className="w-full bg-[#0A0A0A] border border-white/20 rounded-lg p-3 text-white resize-none"
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  );
}

