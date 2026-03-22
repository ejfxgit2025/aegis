// ─── Aegis Engine Lifecycle ───────────────────────────────────────────────────
// Central source of truth for whether the execution engine should be running.
// Decouples startup logic from rule existence — engine only runs when needed.

import { rulesStore } from '../routes/api.ts';

// ─── Internal State ───────────────────────────────────────────────────────────

let engineRunning = false;

// ─── Exported helpers ─────────────────────────────────────────────────────────

/** Returns true if at least one active rule exists. */
export function shouldRunEngine(): boolean {
  return rulesStore.some(r => r.status === 'active');
}

/** Returns current engine running state. */
export function isEngineRunning(): boolean {
  return engineRunning;
}

/** Set the engine running flag (called by worker.ts on start/stop). */
export function setEngineRunning(value: boolean): void {
  engineRunning = value;
}
