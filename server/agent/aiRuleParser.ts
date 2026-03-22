// ─── AI Rule Parser ───────────────────────────────────────────────────────────
// Converts a plain-English instruction into a structured ParsedRule object.
// Uses OpenRouter → openai/gpt-4o-mini.  Pure async, no side-effects.
// NEVER executes the parsed output — caller is responsible for validation.

import fetch from 'node-fetch';

// ─── Parsed Rule Shape ────────────────────────────────────────────────────────

export interface ParsedRuleAction {
  type:   string;     // e.g. "pay"
  amount: number;     // positive number (USDT)
  to:     string;     // EVM address string
  token?: string;     // e.g. "USDT"
}

export interface ParsedRule {
  trigger:     string;                                          // e.g. "daily", "api_payment", "github_pr_merged"
  schedule?:   'daily' | 'weekly' | 'monthly' | 'once';       // optional recurrence
  frequency?:  'daily' | 'weekly' | 'monthly' | 'once';       // execution frequency (mirrors schedule)
  conditions?: string[];                                        // e.g. ["daily_limit_allows"]
  action:      ParsedRuleAction;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a payment rule extraction engine.
Convert the user's plain-English instruction into a strict JSON object.
Respond with ONLY raw JSON — no markdown fences, no commentary.

Required shape:
{
  "trigger":    "<string: daily | weekly | monthly | once | github_pr_merged | api_payment | subscription_due>",
  "schedule":   "<string: daily | weekly | monthly | once>",
  "frequency":  "<string: daily | weekly | monthly | once>",
  "conditions": ["<string>"],
  "action": {
    "type":   "pay",
    "amount": <positive number>,
    "to":     "<EVM 0x address>",
    "token":  "USDT"
  }
}

Rules:
- If the instruction mentions "daily",   set trigger, schedule, and frequency to "daily".
- If the instruction mentions "weekly",  set trigger, schedule, and frequency to "weekly".
- If the instruction mentions "monthly", set trigger, schedule, and frequency to "monthly".
- If no recurrence is mentioned,         set trigger, schedule, and frequency to "once".
- If amount is not specified, return amount: 0.
- If the recipient address is not a valid 0x address, return it as-is (validator will catch it).
- NEVER include comments, markdown, or anything other than the JSON object.`;

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function parseRule(userInput: string): Promise<ParsedRule> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment');
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://aegis-treasury.local',
      'X-Title':       'Aegis Treasury Engine',
    },
    body: JSON.stringify({
      model:    'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userInput },
      ],
      temperature: 0,  // deterministic output
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown');
    throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as any;
  const raw: string = data?.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error('OpenRouter returned an empty response');
  }

  // Strip markdown fences if the model wraps the JSON anyway
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: ParsedRule;
  try {
    parsed = JSON.parse(cleaned) as ParsedRule;
  } catch {
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }

  return parsed;
}
