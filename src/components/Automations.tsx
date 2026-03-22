import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlayCircle, Activity, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface Automation {
  id:             string;
  name:           string;
  status:         string;
  lastRun:        string | null;
  executionCount: number;
}

function safeDate(value: any) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString();
}

export function Automations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res  = await fetch('/api/automations');
        const data = await res.json().catch(() => []);
        setAutomations(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setAutomations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 seconds so last-run time stays current
    const id = setInterval(fetchData, 5_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
            Active Automations
          </h1>
          <p className="text-zinc-400 font-mono text-sm">Monitor background agent execution loops.</p>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-zinc-500 font-mono text-sm animate-pulse">
            Loading automation status...
          </div>
        ) : automations.length === 0 ? (
          <div className="p-12 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center text-zinc-500">
            <Activity className="w-12 h-12 mb-4 text-zinc-700" />
            <p className="font-mono text-sm">No automations running.</p>
          </div>
        ) : (
          automations.map((auto) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 flex items-center justify-between group hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl shrink-0">
                  <PlayCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">{auto.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>Last run: {safeDate(auto.lastRun)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-500 font-mono mb-1">EXECUTIONS</p>
                  <p className="text-sm text-zinc-300 font-mono">{auto.executionCount}</p>
                </div>
                <div className="w-px h-8 bg-zinc-800 mx-2" />
                <div className={clsx(
                  'flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono uppercase',
                  auto.status === 'running'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
                )}>
                  {auto.status === 'running' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  {auto.status}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
