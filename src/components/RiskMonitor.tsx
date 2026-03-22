import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { format } from 'date-fns';

function safeDate(value: any) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleString();
}

export function RiskMonitor() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchTreasury = async () => {
      try {
        const res = await fetch('/api/treasury');
        const json = await res.json().catch(() => ({}));
        setData(json);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchTreasury();
    const interval = setInterval(fetchTreasury, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-screen bg-black">
      <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mb-4" />
      <div className="text-orange-500 font-mono text-sm animate-pulse">LOADING SECURITY MODULE...</div>
    </div>
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-orange-500" />
            Risk Monitor
          </h1>
          <p className="text-zinc-400 font-mono text-sm">Security alerts and anomaly detection.</p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-zinc-950 border border-zinc-800/80 rounded-xl">
          <Activity className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-mono text-zinc-300">THREAT_LEVEL: <span className={data.alerts.length > 0 ? "text-orange-400" : "text-emerald-400"}>{data.alerts.length > 0 ? "ELEVATED" : "NORMAL"}</span></span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col min-h-0 group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 group-hover:bg-orange-500/20 transition-colors duration-700" />
          <h3 className="text-lg font-mono text-white mb-6 relative z-10 flex items-center gap-3 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            Active Alerts
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 relative z-10 custom-scrollbar pr-2">
            <AnimatePresence mode="popLayout">
              {data.alerts.map((alert: any) => (
                <motion.div 
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: 20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex gap-4 items-start shadow-[0_0_20px_rgba(249,115,22,0.15)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-orange-500/0 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                  <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-0.5 animate-pulse relative z-10" />
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-orange-500/80 text-xs font-mono">{safeDate(alert?.timestamp || null)}</p>
                    <p className="text-zinc-300 text-sm mt-1 leading-relaxed">{alert?.message || ''}</p>
                  </div>
                </motion.div>
              ))}
              {data.alerts.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                  </div>
                  <p className="font-mono uppercase tracking-widest text-sm">No active risk alerts</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col min-h-0 group">
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3 group-hover:bg-red-500/10 transition-colors duration-700" />
          <h3 className="text-lg font-mono text-white mb-6 relative z-10 flex items-center gap-3 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            Rejected Transactions
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 relative z-10 custom-scrollbar pr-2">
            <AnimatePresence mode="popLayout">
              {data.expenses.filter((e: any) => e.status === 'rejected').map((expense: any) => (
                <motion.div 
                  key={expense.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 flex flex-col gap-3 hover:bg-red-500/10 transition-colors shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-zinc-100 text-lg">{expense.decision.merchant}</div>
                      <div className="text-xs font-mono text-zinc-500 uppercase tracking-wider mt-1">{expense.decision.category}</div>
                    </div>
                    <div className="text-red-400 font-mono font-bold text-xl drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                      ${expense.decision.total_amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-300 bg-black/40 p-4 rounded-xl border border-red-500/10 font-mono leading-relaxed">
                    <span className="text-red-400 font-bold mr-2 uppercase tracking-wider text-xs">Reason:</span>
                    {expense.decision.reason}
                  </div>
                </motion.div>
              ))}
              {data.expenses.filter((e: any) => e.status === 'rejected').length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-zinc-600" />
                  </div>
                  <p className="font-mono uppercase tracking-widest text-sm">No rejected transactions</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
