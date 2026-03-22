import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Zap, Trash2, Pencil, Save, X, Sparkles, Loader2 } from 'lucide-react';

const API_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': 'aegis-secret-key',
};

interface Rule {
  id:           number;
  name:         string;
  condition:    string;
  action:       string;
  type?:        string;
  amount?:      number;
  token?:       string;
  interval?:    string;
  recipient?:   string;
  description?: string;
  status?:      string;
}

const BLANK_RULE = {
  type: 'recurring', amount: '', token: 'USDT',
  interval: 'daily', condition: '', action: 'send_payment',
  recipient: '', description: '',
};

export function PaymentRules() {
  const [rules, setRules]         = useState<Rule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [editBuf, setEditBuf]       = useState<Partial<Rule>>({});
  const [newRule, setNewRule]       = useState({ ...BLANK_RULE });
  const [error, setError]           = useState<string | null>(null);

  // ── AI rule state ────────────────────────────────────────────────────────────
  const [aiText, setAiText]         = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState<string | null>(null);
  const [aiSuccess, setAiSuccess]   = useState<string | null>(null);

  // ── Fetch rules ──────────────────────────────────────────────────────────────
  const fetchRules = async () => {
    try {
      const res  = await fetch('/api/rules');
      const data = await res.json().catch(() => []);
      setRules(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRules(); }, []);

  // ── AI create ─────────────────────────────────────────────────────────────────
  const handleAiCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError(null);
    setAiSuccess(null);
    if (!aiText.trim()) return;
    setAiLoading(true);
    try {
      const res  = await fetch('/api/rules/ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: aiText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'AI rule creation failed');
      setRules(prev => [...prev, data.rule ?? data]);
      setAiSuccess(`✅ Rule created: "${data.rule?.name ?? aiText.trim()}"`);
      setAiText('');
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Create ───────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res  = await fetch('/api/rules', {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ ...newRule, amount: Number(newRule.amount) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to create rule');
      setRules(prev => [...prev, data.rule ?? data]);
      setIsCreating(false);
      setNewRule({ ...BLANK_RULE });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditBuf({ ...rule });
    setError(null);
  };

  const saveEdit = async (id: number) => {
    setError(null);
    try {
      const res  = await fetch(`/api/rules/${id}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(editBuf),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to update rule');
      setRules(prev => prev.map(r => r.id === id ? (data.rule ?? { ...r, ...editBuf }) : r));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteRule = async (id: number) => {
    setError(null);
    try {
      const res  = await fetch(`/api/rules/${id}`, {
        method: 'DELETE',
        headers: API_HEADERS,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to delete rule');
      }
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Payment Rules</h1>
          <p className="text-zinc-400 font-mono text-sm">Configure autonomous payment logic.</p>
        </div>
        <button
          onClick={() => { setIsCreating(true); setError(null); }}
          className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* ── AI Natural-Language Rule Panel ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-violet-950/40 via-zinc-900/60 to-zinc-900/40 border border-violet-500/20 rounded-2xl p-6 backdrop-blur-sm"
      >
        {/* Glow accent */}
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Describe a Rule in Plain English</h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">AI will parse your instruction into a validated rule automatically.</p>
          </div>
        </div>

        <form onSubmit={handleAiCreate} className="flex gap-3 items-stretch">
          <input
            id="ai-rule-input"
            type="text"
            value={aiText}
            onChange={e => { setAiText(e.target.value); setAiError(null); setAiSuccess(null); }}
            disabled={aiLoading}
            placeholder='e.g. "Pay 5 USDT daily to 0xabc... if daily limit allows"'
            className="flex-1 bg-zinc-950/80 border border-zinc-700/60 hover:border-violet-500/40 focus:border-violet-500/60 rounded-xl py-2.5 px-4 text-white placeholder-zinc-600 text-sm font-mono focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={aiLoading || !aiText.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900/40 disabled:text-violet-700 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            {aiLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Parsing…</>
              : <><Sparkles className="w-4 h-4" />Create with AI</>}
          </button>
        </form>

        {/* AI feedback messages */}
        <AnimatePresence>
          {aiError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 text-xs text-red-400 font-mono"
            >
              ❌ {aiError}
            </motion.p>
          )}
          {aiSuccess && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 text-xs text-emerald-400 font-mono"
            >
              {aiSuccess}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-mono"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      {isCreating && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <h2 className="text-xl font-medium text-white mb-4">New Payment Rule</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Rule Type</label>
                <select value={newRule.type} onChange={e => setNewRule({ ...newRule, type: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-emerald-500/50">
                  <option value="recurring">Recurring Payment</option>
                  <option value="trigger">Trigger-based Payment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <input type="text" value={newRule.description} required
                  onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g., Daily AWS Costs" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Amount (USDT)</label>
                <input type="number" value={newRule.amount} required
                  onChange={e => setNewRule({ ...newRule, amount: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Recipient Address</label>
                <input type="text" value={newRule.recipient} required
                  onChange={e => setNewRule({ ...newRule, recipient: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50"
                  placeholder="0x..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-sm font-medium transition-colors">
                Save Rule
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Rules list */}
      <div className="grid gap-4">
        {rules.map(rule => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
          >
            {editingId === rule.id ? (
              /* ── Inline edit form ── */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={editBuf.name ?? ''} placeholder="Rule name"
                    onChange={e => setEditBuf({ ...editBuf, name: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-3 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                  <input value={editBuf.condition ?? ''} placeholder="Condition"
                    onChange={e => setEditBuf({ ...editBuf, condition: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingId(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded-lg text-xs transition-colors">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <button onClick={() => saveEdit(rule.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition-colors">
                    <Save className="w-3.5 h-3.5" /> Save
                  </button>
                </div>
              </div>
            ) : (
              /* ── Read view ── */
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl border ${rule.type === 'recurring' ? 'bg-blue-500/10 border-blue-500/20' : rule.type === 'ai' ? 'bg-violet-500/10 border-violet-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
                    {rule.type === 'recurring'
                      ? <Clock    className="w-6 h-6 text-blue-400" />
                      : rule.type === 'ai'
                        ? <Sparkles className="w-6 h-6 text-violet-400" />
                        : <Zap     className="w-6 h-6 text-purple-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-medium text-white">{rule.description || rule.name || 'Untitled Rule'}</h3>
                      {rule.type === 'ai' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-semibold">
                          ✨ AI Generated Rule
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 font-mono mt-0.5">{rule.condition} → {rule.action}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {rule.status || 'active'}
                  </div>
                  <button onClick={() => startEdit(rule)} title="Edit"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteRule(rule.id)} title="Delete"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {rules.length === 0 && !isCreating && (
          <div className="p-12 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500">
            <p className="font-mono text-sm">No rules configured. Create one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
