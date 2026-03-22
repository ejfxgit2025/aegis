import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { isAddress } from 'ethers';

interface PaymentFormProps {
  onSuccess?: () => void;
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

export function PaymentForm({ onSuccess }: PaymentFormProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount]       = useState('');
  const [state, setState]         = useState<FormState>('idle');
  const [txHash, setTxHash]       = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const isValidAddress = recipient === '' || isAddress(recipient);
  const isValidAmount  = amount === '' || (!isNaN(Number(amount)) && Number(amount) > 0);
  const canSubmit      = isAddress(recipient) && isValidAmount && amount !== '' && state !== 'loading';

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState('loading');
    setTxHash(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'aegis-secret-key',
        },
        body: JSON.stringify({ to: recipient, amount: Number(amount) }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `API error: ${res.status}`);
      }

      setTxHash(data.txHash ?? null);
      setState('success');
      setRecipient('');
      setAmount('');
      onSuccess?.();
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Payment failed. Please try again.');
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setTxHash(null);
    setErrorMsg(null);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm relative">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none rounded-2xl" />

      <div className="flex items-center gap-3 mb-5 relative">
        <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 shadow-inner">
          <Send className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-white font-mono">SEND_USDT</h3>
          <p className="text-xs text-zinc-500 mt-0.5">via backend payment service</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {state === 'success' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-300">Payment Queued for Processing</p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">Processing within ~2 seconds</p>
                {txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-emerald-400 font-mono mt-1 transition-colors truncate"
                  >
                    {txHash.slice(0, 14)}...{txHash.slice(-8)}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={reset}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-mono transition-colors"
            >
              Send Another
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSend}
            className="flex flex-col gap-5 relative z-10"
          >
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                disabled={state === 'loading'}
                className={clsx(
                  'w-full px-4 py-3 bg-zinc-950/80 border rounded-xl text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all disabled:opacity-50',
                  !isValidAddress && recipient !== ''
                    ? 'border-red-500/50 focus:ring-red-500/30'
                    : 'border-zinc-800/50 focus:ring-emerald-500/30 focus:border-emerald-500/30'
                )}
              />
              {!isValidAddress && recipient !== '' && (
                <p className="text-xs text-red-400 font-mono">Invalid Ethereum address</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                Amount (USDT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={state === 'loading'}
                className={clsx(
                  'w-full px-4 py-3 bg-zinc-950/80 border rounded-xl text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all disabled:opacity-50',
                  !isValidAmount && amount !== ''
                    ? 'border-red-500/50 focus:ring-red-500/30'
                    : 'border-zinc-800/50 focus:ring-emerald-500/30 focus:border-emerald-500/30'
                )}
              />
            </div>

            <AnimatePresence>
              {state === 'error' && errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 font-mono break-words">{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={!canSubmit}
              className={clsx(
                'w-full py-3 mt-4 rounded-xl text-sm font-mono font-medium flex items-center justify-center gap-2 transition-all duration-200 relative z-20',
                canSubmit
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              )}
            >
              {state === 'loading' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing On-Chain...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send USDT
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
