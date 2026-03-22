// ─── Event Types ──────────────────────────────────────────────────────────────

export type EventType =
  | 'github_pr_merged'
  | 'api_payment'
  | 'subscription_due'
  | 'manual'
  | 'manual_payment';

export type EventStatus = 'wait' | 'processing' | 'done' | 'failed';

export interface AegisEvent {
  id:          string;
  type:        EventType;
  status:      EventStatus;
  to?:         string;
  amount?:     number;
  reason?:     string;
  metadata?:   Record<string, unknown>;
  createdAt:   string;
  updatedAt:   string;
  txHash?:     string;
  error?:      string;
}

// ─── Log Entry (kept for backward API compatibility) ──────────────────────────

export interface LogEntry {
  time:      string;
  event:     string;
  decision:  string;
  reason:    string;
  amount?:   number;
  status:    'success' | 'rejected' | 'wait' | 'error';
  txHash?:   string;
}

// ─── In-Memory Event Store (keyed by id) ─────────────────────────────────────

const store = new Map<string, AegisEvent>();

// Max events to keep in memory (oldest removed when exceeded)
const MAX_HISTORY = 1000;

// ─── Create / Push ────────────────────────────────────────────────────────────

export function createEvent(event: Omit<AegisEvent, 'id' | 'status' | 'createdAt' | 'updatedAt'>): AegisEvent {
  const now  = new Date().toISOString();
  const full: AegisEvent = {
    ...event,
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status:    'wait',
    createdAt: now,
    updatedAt: now,
  };
  store.set(full.id, full);

  // Evict oldest events when store grows too large
  if (store.size > MAX_HISTORY) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }

  console.log(`[Events] ➕ Created [${full.type}] id=${full.id} to=${full.to ?? 'n/a'} amount=${full.amount ?? 'n/a'}`);
  return full;
}

/** Alias kept so existing callers (api.ts, subscriptions.ts) need no changes */
export const pushEvent = createEvent;

// ─── Lifecycle Transitions ────────────────────────────────────────────────────

export function setProcessing(id: string): boolean {
  const ev = store.get(id);
  if (!ev || ev.status !== 'wait') return false;  // already locked or gone
  ev.status    = 'processing';
  ev.updatedAt = new Date().toISOString();
  return true;
}

export function setDone(id: string, txHash: string): void {
  const ev = store.get(id);
  if (!ev) return;
  ev.status    = 'done';
  ev.txHash    = txHash;
  ev.updatedAt = new Date().toISOString();
}

export function setFailed(id: string, error: string): void {
  const ev = store.get(id);
  if (!ev) return;
  ev.status    = 'failed';
  ev.error     = error;
  ev.updatedAt = new Date().toISOString();
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

/** Returns up to `limit` events with status='wait', oldest first */
export function getWaitingEvents(limit = 8): AegisEvent[] {
  const result: AegisEvent[] = [];
  for (const ev of store.values()) {
    if (ev.status === 'wait') {
      result.push(ev);
      if (result.length >= limit) break;
    }
  }
  return result;
}

export function getAllEvents(): AegisEvent[] {
  return Array.from(store.values());
}

export function getEvent(id: string): AegisEvent | undefined {
  return store.get(id);
}

// ─── Legacy queue-shape helpers (keep API response format unchanged) ──────────

/** Shows pending (wait) events — matches old peekQueue() shape */
export function peekQueue(): AegisEvent[] {
  return getWaitingEvents(500);
}

/** Count of pending (wait) events — matches old queueLength() shape */
export function queueLength(): number {
  let count = 0;
  for (const ev of store.values()) {
    if (ev.status === 'wait') count++;
  }
  return count;
}

/** @deprecated — kept only if old agent.ts is still referenced anywhere */
export function drainQueue(): AegisEvent[] {
  const result = getWaitingEvents(500);
  for (const ev of result) setProcessing(ev.id);
  return result;
}
