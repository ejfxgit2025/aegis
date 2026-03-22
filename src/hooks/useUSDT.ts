import { useEffect, useRef, useState, useCallback } from 'react';
import { getBalance, getTransfers, USDTTransfer } from '../web3/usdt';
import { useWallet } from '../context/WalletContext';

const REFRESH_INTERVAL_MS = 12_000;

export interface UseUSDTResult {
  balance: string | null;
  transfers: USDTTransfer[];
  loadingBalance: boolean;
  loadingTransfers: boolean;
  error: string | null;
  refresh: () => void;
}

export function useUSDT(): UseUSDTResult {
  const { address, isConnected } = useWallet() as { address: string | null; isConnected: boolean };

  const [balance, setBalance]               = useState<string | null>(null);
  const [transfers, setTransfers]           = useState<USDTTransfer[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!isConnected || !address) {
      setBalance(null);
      setTransfers([]);
      return;
    }

    setError(null);

    // Balance (fast)
    setLoadingBalance(true);
    try {
      const bal = await getBalance(address);
      setBalance(bal);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to fetch USDT balance');
    } finally {
      setLoadingBalance(false);
    }

    // Transfers (slower — needs block timestamp lookups)
    setLoadingTransfers(true);
    try {
      const txs = await getTransfers(address);
      setTransfers(txs);
    } catch (e: any) {
      // Non-fatal — keep last known transfers
      console.warn('[useUSDT] getTransfers error:', e?.message);
    } finally {
      setLoadingTransfers(false);
    }
  }, [address, isConnected]);

  // Initial fetch + interval
  useEffect(() => {
    fetchAll();

    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  return {
    balance,
    transfers,
    loadingBalance,
    loadingTransfers,
    error,
    refresh: fetchAll,
  };
}
