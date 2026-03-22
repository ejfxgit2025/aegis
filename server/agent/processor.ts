import { isAddress } from 'ethers';
import { type AegisEvent } from './events.ts';

// ─── Processor Result ─────────────────────────────────────────────────────────

export interface ProcessorResult {
  action:  'pay' | 'fail';
  to?:     string;
  amount?: number;
  reason:  string;
}

// ─── Deterministic Event Processor ───────────────────────────────────────────
//
// NO network calls, NO AI, NO async — this is pure synchronous logic.
// AI can be used AFTER execution for scoring/audit, never during.
//
// Each event type maps directly to a payment decision:
//   github_pr_merged  → pay if to+amount valid
//   subscription_due  → pay if to+amount valid
//   api_payment       → pay if to+amount valid
//   manual_payment    → pay if to+amount valid
//   manual            → pay if to+amount valid (treated same as manual_payment)
//   unknown           → fail with descriptive error
// ─────────────────────────────────────────────────────────────────────────────

export function processEvent(event: AegisEvent): ProcessorResult {

  switch (event.type) {

    case 'github_pr_merged': {
      const check = validateToAndAmount(event);
      if (!check.valid) {
        return { action: 'fail', reason: `github_pr_merged: ${check.reason}` };
      }
      return {
        action: 'pay',
        to:     event.to!,
        amount: event.amount!,
        reason: `GitHub PR merged — contributor payment: ${event.metadata?.prUrl ?? 'n/a'}`,
      };
    }

    case 'subscription_due': {
      const check = validateToAndAmount(event);
      if (!check.valid) {
        return { action: 'fail', reason: `subscription_due: ${check.reason}` };
      }
      return {
        action: 'pay',
        to:     event.to!,
        amount: event.amount!,
        reason: `Subscription due — ${event.reason ?? event.metadata?.name ?? 'recurring payment'}`,
      };
    }

    case 'api_payment': {
      const check = validateToAndAmount(event);
      if (!check.valid) {
        return { action: 'fail', reason: `api_payment: ${check.reason}` };
      }
      return {
        action: 'pay',
        to:     event.to!,
        amount: event.amount!,
        reason: `API-triggered payment${event.reason ? ': ' + event.reason : ''}`,
      };
    }

    case 'manual_payment':
    case 'manual': {
      const check = validateToAndAmount(event);
      if (!check.valid) {
        return { action: 'fail', reason: `manual_payment: ${check.reason}` };
      }
      return {
        action: 'pay',
        to:     event.to!,
        amount: event.amount!,
        reason: `Manual payment${event.reason ? ': ' + event.reason : ''}`,
      };
    }

    default: {
      return {
        action: 'fail',
        reason: `Unknown event type: "${(event as AegisEvent).type}" — no processor registered`,
      };
    }
  }
}

// ─── Shared Validation Helper ─────────────────────────────────────────────────

function validateToAndAmount(event: AegisEvent): { valid: boolean; reason?: string } {
  if (!event.to || !isAddress(event.to)) {
    return { valid: false, reason: `Invalid or missing recipient address: "${event.to ?? 'undefined'}"` };
  }
  if (typeof event.amount !== 'number' || isNaN(event.amount) || event.amount <= 0) {
    return { valid: false, reason: `Invalid or non-positive amount: ${event.amount}` };
  }
  return { valid: true };
}
