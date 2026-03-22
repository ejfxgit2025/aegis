// ─── Rule Validator ───────────────────────────────────────────────────────────
// Synchronous, pure validation for AI-parsed rules.
// Throws a descriptive Error on any violation — no network calls.

import { isAddress } from 'ethers';
import { type ParsedRule } from './aiRuleParser.ts';

export function validateRule(rule: unknown): asserts rule is ParsedRule {
  if (!rule || typeof rule !== 'object') {
    throw new Error('Rule must be a non-null object');
  }

  const r = rule as Record<string, any>;

  // ── Trigger ────────────────────────────────────────────────────────────────
  if (!r.trigger || typeof r.trigger !== 'string' || !r.trigger.trim()) {
    throw new Error('Missing or empty "trigger" field');
  }

  // ── Action block ──────────────────────────────────────────────────────────
  if (!r.action || typeof r.action !== 'object') {
    throw new Error('Missing "action" object');
  }

  const action = r.action as Record<string, any>;

  // Amount
  const amount = Number(action.amount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid amount: "${action.amount}" — must be a positive number`);
  }

  // Recipient address
  if (!action.to || typeof action.to !== 'string') {
    throw new Error('Missing "action.to" recipient address');
  }
  if (!isAddress(action.to)) {
    throw new Error(`Invalid EVM address in "action.to": "${action.to}"`);
  }

  // ── Schedule (optional but validated if present) ───────────────────────────
  const ALLOWED_FREQUENCIES = ['daily', 'weekly', 'monthly', 'once'];

  if (r.schedule !== undefined) {
    if (!ALLOWED_FREQUENCIES.includes(r.schedule)) {
      throw new Error(`Invalid schedule "${r.schedule}" — allowed: ${ALLOWED_FREQUENCIES.join(', ')}`);
    }
  }

  // ── Frequency (optional but validated if present) ──────────────────────────
  if (r.frequency !== undefined) {
    if (!ALLOWED_FREQUENCIES.includes(r.frequency)) {
      throw new Error(`Invalid frequency "${r.frequency}" — allowed: ${ALLOWED_FREQUENCIES.join(', ')}`);
    }
  }
}
