import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, ExternalLink, CheckCircle2, Clock, XCircle,
  ArrowDownRight, ArrowUpRight, RefreshCw, Inbox,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useWallet } from '../context/WalletContext';
import { useUSDT } from '../hooks/useUSDT';
import { USDTTransfer } from '../web3/usdt';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function TransferRow({ tx }: { tx: USDTTransfer }) {
  const isSent = tx.direction === 'sent';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, backgroundColor: isSent ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)' }}
      animate={{ opacity: 1, y: 0, backgroundColor: 'transparent' }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-zinc-800/30 transition-colors group"
    >
      {/* Direction + amount */}
      <div className="col-span-3 flex items-center gap-3">
        <div
          className={clsx(
            'p-2 rounded-lg shrink-0',
            isSent ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
          )}
        >
          {isSent ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-base font-mono font-medium text-white">
            {isSent ? '−' : '+'}{Number(tx.amount).toFixed(2)} <span className="text-xs text-zinc-500">USDT</span>
          </p>
          <p
            className={clsx(
              'text-xs font-mono mt-0.5 uppercase tracking-wider',
              isSent ? 'text-red-400' : 'text-emerald-400'
            )}
          >
            {isSent ? 'Sent' : 'Received'}
          </p>
        </div>
      </div>

      {/* From */}
      <div className="col-span-2">
        <p className="text-xs text-zinc-500 font-mono mb-0.5 uppercase">From</p>
        <p className="text-sm text-zinc-300 font-mono" title={tx.from}>{shortAddr(tx.from)}</p>
      </div>

      {/* To */}
      <div className="col-span-2">
        <p className="text-xs text-zinc-500 font-mono mb-0.5 uppercase">To</p>
        <p className="text-sm text-zinc-300 font-mono" title={tx.to}>{shortAddr(tx.to)}</p>
      </div>

      {/* Status */}
      <div className="col-span-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium border uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Confirmed
        </span>
      </div>

      {/* Tx hash */}
      <div className="col-span-2">
        {tx.txHash ? (
          <a
            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-emerald-400 transition-colors font-mono group/link"
          >
            <span className="truncate">{tx.txHash.slice(0, 10)}...{tx.txHash.slice(-6)}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </a>
        ) : (
          <span className="text-sm text-zinc-600 font-mono flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
          </span>
        )}
      </div>

      {/* Date */}
      <div className="col-span-1 text-right">
        <p className="text-xs text-zinc-500 font-mono">{formatTimestamp(tx.timestamp)}</p>
        <p className="text-xs text-zinc-700 font-mono">#{tx.blockNumber}</p>
      </div>
    </motion.div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function Transactions() {
  const { isConnected, chainId, connect, loading } = useWallet() as any;
  const { transfers, loadingTransfers, error, refresh } = useUSDT();

  const isWrongNetwork = isConnected && chainId !== null && chainId !== 11155111;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 min-h-screen flex flex-col">
      <header className="shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2 flex items-center gap-3 font-mono">
            <Database className="w-8 h-8 text-emerald-500" />
            On-Chain Ledger
          </h1>
          <p className="text-zinc-400 font-mono text-sm">
            Live USDT Transfer events from Sepolia blockchain.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loadingTransfers}
            className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all disabled:opacity-40"
          >
            <RefreshCw className={clsx('w-4 h-4', loadingTransfers && 'animate-spin')} />
          </button>
          <div className="flex items-center gap-3 px-4 py-2 bg-zinc-950 border border-zinc-800/80 rounded-xl">
            <span className="text-sm font-mono text-zinc-300">
              TOTAL_TX: <span className="text-emerald-400">{transfers.length}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Not connected state */}
      {!isConnected && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Inbox className="w-16 h-16 text-zinc-700 mx-auto" />
            <p className="text-zinc-400 font-mono text-sm uppercase tracking-widest">
              Wallet not connected
            </p>
            <p className="text-zinc-600 font-mono text-xs">
              Connect MetaMask to view your on-chain transaction history.
            </p>
            <button
              onClick={connect}
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-mono font-medium transition-all"
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      )}

      {/* Wrong network */}
      {isConnected && isWrongNetwork && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-amber-500/50 mx-auto" />
            <p className="text-amber-400 font-mono text-sm uppercase tracking-widest">Wrong Network</p>
            <p className="text-zinc-500 font-mono text-xs">
              Switch MetaMask to Ethereum Sepolia to see transactions.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {isConnected && !isWrongNetwork && error && (
        <div className="shrink-0 p-4 rounded-xl bg-red-500/10 border border-red-500/30 font-mono text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Transactions table */}
      {isConnected && !isWrongNetwork && (
        <div className="flex-1 bg-zinc-950 border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-0 relative">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-10" />

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-4 p-5 border-b border-zinc-800/80 text-xs font-mono font-medium text-zinc-500 uppercase tracking-widest bg-zinc-900/80 backdrop-blur-md shrink-0 relative z-10">
            <div className="col-span-3">Amount / Direction</div>
            <div className="col-span-2">From</div>
            <div className="col-span-2">To</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Tx Hash</div>
            <div className="col-span-1 text-right">Date / Block</div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
            {loadingTransfers && transfers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <p className="text-emerald-500 font-mono text-sm animate-pulse">
                  SCANNING BLOCKCHAIN...
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                <AnimatePresence mode="popLayout">
                  {transfers.map((tx) => (
                    <div key={tx.id}>
                      <TransferRow tx={tx} />
                    </div>
                  ))}
                  {transfers.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-12 text-center text-zinc-500 text-sm flex flex-col items-center justify-center gap-3 h-full"
                    >
                      <Inbox className="w-12 h-12 opacity-20" />
                      <p className="font-mono uppercase tracking-widest">
                        No transfers found in recent blocks
                      </p>
                      <p className="text-zinc-600 text-xs font-mono">
                        Scanned last 2,000 blocks on Sepolia
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
