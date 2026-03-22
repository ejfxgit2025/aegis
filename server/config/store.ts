// ─── Centralized Runtime Config Store ────────────────────────────────────────
// Single source of truth for mutable agent configuration.
// All modules (validator, api, executor) must import from here.

export const configStore = {
  dailyLimit: Number(process.env.AGENT_DAILY_LIMIT) || 500,
  autoMode: true,
};
