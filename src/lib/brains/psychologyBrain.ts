// src/lib/brains/psychologyBrain.ts
// Psychology Brain - Behavioral analysis, tilt detection, fatigue monitoring

/**
 * Phase 3: Full psychology brain implementation
 * Monitors user behavior, detects tilt, fatigue, and adjusts recommendations
 */

import type { WorldState, PsychologyBrainOutput } from './types';
import type { AgentContext } from '@/lib/memory/agentMemory';

/**
 * Analyzes psychology and behavioral patterns
 */
export async function analyzePsychology(
  worldState: WorldState,
  agentContext: AgentContext
): Promise<PsychologyBrainOutput> {
  const psychology = agentContext.psychologySignals;
  const recentTrades = agentContext.recentTrades;
  const agentDecisions = agentContext.agentDecisions;
  const config = agentContext.config;

  // Detect mental state
  let mentalState: 'clear' | 'tilt' | 'fomo' | 'fear' | 'overconfident' | 'fatigued' = 'clear';
  let recommendedAction: 'proceed' | 'pause' | 'size_down' | 'cool_down' = 'proceed';
  let coolDownMinutes: number | undefined;
  const riskFactors: string[] = [];
  let sizeMultiplier = 1.0;

  // Check for loss streak (tilt indicator)
  if (psychology.recent_loss_streak >= 3) {
    mentalState = 'tilt';
    recommendedAction = 'cool_down';
    coolDownMinutes = 60; // 1 hour cooldown
    riskFactors.push(`Loss streak: ${psychology.recent_loss_streak} consecutive losses`);
    sizeMultiplier = 0.5; // Reduce size by 50%
  }

  // Check for win streak (overconfidence indicator)
  if (psychology.recent_win_streak >= 5) {
    mentalState = 'overconfident';
    recommendedAction = 'size_down';
    riskFactors.push(`Win streak: ${psychology.recent_win_streak} consecutive wins - risk of overconfidence`);
    sizeMultiplier = 0.75; // Reduce size by 25%
  }

  // Check for fatigue
  if (psychology.fatigue_score && psychology.fatigue_score > 0.7) {
    mentalState = 'fatigued';
    recommendedAction = 'pause';
    riskFactors.push('High fatigue score detected');
    sizeMultiplier = 0.5;
  }

  // Check for rapid trading (FOMO indicator)
  const recentDecisionCount = agentDecisions.filter((d) => {
    const decisionTime = new Date(d.created_at);
    const hoursAgo = (Date.now() - decisionTime.getTime()) / (1000 * 60 * 60);
    return hoursAgo < 24; // Last 24 hours
  }).length;

  if (recentDecisionCount > 10) {
    mentalState = 'fomo';
    recommendedAction = 'pause';
    riskFactors.push(`High trading frequency: ${recentDecisionCount} decisions in last 24 hours`);
    sizeMultiplier = 0.5;
  }

  // Check for fear (many rejections)
  const recentRejections = agentDecisions.filter((d) => {
    const decisionTime = new Date(d.created_at);
    const hoursAgo = (Date.now() - decisionTime.getTime()) / (1000 * 60 * 60);
    return hoursAgo < 24 && d.decision_type === 'REJECT';
  }).length;

  if (recentRejections > 5) {
    mentalState = 'fear';
    recommendedAction = 'size_down';
    riskFactors.push(`Many recent rejections: ${recentRejections} - may indicate fear or uncertainty`);
    sizeMultiplier = 0.75;
  }

  // Check psychology mode from config
  if (config.psychology_mode === 'CONSERVATIVE') {
    sizeMultiplier *= 0.8; // Further reduce size in conservative mode
  } else if (config.psychology_mode === 'AGGRESSIVE') {
    if (mentalState === 'clear') {
      sizeMultiplier *= 1.1; // Slight increase in aggressive mode if clear
    }
  }

  // Check overnight bias
  if (!config.allow_overnight && psychology.overnight_bias === 'SEEKS') {
    riskFactors.push('Overnight positions not allowed but user tends to hold overnight');
    recommendedAction = 'size_down';
  }

  // Determine brain state
  let state: 'green' | 'amber' | 'red' = 'green';
  if (mentalState === 'tilt' || mentalState === 'fatigued' || mentalState === 'fomo') {
    state = 'red';
  } else if (mentalState === 'overconfident' || mentalState === 'fear') {
    state = 'amber';
  }

  // Generate journaling prompts if needed
  const journalingPrompts: string[] = [];
  if (mentalState === 'tilt') {
    journalingPrompts.push('What emotions are you feeling after the recent losses?');
    journalingPrompts.push('What can you learn from this losing streak?');
  }
  if (mentalState === 'overconfident') {
    journalingPrompts.push('Are you taking on more risk than usual due to recent wins?');
    journalingPrompts.push('What would you do differently if you were starting fresh?');
  }
  if (mentalState === 'fomo') {
    journalingPrompts.push('Why are you trading so frequently?');
    journalingPrompts.push('What opportunities are you afraid of missing?');
  }

  const confidence = state === 'green' ? 0.8 : state === 'amber' ? 0.5 : 0.3;

  return {
    state,
    confidence,
    reasoning: `Psychology analysis: ${mentalState}. ${riskFactors.length > 0 ? 'Risk factors: ' + riskFactors.join('; ') : 'No major risk factors detected.'} Recommended action: ${recommendedAction}. Size multiplier: ${(sizeMultiplier * 100).toFixed(0)}%.`,
    timestamp: new Date(),
    data: {
      mentalState,
      recommendedAction,
      coolDownMinutes,
      journalingPrompts,
      riskFactors,
    },
  };
}
