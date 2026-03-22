import { isAddress } from 'ethers';
import { configStore } from '../config/store.ts';

// ─── Configuration (override via .env) ───────────────────────────────────────

// DAILY_LIMIT is now read dynamically from configStore (settable at runtime).
export const MAX_PER_TX = Number(process.env.AGENT_MAX_PER_TX) || 100;  // USDT

/**
 * Allowlist of approved recipient addresses.
 * Set AGENT_ALLOWLIST in .env as a comma-separated list.
 * If the env var is empty / not set, ALL valid addresses are allowed.
 */
const rawAllowlist = (process.env.AGENT_ALLOWLIST ?? '').trim();
const ALLOWLIST: Set<string> = rawAllowlist
  ? new Set(rawAllowlist.split(',').map(a => a.trim().toLowerCase()))
  : new Set();

// ─── Daily Spend Tracker ─────────────────────────────────────────────────────

let dailySpend    = 0;
let lastResetDay  = new Date().toDateString();

export function resetDailySpendIfNewDay(): void {
  const today = new Date().toDateString();
  if (today !== lastResetDay) {
    const prev   = dailySpend;
    dailySpend   = 0;
    lastResetDay = today;
    console.log(`[Validator] Daily spend reset. Previous total: ${prev} USDT`);
  }
}

export function recordSpend(amount: number): void {
  dailySpend += amount;
}

export function getDailySpend(): number    { return dailySpend; }
export function getDailyLimit(): number    { return configStore.dailyLimit; }
export function getMaxPerTx():   number    { return MAX_PER_TX; }
export function getDailyRemaining(): number {
  return Math.max(0, configStore.dailyLimit - dailySpend);
}

// ─── Validation Result ────────────────────────────────────────────────────────

export interface ValidationResult {
  valid:   boolean;
  reason?: string;
}

// ─── Core Validator ───────────────────────────────────────────────────────────

export function validatePayment(to: string | undefined, amount: number | undefined): ValidationResult {

  // ── Address presence & format ──────────────────────────────────────────────
  if (!to || typeof to !== 'string' || !isAddress(to)) {
    return { valid: false, reason: `Invalid or missing recipient address: "${to ?? 'undefined'}"` };
  }

  // ── Allowlist check ────────────────────────────────────────────────────────
  if (ALLOWLIST.size > 0 && !ALLOWLIST.has(to.toLowerCase())) {
    return { valid: false, reason: `Address ${to} is not on the approved allowlist` };
  }

  // ── Amount sanity ──────────────────────────────────────────────────────────
  if (amount === undefined || amount === null || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    return { valid: false, reason: `Invalid or non-positive amount: ${amount}` };
  }

  // ── Per-transaction cap ────────────────────────────────────────────────────
  if (amount > MAX_PER_TX) {
    return { valid: false, reason: `Amount ${amount} USDT exceeds per-tx cap of ${MAX_PER_TX} USDT` };
  }

  // ── Daily limit ────────────────────────────────────────────────────────────
  if (dailySpend + amount > configStore.dailyLimit) {
    return {
      valid:  false,
      reason: `Exceeds daily limit — spent: ${dailySpend} USDT, requested: ${amount} USDT, limit: ${configStore.dailyLimit} USDT`,
    };
  }

  return { valid: true };
}
