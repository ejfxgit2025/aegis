import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Cpu } from 'lucide-react';
import { clsx } from 'clsx';

export function AgentActivity() {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/agent-logs');
        if (!res.ok) throw new Error('API failed');
        const json = await res.json().catch(() => ({}));
        setLogs(Array.isArray(json) ? json : []);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 min-h-screen overflow-y-auto">
      <header className="shrink-0">
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3">
          <Cpu className="w-8 h-8 text-emerald-400" />
          Agent Terminal
        </h1>
        <p className="text-zinc-400 font-mono text-sm">Real-time execution logs of the autonomous treasury agent.</p>
      </header>

      <div className="flex-1 bg-black border border-zinc-800/80 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col font-mono text-sm relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20" />
        
        <div className="h-12 bg-zinc-950 border-b border-zinc-800/80 flex items-center px-6 gap-3 z-10 shrink-0">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
          <div className="ml-4 text-zinc-400 text-xs flex items-center gap-2 uppercase tracking-widest">
            <Terminal className="w-4 h-4 text-emerald-400" />
            aegis-engine-v2.0
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-emerald-500/70 uppercase tracking-widest">Connection Secure</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar relative z-10 flex flex-col">
          <div className="flex-1" />
          <AnimatePresence initial={false}>
            {(Array.isArray(logs) ? logs : []).map((msg: string, index: number) => {
              const isRejected = msg.includes('[REJECTED]');
              const isSuccess  = msg.includes('[SUCCESS]');
              const isAiRule   = msg.toLowerCase().includes('ai rule');
              
              return (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={clsx(
                    "flex flex-col gap-1.5 p-3 rounded-lg border transition-colors",
                    isRejected ? "bg-red-500/10 border-red-500/20 text-red-400" :
                    isSuccess  ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" :
                    "bg-zinc-900/10 border-transparent text-zinc-300 hover:bg-zinc-900/50"
                  )}
                >
                  <div className="flex gap-4 items-start">
                    <div className={clsx(
                      "shrink-0 mt-0.5 font-bold",
                      isRejected ? "text-red-500" : isSuccess ? "text-emerald-500" : "text-zinc-500"
                    )}>
                      &gt;
                    </div>
                    <div className="break-words leading-relaxed font-mono">
                      {msg}
                    </div>
                  </div>
                  {isAiRule && (
                    <div className="pl-6">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold tracking-wider uppercase shrink-0">
                        ✨ Triggered by: AI Rule
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
            {logs.length === 0 && (
              <div className="text-zinc-600 italic">Execution Engine Running. Waiting for events...</div>
            )}
          </AnimatePresence>
          <div ref={logsEndRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}
