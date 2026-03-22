/**
 * WalletContext.jsx — Aegis AI Wallet State (Stable Build)
 *
 * Stability guarantees:
 *  ✅ Loading lock — prevents double-connect on rapid clicks
 *  ✅ isConnected guard — no-op if already connected
 *  ✅ Auto-reconnect on mount uses ONLY eth_accounts (no popup)
 *  ✅ accountsChanged: disconnects cleanly or silently re-syncs
 *  ✅ chainChanged: state update inline — NO window.location.reload()
 *  ✅ Single source of truth — all wallet state lives here
 *  ✅ All errors caught silently; no UI crashes
 */

import React, {
  createContext, useContext, useEffect,
  useState, useCallback, useRef,
} from 'react';
import {
  connectWallet   as walletConnect,
  reconnectWallet,
  disconnectWallet as walletDisconnect,
  getStoredAddress,
  WalletError,
} from '../web3/wallet.js';

// ─── Context ──────────────────────────────────────────────────────────────────

const WalletContext = createContext(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function WalletProvider({ children }) {
  // Core wallet state
  const [address,   setAddress]   = useState(null);
  const [provider,  setProvider]  = useState(null);
  const [signer,    setSigner]    = useState(null);
  const [balance,   setBalance]   = useState(null);
  const [chainId,   setChainId]   = useState(null);

  // UI control
  const [loading,   setLoading]   = useState(false);  // Lock for connect button
  const [isReady,   setIsReady]   = useState(false);  // False until first reconnect attempt runs

  // Ref so event handlers always see the latest address without stale closure
  const addressRef = useRef(null);

  const isConnected = !!address;

  // ── Apply a wallet result object to all state at once ─────────────────────
  const applyState = useCallback((result) => {
    if (!result) {
      setAddress(null);  setProvider(null);
      setSigner(null);   setBalance(null);
      setChainId(null);
      addressRef.current = null;
      return;
    }
    setAddress(result.address);
    setProvider(result.provider ?? null);
    setSigner(result.signer   ?? null);
    setBalance(result.balance ?? null);
    setChainId(result.chainId ?? null);
    addressRef.current = result.address;
  }, []);

  // ── Auto-reconnect on mount ───────────────────────────────────────────────
  // Uses eth_accounts (no popup). Only runs once.
  useEffect(() => {
    let cancelled = false;

    const tryRestore = async () => {
      // Skip entirely if no stored address and no injected wallet
      if (!getStoredAddress() && (typeof window === 'undefined' || !window.ethereum)) {
        setIsReady(true);
        return;
      }
      try {
        const result = await reconnectWallet(); // eth_accounts internally
        if (!cancelled) applyState(result);
      } catch {
        // Never crash on restore failure
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    tryRestore();
    return () => { cancelled = true; };
  }, [applyState]);

  // ── MetaMask event listeners ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    /**
     * accountsChanged: fired when the user switches accounts or
     * disconnects all accounts inside MetaMask.
     */
    const handleAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        // User removed all accounts — clear state
        walletDisconnect();
        applyState(null);
        return;
      }

      // Account switched → silently re-sync using eth_accounts (no popup)
      try {
        const result = await reconnectWallet();
        applyState(result);
      } catch {
        // Keep last good state if re-sync fails
      }
    };

    /**
     * chainChanged: fired when the user switches networks in MetaMask.
     * We update state inline — NO page reload.
     */
    const handleChainChanged = async (_hexChainId) => {
      // Only re-sync if we were already connected
      if (!addressRef.current) return;
      try {
        const result = await reconnectWallet();
        applyState(result);
      } catch {
        // Non-fatal — state stays as-is; user may need to reconnect manually
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged',    handleChainChanged);

    return () => {
      // Guard: older injected providers may not support removeListener
      if (typeof window.ethereum.removeListener === 'function') {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged',    handleChainChanged);
      }
    };
  }, [applyState]);

  // ── connect() ─────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    // Guard 1: already connected
    if (isConnected) return null;

    // Guard 2: prevent multiple in-flight calls (rapid clicks)
    if (loading) return null;

    setLoading(true);
    try {
      const result = await walletConnect(); // eth_requestAccounts — shows popup
      applyState(result);
      return result; // Callers (e.g. AuthContext) can read result.address
    } catch (err) {
      const code = err?.code ?? err?.message;

      switch (code) {
        case WalletError.NO_WALLET:
          alert(
            'No Web3 wallet detected.\n\n' +
            'Install MetaMask at https://metamask.io then refresh.'
          );
          break;

        case WalletError.USER_REJECTED:
          // Silent — user chose to cancel, do nothing
          console.warn('[Aegis Wallet] User rejected connection.');
          break;

        case WalletError.WRONG_CHAIN: {
          const target = (typeof import.meta !== 'undefined'
            ? import.meta.env?.VITE_TARGET_CHAIN_ID
            : null) || '0xaa36a7';
          alert(`Wrong network. Please switch to chain ${target} in MetaMask and try again.`);
          break;
        }

        case WalletError.INVALID_SIGNER:
          console.warn('[Aegis Wallet] Could not get signer. Is MetaMask unlocked?');
          break;

        default:
          console.warn('[Aegis Wallet] Connection error:', err);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [isConnected, loading, applyState]);

  // ── disconnect() ──────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    walletDisconnect();
    applyState(null);
  }, [applyState]);

  // ── Manual balance refresh ────────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    if (!provider || !address) return;
    try {
      const { formatEther } = await import('ethers');
      const raw  = await provider.getBalance(address);
      setBalance(formatEther(raw));
    } catch {
      // Non-fatal
    }
  }, [provider, address]);

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    address,
    isConnected,
    provider,
    signer,
    balance,
    chainId,
    loading,      // Expose so button can show spinner / disabled state
    isReady,
    connect,
    disconnect,
    fetchBalance,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
