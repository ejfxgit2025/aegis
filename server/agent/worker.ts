import { sendUSDT } from '../services/payment.ts';
import {
  getWaitingEvents,
  setProcessing,
  setDone,
  setFailed,
  type AegisEvent,
} from './events.ts';
import { processEvent } from './processor.ts';
import { log } from './logger.ts';
import { validatePayment, recordSpend, resetDailySpendIfNewDay } from './validator.ts';
import { getDailyLimit, dailySpent, checkAndResetDaily, addDailySpend } from './state.ts';
import { configStore } from '../config/store.ts';
import { shouldRunEngine, setEngineRunning } from './lifecycle.ts';

// ─── Configuration ─────────────────────────────────────────────────────────────

const WORKER_INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS) || 1_500;  // event loop tick
const BATCH_SIZE          = Number(process.env.WORKER_BATCH_SIZE)  || 8;      // max events per tick

// ─── Internal State ────────────────────────────────────────────────────────────

let running    = false;
let workerTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Per-Event Execution ───────────────────────────────────────────────────────

async function executeEvent(event: AegisEvent): Promise<void> {
  const { id, type } = event;

  // ── Step 1: Acquire processing lock ──────────────────────────────────────────
  const locked = setProcessing(id);
  if (!locked) {
    // Already processing or done — skip (prevents double execution)
    return;
  }

  log('PICKED', id, type, `Event picked for processing`);
  log('PROCESSING', id, type, `Processing started — to=${event.to ?? 'n/a'} amount=${event.amount ?? 'n/a'} USDT`);

  // ── Step 2: Deterministic decision (synchronous, no AI) ──────────────────────
  const decision = processEvent(event);

  if (decision.action === 'fail') {
    setFailed(id, decision.reason);
    log('FAILED', id, type, decision.reason, { error: decision.reason });
    return;
  }

  // ── Step 3: Pre-payment validation (limits + allowlist) ──────────────────────
  const validation = validatePayment(decision.to, decision.amount);
  if (!validation.valid) {
    setFailed(id, validation.reason!);
    log('REJECTED', id, type, validation.reason!, { error: validation.reason, amount: decision.amount });
    return;
  }

  // ── Step 4: Enforce global daily limit ───────────────────────────────────────
  checkAndResetDaily();
  const DAILY_LIMIT = getDailyLimit();

  if (dailySpent + decision.amount! > DAILY_LIMIT) {
    const errorMsg = `Daily limit exceeded: ${dailySpent}/${DAILY_LIMIT}`;
    setFailed(id, errorMsg);
    log('REJECTED', id, type, errorMsg, { error: errorMsg, amount: decision.amount });
    return;
  }

  // ── Step 5: Execute USDT transfer ────────────────────────────────────────────
  log('TRIGGERED', id, type, `Payment triggered → ${decision.to}`, { amount: decision.amount });

  try {
    const result = await sendUSDT(decision.to!, decision.amount!);

    addDailySpend(decision.amount!); // UPDATE SPENT AFTER SUCCESS
    recordSpend(decision.amount!);
    setDone(id, result.txHash);
    log('SUCCESS', id, type, `Payment confirmed`, { txHash: result.txHash, amount: decision.amount });

  } catch (err: any) {
    const errMsg = err?.shortMessage ?? err?.message ?? 'Unknown on-chain error';
    setFailed(id, errMsg);
    log('FAILED', id, type, `Payment failed: ${errMsg}`, { error: errMsg, amount: decision.amount });
  }
}

// ─── Worker Tick ───────────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  if (!configStore.autoMode) return; // Pause processing if autoMode is off

  // ── Rule-aware guard: stop silently if no active rules exist ─────────────────
  if (!shouldRunEngine()) {
    console.log('[Worker] No active rules — engine idle.');
    return;
  }

  resetDailySpendIfNewDay();

  const events = getWaitingEvents(BATCH_SIZE);

  if (events.length === 0) return;  // idle — no log spam

  console.log(`[Worker] ⚡ Tick — ${events.length} event(s) in batch (interval: ${WORKER_INTERVAL_MS}ms)`);

  // Process the batch concurrently (each event fully isolated)
  await Promise.all(events.map(ev => executeEvent(ev).catch((err: any) => {
    console.error(`[Worker] Unhandled error for event ${ev.id}:`, err?.message ?? err);
    setFailed(ev.id, err?.message ?? 'Unhandled worker error');
  })));
}

// ─── Recursive Loop ─────────────────────────────────────────────────────────────

async function loop(): Promise<void> {
  if (!running) return;
  try {
    await tick();
  } catch (err: any) {
    console.error('[Worker] Unhandled tick error:', err.message);
  }
  workerTimer = setTimeout(loop, WORKER_INTERVAL_MS);
}

// ─── Public API ─────────────────────────────────────────────────────────────────

export function startWorker(): void {
  if (running) {
    // Already running — no-op (safe to call multiple times)
    return;
  }
  running = true;
  setEngineRunning(true);

  console.log('[Worker] ✅ Execution Engine Starting');
  console.log(`[Worker]   Event loop interval: ${WORKER_INTERVAL_MS}ms`);
  console.log(`[Worker]   Batch size:          ${BATCH_SIZE} events/tick`);

  // Start main event loop
  loop();
}

export function stopWorker(): void {
  running = false;
  setEngineRunning(false);
  if (workerTimer) clearTimeout(workerTimer);
  console.log('[Worker] ■ Aegis stopped.');
}
