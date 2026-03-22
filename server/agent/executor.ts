/**
 * executor.ts — Backward-compatibility shim.
 *
 * The real execution logic now lives in worker.ts + processor.ts.
 * This file is kept so existing imports from api.ts (getLogs, logWait,
 * logRejection, executePayment) continue to work without any API changes.
 */

import { sendUSDT } from '../services/payment.ts';
import { toLogEntries, log } from './logger.ts';
import { type LogEntry } from './events.ts';
import { validatePayment, recordSpend } from './validator.ts';
import { getDailyLimit, dailySpent, checkAndResetDaily, addDailySpend } from './state.ts';

// ─── Legacy LogEntry shape (used by api.ts GET endpoints) ─────────────────────

/** Returns all execution logs in the legacy LogEntry format for API endpoints. */
export function getLogs(): LogEntry[] {
  return toLogEntries();
}

/** Log a wait without attempting payment (backward compat). */
export function logWait(event: string, reason: string): void {
  const [type = 'unknown', id = 'n/a'] = event.replace(']', '').split('[');
  log('PROCESSING', id, type, `Wait: ${reason}`);
}

/** Log a rejection without attempting payment (backward compat). */
export function logRejection(event: string, reason: string, amount?: number): void {
  const [type = 'unknown', id = 'n/a'] = event.replace(']', '').split('[');
  log('REJECTED', id, type, reason, { amount });
}

// ─── ExecutionRequest / Result (kept for any external callers) ────────────────

export interface ExecutionRequest {
  eventLabel: string;
  to:         string;
  amount:     number;
  reason:     string;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?:  string;
}

/**
 * Standalone payment executor — validates and sends USDT directly.
 * Used by any code that bypasses the worker (e.g. direct admin calls).
 * Normal event processing goes through worker.ts → processor.ts instead.
 */
export async function executePayment(req: ExecutionRequest): Promise<ExecutionResult> {
  const { eventLabel, to, amount, reason } = req;

  const [type = 'unknown', id = 'n/a'] = eventLabel.replace(']', '').split('[');

  const validation = validatePayment(to, amount);
  if (!validation.valid) {
    log('REJECTED', id, type, validation.reason!, { amount });
    return { success: false, error: validation.reason };
  }

  checkAndResetDaily();
  const DAILY_LIMIT = getDailyLimit();

  if (dailySpent + amount > DAILY_LIMIT) {
    const errorMsg = `Daily limit exceeded: ${dailySpent}/${DAILY_LIMIT}`;
    log('REJECTED', id, type, errorMsg, { error: errorMsg, amount });
    return { success: false, error: errorMsg };
  }

  log('TRIGGERED', id, type, `Direct payment triggered → ${to}`, { amount });

  try {
    const result = await sendUSDT(to, amount);
    
    addDailySpend(amount); // Track persistent usage
    recordSpend(amount);
    log('SUCCESS', id, type, `Payment confirmed`, { txHash: result.txHash, amount });
    return { success: true, txHash: result.txHash };

  } catch (err: any) {
    const msg = err?.shortMessage ?? err?.message ?? 'Unknown on-chain error';
    log('FAILED', id, type, `Payment failed: ${msg}`, { error: msg, amount });
    return { success: false, error: msg };
  }
}
