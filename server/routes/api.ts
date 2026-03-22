import { Router, type Request, type Response } from 'express';
import { pushEvent, peekQueue, queueLength, getAllEvents } from '../agent/events.ts';
import { getAllLogs } from '../agent/logger.ts';
import { configStore } from '../config/store.ts';

import { validatePayment, getDailySpend, getDailyLimit, getDailyRemaining, getMaxPerTx } from '../agent/validator.ts';
import { listSubscriptions, addSubscription, removeSubscription } from '../agent/subscriptions.ts';
import { dailySpent, getDailyLimit as getStateDailyLimit } from '../agent/state.ts';
import { parseRule } from '../agent/aiRuleParser.ts';
import { validateRule } from '../agent/ruleValidator.ts';
import { registerScheduledRule, deregisterScheduledRule, startSchedulerPoller } from '../agent/aiRuleScheduler.ts';
import { startWorker } from '../agent/worker.ts';
import { isEngineRunning } from '../agent/lifecycle.ts';

export const apiRouter = Router();

// ─── API Key Middleware ───────────────────────────────────────────────────────

const API_KEY = process.env.AGENT_API_KEY ?? 'aegis-secret-key';

function requireApiKey(req: Request, res: Response, next: () => void): void {
  const provided = req.headers['x-api-key'];
  if (!provided || provided !== API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized — invalid or missing x-api-key header' });
    return;
  }
  next();
}

// ─── In-Memory Rules Store ────────────────────────────────────────────────────

interface Rule {
  id:               number;
  name:             string;
  condition:        string;
  action:           string;
  type?:            string;
  amount?:          number;
  token?:           string;
  interval?:        string;
  frequency?:       string;   // "once" | "daily" | "weekly" | "monthly"
  recipient?:       string;
  description?:     string;
  status?:          string;
  lastExecutedAt?:  number | null;  // Unix ms timestamp of last execution
  nextExecutionAt?: number | null;  // Unix ms timestamp of next scheduled execution
}

// ✅ Start with ZERO rules — user must create them manually
export let rulesStore: Rule[] = [];
export let nextRuleId = 1;

// ─── Worker start-time (for automations status) ───────────────────────────────
const workerStartedAt = new Date().toISOString();
let executionCount = 0;

// ─── POST /api/pay ────────────────────────────────────────────────────────────
// Authenticated endpoint for external systems to request payments.

apiRouter.post('/pay', requireApiKey, (req: Request, res: Response) => {
  const { to, amount } = req.body as { to?: string; amount?: number };

  const validation = validatePayment(to, amount);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.reason });
  }

  const event = pushEvent({ type: 'api_payment', to: to!, amount: amount! });
  return res.status(202).json({
    success:  true,
    message:  'Payment request accepted — queued for processing',
    eventId:  event.id,
    queueDepth: queueLength(),
  });
});

// ─── POST /api/agent/trigger ──────────────────────────────────────────────────
// Manual or integration-triggered event injection.

apiRouter.post('/agent/trigger', (req: Request, res: Response) => {
  const { type, to, amount, reason, metadata } = req.body as {
    type?:     string;
    to?:       string;
    amount?:   number;
    reason?:   string;
    metadata?: Record<string, unknown>;
  };

  const allowed = ['github_pr_merged', 'api_payment', 'subscription_due', 'manual', 'manual_payment'];

  if (!type) {
    return res.status(400).json({ success: false, error: 'Missing required field: type' });
  }
  if (!allowed.includes(type)) {
    return res.status(400).json({
      success: false,
      error: `Unknown event type "${type}". Allowed: ${allowed.join(', ')}`,
    });
  }

  const event = pushEvent({
    type:     type as any,
    to,
    amount,
    reason,
    metadata,
  });

  return res.status(202).json({
    success:    true,
    message:    `Event "${type}" queued — will be processed within the next agent tick`,
    eventId:    event.id,
    queueDepth: queueLength(),
  });
});

// ─── GET /api/agent/logs ──────────────────────────────────────────────────────

apiRouter.get('/agent/logs', (_req: Request, res: Response) => {
  const uiLogs = getAllLogs().map(l => {
    const actMap: Record<string, string> = {
      PICKED: 'event_detected',
      PROCESSING: 'processing',
      TRIGGERED: 'payment',
      SUCCESS: 'payment',
      FAILED: 'failed',
      REJECTED: 'rejected'
    };
    const action = actMap[l.step] || l.step.toLowerCase();
    const amount = l.amount ?? 0;
    const reason = l.txHash ? `tx ${l.txHash}` : l.message;
    return `[${l.step}] Action: ${action} Amount: ${amount} Reason: ${reason}`;
  });
  return res.status(200).json(uiLogs);
});

// ─── GET /api/agent/queue ─────────────────────────────────────────────────────

apiRouter.get('/agent/queue', (_req: Request, res: Response) => {
  return res.status(200).json({
    depth:  queueLength(),
    events: peekQueue(),
  });
});

// ─── GET /api/agent/stats ─────────────────────────────────────────────────────
apiRouter.get('/agent/stats', (_req: Request, res: Response) => {
  res.json({
    dailySpent,
    DAILY_LIMIT: getStateDailyLimit()
  });
});

// ─── GET /api/agent/status ────────────────────────────────────────────────────

apiRouter.get('/agent/status', (_req: Request, res: Response) => {
  const allLogs = getAllLogs();
  const last    = allLogs.at(-1);
  return res.status(200).json({
    running:       true,
    dailySpend:    getDailySpend(),
    dailyLimit:    getDailyLimit(),
    dailyRemaining:getDailyRemaining(),
    maxPerTx:      getMaxPerTx(),
    queueDepth:    queueLength(),
    totalLogs:     allLogs.length,
    lastDecision:  last ? { step: last.step, eventId: last.eventId, message: last.message, time: last.time } : null,
  });
});

// ─── GET /api/treasury ────────────────────────────────────────────────────────
// Legacy compatibility — dashboard components read this endpoint

apiRouter.get('/treasury', (_req: Request, res: Response) => {
  const allLogs  = getAllLogs();
  const last     = allLogs.at(-1);
  return res.status(200).json({
    balance:       getDailyRemaining(),
    dailySpend:    getDailySpend(),
    dailyLimit:    getDailyLimit(),
    spentToday:    getDailySpend(),
    activeRules:   rulesStore.length,
    autoMode:      configStore.autoMode,
    lastDecision:  last ? { action: last.step.toLowerCase(), reason: last.message } : null,
    expenses:      allLogs.filter(l => l.step === 'SUCCESS').map(l => ({ time: l.time, amount: l.amount, txHash: l.txHash })),
    logs:          allLogs.map(l => `[${l.time}] [${l.step}] ${l.eventType}[${l.eventId}] → ${l.message}`),
    rules:         rulesStore,
  });
});

// ─── GET /api/transactions ────────────────────────────────────────────────────

apiRouter.get('/transactions', (_req: Request, res: Response) => {
  return res.status(200).json(
    getAllLogs().map((l, i) => ({
      id:     i.toString(),
      time:   l.time,
      event:  `${l.eventType}[${l.eventId}]`,
      status: l.step === 'SUCCESS' ? 'success' : l.step === 'FAILED' ? 'error' : l.step === 'REJECTED' ? 'rejected' : 'wait',
      txHash: l.txHash,
      reason: l.message,
      amount: l.amount,
    }))
  );
});

// ─── GET /api/rules ───────────────────────────────────────────────────────────

apiRouter.get('/rules', (_req: Request, res: Response) => {
  return res.status(200).json(rulesStore);
});

// ─── PUT /api/rules/:id ──────────────────────────────────────────────────────

apiRouter.put('/rules/:id', requireApiKey, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const idx = rulesStore.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Rule not found' });
  rulesStore[idx] = { ...rulesStore[idx], ...req.body, id };
  return res.status(200).json({ success: true, rule: rulesStore[idx] });
});

// ─── DELETE /api/rules/:id ───────────────────────────────────────────────────

apiRouter.delete('/rules/:id', requireApiKey, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const before = rulesStore.length;
  rulesStore = rulesStore.filter(r => r.id !== id);
  if (rulesStore.length === before) return res.status(404).json({ success: false, error: 'Rule not found' });
  // Clean up any active scheduler for AI rules
  deregisterScheduledRule(id);
  return res.status(200).json({ success: true });
});

// ─── GET /api/settings ────────────────────────────────────────────────────────

apiRouter.get('/settings', (_req: Request, res: Response) => {
  return res.status(200).json({
    dailyLimit: getDailyLimit(),
    maxPerTx:   getMaxPerTx(),
    autoMode:   configStore.autoMode,
  });
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

apiRouter.get('/subscriptions', (_req: Request, res: Response) => {
  return res.status(200).json(listSubscriptions());
});

apiRouter.post('/subscriptions', requireApiKey, (req: Request, res: Response) => {
  const { name, to, amount, intervalDays } = req.body;
  if (!name || !to || !amount || !intervalDays) {
    return res.status(400).json({ success: false, error: 'Missing fields: name, to, amount, intervalDays' });
  }
  const sub = addSubscription({ name, to, amount, intervalDays, lastPaid: null, active: true });
  return res.status(201).json({ success: true, subscription: sub });
});

apiRouter.delete('/subscriptions/:id', requireApiKey, (req: Request, res: Response) => {
  const removed = removeSubscription(req.params.id);
  if (!removed) return res.status(404).json({ success: false, error: 'Subscription not found' });
  return res.status(200).json({ success: true });
});

// ─── Stub routes (legacy frontend compatibility) ──────────────────────────────

// ─── GET /api/settings/limit ─────────────────────────────────────────────────

apiRouter.get('/settings/limit', (_req: Request, res: Response) => {
  res.json({ limit: configStore.dailyLimit });
});

// ─── PUT /api/settings/limit ─────────────────────────────────────────────────

apiRouter.put('/settings/limit', (req: Request, res: Response) => {
  const { limit } = req.body as { limit?: unknown };
  const parsed = Number(limit);
  if (!limit || isNaN(parsed) || parsed <= 0) {
    return res.status(400).json({ success: false, error: 'Invalid limit value' });
  }
  configStore.dailyLimit = parsed;
  console.log(`[Settings] Daily limit updated → ${parsed} USDT`);
  return res.json({ success: true, limit: configStore.dailyLimit });
});

apiRouter.post('/save-decision',   (_req, res) => res.status(200).json({ success: true }));
apiRouter.post('/execute-payment', (_req, res) => res.status(200).json({ success: true }));
apiRouter.post('/settings',        (req: Request, res: Response) => {
  if (typeof req.body.autoMode === 'boolean') {
    configStore.autoMode = req.body.autoMode;
    console.log(`[Settings] Auto Agent Mode updated → ${configStore.autoMode}`);
  }
  return res.status(200).json({ success: true, autoMode: configStore.autoMode });
});
apiRouter.post('/simulate',        (_req, res) => res.status(200).json({ success: true }));


// ─── POST /api/rules ─────────────────────────────────────────────────────────

apiRouter.post('/rules', requireApiKey, (req: Request, res: Response) => {
  const body = req.body as Partial<Rule>;
  const rule: Rule = { id: nextRuleId++, name: body.name || 'New Rule', condition: body.condition || '', action: body.action || 'send_payment', ...body };
  rulesStore.push(rule);

  // ✅ Start engine automatically when first rule is created
  startWorker();

  const activeRules = rulesStore.filter(r => r.status === 'active');
  if (!activeRules.length) {
    console.log('[RULE ENGINE] No active rules available');
  }

  return res.status(201).json({ success: true, rule });
});

// ─── POST /api/rules/ai ───────────────────────────────────────────────────────
// Accepts plain-English text, converts it to a rule via AI, validates it,
// stores it in rulesStore, and optionally registers a schedule cron.
// Does NOT require x-api-key so the UI can call it directly.

apiRouter.post('/rules/ai', async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text?: string };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Missing "text" field in request body' });
    }

    // ── Step 1: AI parsing ────────────────────────────────────────────────────
    const parsed = await parseRule(text.trim());

    // ── Step 2: Validation (throws on any invalid field) ──────────────────────
    validateRule(parsed);

    // ── Step 3: Build & store the rule ───────────────────────────────────────
    const now = Date.now();
    const frequency = (parsed.frequency ?? parsed.schedule ?? 'once') as string;

    const newRule: Rule = {
      id:              nextRuleId++,
      name:            text.trim(),
      condition:       parsed.trigger,
      action:          JSON.stringify(parsed.action),
      status:          'active',
      type:            'ai',
      amount:          parsed.action.amount,
      token:           parsed.action.token ?? 'USDT',
      recipient:       parsed.action.to,
      interval:        parsed.schedule,
      frequency,
      description:     parsed.conditions?.join(', '),
      lastExecutedAt:  null,
      // Set nextExecutionAt = now so it fires on the very first scheduler poll
      nextExecutionAt: now,
    };

    rulesStore.push(newRule);

    // ── Step 4: Start worker + scheduler ─────────────────────────────────────
    startWorker();           // no-op if already running
    startSchedulerPoller();  // starts polling loop if not already running
    registerScheduledRule(newRule as any); // ensures poller is live

    console.log(`[AI Rules] ✅ AI rule #${newRule.id} created: "${text.trim()}" (frequency: ${frequency})`);
    return res.status(201).json({ success: true, rule: newRule });

  } catch (err: any) {
    console.error('[AI Rules] ❌ Failed to create AI rule:', err?.message ?? err);
    return res.status(400).json({ success: false, error: err?.message ?? 'Unknown error' });
  }
});

// ─── GET /api/automations ─────────────────────────────────────────────────────
// Returns real execution engine status so the Automations page isn't empty.

apiRouter.get('/automations', (_req: Request, res: Response) => {
  const allLogs  = getAllLogs();
  const lastLog  = allLogs.at(-1);
  executionCount = allLogs.filter(l => l.step === 'SUCCESS' || l.step === 'FAILED').length;
  const activeRuleCount = rulesStore.filter(r => r.status === 'active').length;
  return res.status(200).json([
    {
      id:             'aegis-worker',
      name:           'Aegis Execution Engine',
      status:         isEngineRunning() && activeRuleCount > 0 ? 'running' : 'idle',
      lastRun:        lastLog?.time ?? workerStartedAt,
      executionCount,
      activeRules:    activeRuleCount,
    },
  ]);
});

apiRouter.get('/agent-logs',       (_req, res) => {
  const uiLogs = getAllLogs().map(l => {
    const actMap: Record<string, string> = {
      PICKED: 'event_detected',
      PROCESSING: 'processing',
      TRIGGERED: 'payment',
      SUCCESS: 'payment',
      FAILED: 'failed',
      REJECTED: 'rejected'
    };
    const action = actMap[l.step] || l.step.toLowerCase();
    const amount = l.amount ?? 0;
    const reason = l.txHash ? `tx ${l.txHash}` : l.message;
    return `[${l.step}] Action: ${action} Amount: ${amount} Reason: ${reason}`;
  });
  return res.status(200).json(uiLogs);
});

// ─── GET /api/events ─────────────────────────────────────────────────────────
// Full event store with lifecycle status for inspection / debugging.

apiRouter.get('/events', (_req: Request, res: Response) => {
  return res.status(200).json(getAllEvents());
});

// ─── POST /api/webhooks/github ────────────────────────────────────────────────
// Receives GitHub webhook payloads for pull_request events.
// When a PR is merged, creates a github_pr_merged event with wallet + amount.
//
// PR body should contain magic comments for wallet and amount:
//   <!-- wallet: 0x... -->
//   <!-- amount: 50 -->
// OR pass them as json body extras (for testing).

apiRouter.post('/webhooks/github', (req: Request, res: Response) => {
  const body = req.body as Record<string, any>;

  const action = body?.action;
  const pr     = body?.pull_request;

  // Only process merged PRs
  if (!pr || action !== 'closed' || !pr.merged) {
    return res.status(200).json({ success: true, message: 'Event ignored (not a merged PR)' });
  }

  // Extract wallet address from PR body magic comment: <!-- wallet: 0x... -->
  const prBody: string = pr.body ?? '';
  const walletMatch  = prBody.match(/<!--\s*wallet:\s*(0x[a-fA-F0-9]{40})\s*-->/);
  const amountMatch  = prBody.match(/<!--\s*amount:\s*([\d.]+)\s*-->/);

  const wallet = walletMatch?.[1] ?? body?.wallet ?? null;
  const amount = amountMatch ? Number(amountMatch[1]) : (body?.amount ? Number(body.amount) : null);

  if (!wallet) {
    return res.status(400).json({
      success: false,
      error: 'Missing wallet address. Add <!-- wallet: 0x... --> to the PR body.',
    });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Missing or invalid payment amount. Add <!-- amount: N --> to the PR body.',
    });
  }

  const prUrl  = pr.html_url ?? 'unknown';
  const prTitle = pr.title ?? 'Untitled PR';
  const repo   = pr.base?.repo?.full_name ?? body?.repository?.full_name ?? 'unknown';

  const event = pushEvent({
    type:   'github_pr_merged',
    to:     wallet,
    amount,
    reason: `PR merged: ${prTitle}`,
    metadata: { prUrl, prTitle, repo, mergedBy: pr.merged_by?.login ?? 'unknown' },
  });

  console.log(`[Webhook] GitHub PR merged → wallet=${wallet} amount=${amount} USDT pr=${prUrl}`);

  return res.status(202).json({
    success:  true,
    message:  'github_pr_merged event created — will execute within 2 seconds',
    eventId:  event.id,
    wallet,
    amount,
    pr:       prUrl,
  });
});
