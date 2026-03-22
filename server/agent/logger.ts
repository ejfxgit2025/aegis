// ─── Structured Logger for Aegis Execution Engine ────────────────────────────

export type LogStep =
  | 'PICKED'
  | 'PROCESSING'
  | 'TRIGGERED'
  | 'SUCCESS'
  | 'FAILED'
  | 'REJECTED';

export interface AegisLog {
  time:       string;
  step:       LogStep;
  eventId:    string;
  eventType:  string;
  message:    string;
  txHash?:    string;
  error?:     string;
  amount?:    number;
}

// ─── In-Memory Log Store (capped at 1000 entries) ────────────────────────────

let logs: AegisLog[] = [];

const MAX_LOGS = 1000;

const STEP_ICONS: Record<LogStep, string> = {
  PICKED:     '🔍',
  PROCESSING: '⚙️ ',
  TRIGGERED:  '🚀',
  SUCCESS:    '✅',
  FAILED:     '❌',
  REJECTED:   '⛔',
};

// ─── Core Log Function ────────────────────────────────────────────────────────

export function log(
  step:      LogStep,
  eventId:   string,
  eventType: string,
  message:   string,
  extras?:   { txHash?: string; error?: string; amount?: number }
): AegisLog {
  const entry: AegisLog = {
    time:      new Date().toISOString(),
    step,
    eventId,
    eventType,
    message,
    ...extras,
  };

  logs.push(entry);
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }

  // Console output — structured and readable
  const prefix = `[${step}]`;
  const suffix = [
    extras?.amount  !== undefined ? `amount=${extras.amount} USDT` : '',
    extras?.txHash  ? `tx=${extras.txHash}` : '',
    extras?.error   ? `error=${extras.error}` : '',
  ].filter(Boolean).join(' | ');

  console.log(`${prefix} ${eventType}[${eventId}] — ${message}${suffix ? ' | ' + suffix : ''}`);

  return entry;
}

// ─── Query Helpers ────────────────────────────────────────────────────────────

export function getAllLogs(): AegisLog[] {
  return [...logs];
}

export function getLogsForEvent(eventId: string): AegisLog[] {
  return logs.filter(l => l.eventId === eventId);
}

/** Convert internal logs to the legacy LogEntry shape for backward-compatible API endpoints */
export function toLogEntries() {
  return logs.map(l => ({
    time:     l.time,
    event:    `${l.eventType}[${l.eventId}]`,
    decision: l.step.toLowerCase(),
    reason:   l.message,
    amount:   l.amount,
    txHash:   l.txHash,
    status: (
      l.step === 'SUCCESS'  ? 'success'  :
      l.step === 'FAILED'   ? 'error'    :
      l.step === 'REJECTED' ? 'rejected' :
      'wait'
    ) as 'success' | 'rejected' | 'wait' | 'error',
  }));
}
