// src/lib/agent/agentMode.ts
// Centralized Agent Mode Semantics

/**
 * Phase 3: Centralized mode semantics
 * All agent endpoints and UI should use these definitions
 */

export type AgentMode = 'off' | 'learn' | 'paper' | 'live_assisted';

export interface ModeSemantics {
  canPropose: boolean;
  canApprove: boolean;
  canExecute: boolean;
  executionType: 'none' | 'simulated' | 'live';
  description: string;
}

export const MODE_SEMANTICS: Record<AgentMode, ModeSemantics> = {
  off: {
    canPropose: false,
    canApprove: false,
    canExecute: false,
    executionType: 'none',
    description: 'Agent disabled - no proposals or executions',
  },
  learn: {
    canPropose: false, // No actionable proposals to user
    canApprove: false,
    canExecute: false,
    executionType: 'none',
    description: 'Read-only learning mode - agent analyzes but does not propose trades',
  },
  paper: {
    canPropose: true,
    canApprove: true,
    canExecute: true,
    executionType: 'simulated',
    description: 'Full proposals with simulated execution only',
  },
  live_assisted: {
    canPropose: true,
    canApprove: true,
    canExecute: true,
    executionType: 'live',
    description: 'Real execution with explicit human approval required',
  },
};

/**
 * Checks if a mode allows proposals
 */
export function canProposeInMode(mode: AgentMode): boolean {
  return MODE_SEMANTICS[mode].canPropose;
}

/**
 * Checks if a mode allows approvals
 */
export function canApproveInMode(mode: AgentMode): boolean {
  return MODE_SEMANTICS[mode].canApprove;
}

/**
 * Checks if a mode allows execution
 */
export function canExecuteInMode(mode: AgentMode): boolean {
  return MODE_SEMANTICS[mode].canExecute;
}

/**
 * Gets execution type for a mode
 */
export function getExecutionType(mode: AgentMode): 'none' | 'simulated' | 'live' {
  return MODE_SEMANTICS[mode].executionType;
}

