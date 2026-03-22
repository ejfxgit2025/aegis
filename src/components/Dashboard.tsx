import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  ShieldAlert, Activity, AlertTriangle, ArrowUpRight, Zap,
  Wifi, WifiOff, RefreshCw, Clock, PlayCircle, Terminal,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Link } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useUSDT } from '../hooks/useUSDT';
import { PaymentForm } from './PaymentForm';

// ─── Animated number ──────────────────────────────────────────────────────────

function AnimatedNumber({ value }: { value: number }) {
  const safe  = isFinite(value) && !isNaN(value) ? value : 0;
  const spring = useSpring(safe, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (v) =>
    (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
  useEffect(() => { spring.set(safe); }, [spring, safe]);
  return <motion.span>{display}</motion.span>;
}

// ─── Wallet status badge ──────────────────────────────────────────────────────

function WalletBadge() {
  const { address, isConnected, chainId, connect, loading } = useWallet() as any;
  const isCorrectChain = chainId === 11155111 || chainId === null;

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-mono font-medium transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
      >
        <Wifi className="w-4 h-4" />
        {loading ? 'Connecting...' : 'Connect MetaMask'}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-zinc-900/80 border border-zinc-800/50 rounded-xl backdrop-blur-md">
      {chainId !== null && chainId !== 11155111 ? (
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span className="text-xs font-mono text-red-400">Wrong Network (need Sepolia)</span>
        </div>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          <span className="text-xs text-zinc-400 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <span className="text-xs text-zinc-600 font-mono">Sepolia</span>
        </>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { isConnected, chainId, address } = useWallet() as any;
  const {
    balance, transfers, loadingBalance, loadingTransfers, error, refresh,
  } = useUSDT();

  // Server-side data (rules, logs)
  const [serverData, setServerData] = useState<any>(null);
  const [agentLogs, setAgentLogs]   = useState<string[]>([]);
  const [dailyLimitVal, setDailyLimitVal] = useState<number>(500);
  const [dailySpend, setDailySpend] = useState<number>(0);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/agent/stats');
        const data = await res.json();

        setDailySpend(data.dailySpent);
        setDailyLimitVal(data.DAILY_LIMIT);
      } catch (err) { }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchServer = useCallback(async () => {
    try {
      const [treasuryRes, limitRes] = await Promise.all([
        fetch('/api/treasury'),
        fetch('/api/settings/limit'),
      ]);
      if (!treasuryRes.ok) throw new Error('API failed');
      const json      = await treasuryRes.json().catch(() => ({}));
      const limitJson = limitRes.ok ? await limitRes.json().catch(() => ({})) : {};
      setServerData({
        rules: Array.isArray(json?.rules) ? json.rules : [],
        autoMode: !!json?.autoMode,
      });
      if (typeof limitJson.limit === 'number') setDailyLimitVal(limitJson.limit);
    } catch {
      setServerData((prev: any) => prev || { rules: [], autoMode: false });
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res  = await fetch('/api/agent/logs');
      if (!res.ok) return;
      const json = await res.json().catch(() => []);
      setAgentLogs(Array.isArray(json) ? json : []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchServer();
    const id = setInterval(fetchServer, 15_000);
    return () => clearInterval(id);
  }, [fetchServer]);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 5_000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentLogs]);

  // Real-time backend dailySpend and dailyLimitVal are now strictly managed by the 3000ms interval useEffect above.

  const balanceNum = balance !== null ? parseFloat(balance) : 0;

  const isWrongNetwork = isConnected && chainId !== null && chainId !== 11155111;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3 font-mono">
            Aegis Command Center
            {isConnected && !isWrongNetwork && (
              <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                On-Chain Live
              </span>
            )}
          </h1>
          <p className="text-zinc-400 font-mono text-sm">
            TREASURY.STATUS:{' '}
            <span className={isConnected && !isWrongNetwork ? 'text-emerald-400' : 'text-amber-400'}>
              {!isConnected ? 'WALLET NOT CONNECTED' : isWrongNetwork ? 'WRONG NETWORK' : 'ONLINE'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loadingBalance || loadingTransfers}
            title="Refresh on-chain data"
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all disabled:opacity-40"
          >
            <RefreshCw className={clsx('w-4 h-4', (loadingBalance || loadingTransfers) && 'animate-spin')} />
          </button>
          <WalletBadge />
        </div>
      </header>

      {/* Network / wallet warning */}
      <AnimatePresence>
        {isWrongNetwork && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0"
          >
            <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300 font-mono">
              Wrong network detected. Please switch MetaMask to{' '}
              <strong>Ethereum Sepolia (Chain ID 11155111)</strong>.
            </p>
          </motion.div>
        )}
        {error && isConnected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 shrink-0"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-mono">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Balance card */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
              <ShieldAlert className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-400 font-mono">USDT_BALANCE</h3>
          </div>
          {loadingBalance && balance === null ? (
            <div className="h-10 w-32 bg-zinc-800/60 rounded-lg animate-pulse" />
          ) : !isConnected ? (
            <p className="text-2xl font-semibold text-zinc-600 font-mono">—</p>
          ) : (
            <p className="text-4xl font-semibold text-white tracking-tight font-mono">
              $<AnimatedNumber value={balanceNum} />
            </p>
          )}
          <p className="text-xs text-zinc-500 font-mono mt-2">ERC-20 USDT · Sepolia</p>
        </div>

        {/* Daily spend */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-400 font-mono">DAILY_SPEND</h3>
          </div>
          <p className="text-4xl font-semibold text-white tracking-tight font-mono">
            $<AnimatedNumber value={dailySpend} />
          </p>
          <div className="mt-4 w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-emerald-400 h-1.5 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((dailySpend / dailyLimitVal) * 100, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-2">Limit: ${dailyLimitVal.toLocaleString()}</p>
        </div>

        {/* Active rules */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
              <AlertTriangle className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-400 font-mono">ACTIVE_RULES</h3>
          </div>
          <p className="text-4xl font-semibold text-white tracking-tight font-mono relative z-10">
            {serverData?.rules?.length ?? 0}
          </p>
          <Link
            to="/dashboard/rules"
            className="mt-4 inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-mono transition-colors relative z-10"
          >
            Manage Rules <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left — automations + payment form */}
        <div className="lg:col-span-2 flex flex-col gap-6 pr-1">
          {/* Payment form */}
          <PaymentForm onSuccess={refresh} />

          {/* Automations */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl flex flex-col backdrop-blur-sm overflow-hidden">
            <div className="p-5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-950/50">
              <h2 className="text-lg font-medium text-white flex items-center gap-2 font-mono">
                <PlayCircle className="w-5 h-5 text-emerald-400" />
                Active Automations
              </h2>
              <Link
                to="/dashboard/automations"
                className="text-sm text-zinc-400 hover:text-white transition-colors font-mono flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-5 space-y-3">
              <AnimatePresence initial={false}>
                {(Array.isArray(serverData?.rules) ? serverData.rules : []).map((rule: any) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            'p-2 rounded-lg',
                            rule.type === 'recurring' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                          )}
                        >
                          {rule.type === 'recurring' ? <Clock className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200">{rule.description || `Rule ${rule.id}`}</p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">ID: {rule.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {rule.status || 'Active'}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {(!serverData?.rules || serverData.rules.length === 0) && (
                  <div className="text-center py-8 text-zinc-500 font-mono text-sm">
                    No active rules configured.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right — agent terminal */}
        <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl flex flex-col relative overflow-hidden shadow-2xl min-h-[350px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-50" />
          <div className="p-4 border-b border-zinc-800/80 flex justify-between items-center bg-zinc-900/30 backdrop-blur-md">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2 font-mono tracking-wide">
              <Terminal className="w-4 h-4 text-emerald-400" />
              AGENT_TERMINAL
            </h2>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
            </div>
          </div>
          <div className="p-4 flex-1 font-mono text-xs space-y-3 custom-scrollbar overflow-y-auto max-h-[600px]">
            <AnimatePresence initial={false}>
              {/* Live on-chain transfers summary */}
              {isConnected && transfers.slice(0, 5).map((tx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-3"
                >
                  <span className={tx.direction === 'sent' ? 'text-red-400' : 'text-emerald-400'}>
                    {tx.direction === 'sent' ? '↑ SENT' : '↓ RECV'}
                  </span>
                  <span className="text-zinc-300">{Number(tx.amount).toFixed(2)} USDT</span>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 hover:text-emerald-400 transition-colors truncate"
                  >
                    {tx.txHash.slice(0, 10)}...
                  </a>
                </motion.div>
              ))}
              {isConnected && transfers.length === 0 && !loadingTransfers && (
                <div className="text-zinc-600">No transfers found in recent blocks.</div>
              )}
              {loadingTransfers && (
                <div className="text-zinc-600 animate-pulse">Scanning blockchain...</div>
              )}

              {/* Agent logs from /api/agent/logs — fast 5s poll */}
              {agentLogs.length === 0 && !loadingTransfers && (
                <div className="text-zinc-600 font-mono text-xs">Engine running. No events processed yet.</div>
              )}
              {agentLogs.slice().reverse().slice(0, 30).map((msg: string, i: number) => {
                const isRejected = msg.includes('[REJECTED]');
                const isSuccess  = msg.includes('[SUCCESS]');
                const isAiRule   = msg.toLowerCase().includes('ai rule');
                
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={clsx(
                      "flex gap-3 p-2 rounded-lg border",
                      isRejected ? "bg-red-500/10 border-red-500/20" : 
                      isSuccess  ? "bg-emerald-500/5 border-emerald-500/10" : 
                      "bg-zinc-900/30 border-transparent"
                    )}
                  >
                    <span className={clsx(
                      "shrink-0 font-bold",
                      isRejected ? "text-red-500" : isSuccess ? "text-emerald-500" : "text-zinc-500"
                    )}>›</span>
                    <div className="flex flex-col gap-1.5">
                      <span className={clsx(
                        "break-words text-xs font-mono",
                        isRejected ? "text-red-400 font-semibold" : isSuccess ? "text-emerald-400" : "text-zinc-400"
                      )}>
                        {msg}
                      </span>
                      {isAiRule && (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-bold tracking-wider uppercase shrink-0">
                            ✨ Triggered by: AI Rule
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={feedEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
