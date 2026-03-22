import fs   from 'fs';
import path from 'path';
import { pushEvent } from './events.ts';

// ─── Subscription Schema ──────────────────────────────────────────────────────

export interface Subscription {
  id:           string;
  name:         string;
  to:           string;
  amount:       number;
  intervalDays: number;
  lastPaid:     string | null;   // ISO timestamp or null
  active:       boolean;
}

// ─── File path ────────────────────────────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), 'server', 'data', 'subscriptions.json');

// ─── I/O Helpers ─────────────────────────────────────────────────────────────

function loadSubscriptions(): Subscription[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Subscription[];
  } catch (err: any) {
    console.error('[Subscriptions] Failed to load subscriptions.json:', err.message);
    return [];
  }
}

function saveSubscriptions(subs: Subscription[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[Subscriptions] Failed to save subscriptions.json:', err.message);
  }
}

// ─── Due-Date Logic ───────────────────────────────────────────────────────────

function isDue(sub: Subscription): boolean {
  if (!sub.lastPaid) return true;  // Never paid → immediately due

  const lastPaidMs  = new Date(sub.lastPaid).getTime();
  const intervalMs  = sub.intervalDays * 24 * 60 * 60 * 1000;
  return Date.now() >= lastPaidMs + intervalMs;
}

// ─── Checker (called periodically by the agent) ───────────────────────────────

export function checkSubscriptions(): void {
  const subs = loadSubscriptions();
  let changed = false;

  for (const sub of subs) {
    if (!sub.active) continue;

    if (isDue(sub)) {
      console.log(`[Subscriptions] Due: "${sub.name}" — ${sub.amount} USDT → ${sub.to}`);

      pushEvent({
        type:   'subscription_due',
        to:     sub.to,
        amount: sub.amount,
        reason: `Scheduled payment: ${sub.name}`,
        metadata: { subscriptionId: sub.id, name: sub.name },
      });

      sub.lastPaid = new Date().toISOString();
      changed = true;
    }
  }

  if (changed) saveSubscriptions(subs);
}

// ─── Public CRUD helpers ──────────────────────────────────────────────────────

export function listSubscriptions(): Subscription[] {
  return loadSubscriptions();
}

export function addSubscription(sub: Omit<Subscription, 'id'>): Subscription {
  const subs = loadSubscriptions();
  const newSub: Subscription = {
    ...sub,
    id: `sub_${Date.now()}`,
  };
  subs.push(newSub);
  saveSubscriptions(subs);
  console.log(`[Subscriptions] Added: "${newSub.name}" id=${newSub.id}`);
  return newSub;
}

export function removeSubscription(id: string): boolean {
  const subs    = loadSubscriptions();
  const updated = subs.filter(s => s.id !== id);
  if (updated.length === subs.length) return false;
  saveSubscriptions(updated);
  console.log(`[Subscriptions] Removed id=${id}`);
  return true;
}
