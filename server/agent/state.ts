import { configStore } from '../config/store.ts';

// We initialize the daily limit from our configStore to maintain dynamic updates,
// but fallback to 1000 if not available according to the specifications.
export let dailySpent = 0;
export let lastReset = Date.now();

export function getDailyLimit() {
  return configStore.dailyLimit || 1000;
}

export function checkAndResetDaily() {
  const now = Date.now();

  // 24 hours in milliseconds
  if (now - lastReset > 86400000) {
    dailySpent = 0;
    lastReset = now;
  }
}

export function addDailySpend(amount: number) {
  dailySpent += amount;
}
