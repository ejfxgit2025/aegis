// ─── AI Rule Scheduler ────────────────────────────────────────────────────────
// Time-aware polling scheduler for AI rules.
// Uses nextExecutionAt / lastExecutedAt timestamps to determine when to fire —
// this prevents payment spam (no more "fire immediately then repeat" pattern).
// Reads from rulesStore via the exported reference so mutations are reflected.

import { pushEvent } from './events.ts';
import { rulesStore } from '../routes/api.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledAiRule {
  id:               number;
  name:             string;
  condition:        string;
  action:           string;   // JSON string with { to, amount, token? }
  status?:          string;
  type?:            string;
  interval?:        string;
  frequency?:       string;
  lastExecutedAt?:  number | null;
  nextExecutionAt?: number | null;
}

// ─── Internal State ────────────────────────────────────────────────────────────

// Polling interval — checks all rules every 5 seconds
const POLL_INTERVAL_MS = 5_000;

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ─── Interval helpers ─────────────────────────────────────────────────────────

function getIntervalMs(rule: ScheduledAiRule): number | null {
  const freq = rule.frequency ?? rule.interval;
  if (freq === 'daily')   return 24 * 60 * 60 * 1_000;
  if (freq === 'weekly')  return  7 * 24 * 60 * 60 * 1_000;
  if (freq === 'monthly') return 30 * 24 * 60 * 60 * 1_000;
  if (freq === 'once')    return null; // only runs once
  return null;
}

// ─── Fire a payment event for a rule ─────────────────────────────────────────

function fireRuleEvent(rule: ScheduledAiRule): void {
  try {
    const action = JSON.parse(rule.action) as { to: string; amount: number; token?: string };
    console.log(`[Scheduler] ⏰ Firing AI rule #${rule.id} "${rule.name}" → to=${action.to} amount=${action.amount}`);
    pushEvent({
      type:   'api_payment',
      to:     action.to,
      amount: action.amount,
      reason: `AI rule: ${rule.name}`,
    });
  } catch (err: any) {
    console.error(`[Scheduler] Failed to fire rule #${rule.id}: ${err?.message ?? err}`);
  }
}

// ─── Main Poll Loop ───────────────────────────────────────────────────────────
// Iterates all active AI rules and fires those whose nextExecutionAt has passed.

function pollRules(): void {
  const now = Date.now();

  for (const rule of rulesStore) {
    // Only process active AI rules
    if (rule.type !== 'ai' || rule.status !== 'active') continue;

    const r = rule as unknown as ScheduledAiRule;

    // If nextExecutionAt is not set, skip (rule will be initialized on creation)
    if (r.nextExecutionAt == null) continue;

    // Not yet time to execute
    if (now < r.nextExecutionAt) continue;

    // ✅ Time to execute
    fireRuleEvent(r);

    // Update timestamps on the live rule object in rulesStore
    r.lastExecutedAt = now;

    const intervalMs = getIntervalMs(r);
    if (intervalMs !== null) {
      // Schedule next execution from now
      r.nextExecutionAt = now + intervalMs;
      console.log(`[Scheduler] ✅ Rule #${r.id} executed. Next run in ${Math.round(intervalMs / 1000)}s`);
    } else {
      // "once" — mark as done by nulling nextExecutionAt so it won't re-run
      r.nextExecutionAt = null;
      console.log(`[Scheduler] ✅ Rule #${r.id} executed once — no further executions scheduled`);
    }
  }
}

// ─── Start / Stop polling ─────────────────────────────────────────────────────

export function startSchedulerPoller(): void {
  if (pollTimer) return; // already running
  pollTimer = setInterval(pollRules, POLL_INTERVAL_MS);
  console.log(`[Scheduler] ✅ Polling started (interval: ${POLL_INTERVAL_MS / 1000}s)`);
  // Run immediately on start so a freshly-created rule fires without waiting
  pollRules();
}

export function stopSchedulerPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('[Scheduler] ■ Polling stopped.');
  }
}

// ─── Per-rule registration (called when a rule is created via POST /api/rules/ai) ──

/**
 * Registers a newly-created rule by ensuring the scheduler poller is running.
 * The rule's nextExecutionAt must already be set by the caller (api.ts).
 */
export function registerScheduledRule(_rule: ScheduledAiRule): void {
  // Just ensure the poller is running — it finds due rules on its own
  startSchedulerPoller();
}

// ─── Deregister a rule (e.g. on DELETE /api/rules/:id) ───────────────────────

/**
 * Clears a specific rule's nextExecutionAt so it won't fire again.
 * The rule is identified in rulesStore by id.
 */
export function deregisterScheduledRule(ruleId: number): void {
  const rule = rulesStore.find(r => r.id === ruleId) as unknown as ScheduledAiRule | undefined;
  if (rule) {
    rule.nextExecutionAt = null;
    console.log(`[Scheduler] ❌ Rule #${ruleId} deregistered — nextExecutionAt cleared`);
  }
}
