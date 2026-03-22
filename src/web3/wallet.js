/**
 * wallet.js — Aegis AI Web3 Wallet Utility (Stable Build)
 *
 * Design principles:
 *  - Uses window.ethereum.request() directly for predictable behaviour
 *  - eth_requestAccounts  → ONLY for explicit user connect (shows popup)
 *  - eth_accounts         → ONLY for silent checks (auto-reconnect, no popup)
 *  - No window.location.reload() anywhere in this file
 *  - No React dependencies — safe to import from backend or agent scripts
 *
 * Environment variables (VITE_ prefix exposes them in Vite frontend):
 *   VITE_TARGET_CHAIN_ID   hex chain to enforce, e.g. "0xaa36a7" (Sepolia)
 *   VITE_USDT_ADDRESS      ERC-20 USDT contract address on target chain
 */

import { BrowserProvider, formatEther, Contract, parseUnits, JsonRpcProvider } from 'ethers';

// ─── Configuration ────────────────────────────────────────────────────────────

const TARGET_CHAIN_HEX =
  (typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_TARGET_CHAIN_ID
    : process.env?.VITE_TARGET_CHAIN_ID) || '0xaa36a7';

const USDT_ADDRESS =
  (typeof import.meta !== 'undefined'
    ? import.meta.env?.VITE_USDT_ADDRESS
    : process.env?.VITE_USDT_ADDRESS) || '';

export const SUPPORTED_CHAINS = {
  1:        { name: 'Ethereum Mainnet', hex: '0x1',      rpc: 'https://cloudflare-eth.com'       },
  11155111: { name: 'Sepolia Testnet',  hex: '0xaa36a7', rpc: 'https://rpc.ankr.com/eth_sepolia' },
  137:      { name: 'Polygon Mainnet',  hex: '0x89',     rpc: 'https://polygon-rpc.com'          },
};

// ─── Typed error codes ────────────────────────────────────────────────────────

export const WalletError = Object.freeze({
  NO_WALLET:      'NO_WALLET',
  USER_REJECTED:  'USER_REJECTED',
  WRONG_CHAIN:    'WRONG_CHAIN',
  INVALID_SIGNER: 'INVALID_SIGNER',
  UNKNOWN:        'UNKNOWN',
});

// ─── LocalStorage ─────────────────────────────────────────────────────────────

const LS_ADDRESS = 'aegis_wallet_address';

export function getStoredAddress()      { return localStorage.getItem(LS_ADDRESS); }
function saveAddress(addr)              { localStorage.setItem(LS_ADDRESS, addr);  }
export function clearStoredWallet()     { localStorage.removeItem(LS_ADDRESS);     }

// ─── Chain enforcement ────────────────────────────────────────────────────────

/**
 * If the user's wallet is on the wrong chain, request a switch.
 * Does NOT reload the page — state update is handled by WalletContext listeners.
 */
async function enforceChain() {
  const currentChainHex = await window.ethereum.request({ method: 'eth_chainId' });

  if (currentChainHex.toLowerCase() === TARGET_CHAIN_HEX.toLowerCase()) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: TARGET_CHAIN_HEX }],
    });
  } catch (err) {
    if (err?.code === 4001) {
      throw Object.assign(new Error(WalletError.USER_REJECTED), { code: WalletError.USER_REJECTED });
    }
    throw Object.assign(new Error(WalletError.WRONG_CHAIN), { code: WalletError.WRONG_CHAIN });
  }
}

// ─── Core: connect (explicit — shows MetaMask popup) ─────────────────────────

/**
 * Requests account access from the user's wallet.
 * ONLY call this from an explicit user action (button click).
 *
 * @returns {Promise<{ provider, signer, address, balance, chainId } | null>}
 */
export async function connectWallet() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw Object.assign(new Error(WalletError.NO_WALLET), { code: WalletError.NO_WALLET });
  }

  // Step 1: Request accounts — this triggers the MetaMask popup
  let accounts;
  try {
    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  } catch (err) {
    if (err?.code === 4001) {
      throw Object.assign(new Error(WalletError.USER_REJECTED), { code: WalletError.USER_REJECTED });
    }
    throw Object.assign(new Error(WalletError.UNKNOWN), { code: WalletError.UNKNOWN, cause: err });
  }

  if (!accounts || accounts.length === 0) {
    throw Object.assign(new Error(WalletError.USER_REJECTED), { code: WalletError.USER_REJECTED });
  }

  // Step 2: Enforce correct chain (auto-switch, no reload)
  await enforceChain();

  // Step 3: Build provider + signer + fetch balance
  const provider = new BrowserProvider(window.ethereum);
  const address  = accounts[0];

  let signer;
  try {
    signer = await provider.getSigner();
    // Sanity-check signer validity
    await signer.getAddress();
  } catch {
    throw Object.assign(new Error(WalletError.INVALID_SIGNER), { code: WalletError.INVALID_SIGNER });
  }

  const rawBalance = await provider.getBalance(address);
  const balance    = formatEther(rawBalance);
  const network    = await provider.getNetwork();
  const chainId    = Number(network.chainId);

  // Step 4: Persist only the address
  saveAddress(address);

  return { provider, signer, address, balance, chainId };
}

// ─── Core: silent reconnect (no popup) ───────────────────────────────────────

/**
 * Silently checks if the wallet is still authorized.
 * Uses eth_accounts — NEVER shows a MetaMask popup.
 * Called on app load and after accountsChanged / chainChanged events.
 *
 * @returns {Promise<{ provider, signer, address, balance, chainId } | null>}
 */
export async function reconnectWallet() {
  if (typeof window === 'undefined' || !window.ethereum) return null;

  let accounts;
  try {
    // eth_accounts: returns currently authorized accounts without prompting
    accounts = await window.ethereum.request({ method: 'eth_accounts' });
  } catch {
    return null;
  }

  if (!accounts || accounts.length === 0) {
    clearStoredWallet();
    return null;
  }

  const address = accounts[0];

  // Verify match with stored address (cleared stale data if account was switched externally)
  const stored = getStoredAddress();
  if (stored && stored.toLowerCase() !== address.toLowerCase()) {
    saveAddress(address); // Update to new address
  } else if (!stored) {
    saveAddress(address);
  }

  try {
    const provider   = new BrowserProvider(window.ethereum);
    const signer     = await provider.getSigner();
    const network    = await provider.getNetwork();
    const chainId    = Number(network.chainId);
    const rawBalance = await provider.getBalance(address);
    const balance    = formatEther(rawBalance);

    return { provider, signer, address, balance, chainId };
  } catch {
    return null;
  }
}

/**
 * Clears persisted wallet data from localStorage.
 */
export function disconnectWallet() {
  clearStoredWallet();
}

// ─── Provider helpers ─────────────────────────────────────────────────────────

/** Browser-injected provider. Throws NO_WALLET if MetaMask absent. */
export function getProvider() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw Object.assign(new Error(WalletError.NO_WALLET), { code: WalletError.NO_WALLET });
  }
  return new BrowserProvider(window.ethereum);
}

/** Read-only provider for server/agent use — no MetaMask required. */
export function getReadOnlyProvider(rpcUrl) {
  return new JsonRpcProvider(rpcUrl);
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/** "0x1234...abcd" */
export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Balance ──────────────────────────────────────────────────────────────────

/**
 * @param {string} address
 * @param {BrowserProvider | JsonRpcProvider} [providerOverride]
 * @returns {Promise<string>}  ETH, formatted
 */
export async function getBalance(address, providerOverride) {
  const p   = providerOverride ?? getProvider();
  const raw = await p.getBalance(address);
  return formatEther(raw);
}

// ─── ERC-20 ABI (minimal) ─────────────────────────────────────────────────────

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

// ─── USDT transfer ────────────────────────────────────────────────────────────

/**
 * Sends USDT to a recipient.
 *
 * @param {string} to
 * @param {number|string} amount   human-readable USDT (e.g. 50 or "50.00")
 * @param {import('ethers').Signer} signer
 * @returns {Promise<string>}      transaction hash
 */
export async function sendUSDT(to, amount, signer) {
  if (!signer) {
    throw Object.assign(new Error(WalletError.INVALID_SIGNER), { code: WalletError.INVALID_SIGNER });
  }
  if (!USDT_ADDRESS) {
    throw new Error('USDT contract address not configured. Set VITE_USDT_ADDRESS in .env');
  }

  const contract = new Contract(USDT_ADDRESS, ERC20_ABI, signer);

  let tx;
  try {
    tx = await contract.transfer(to, parseUnits(amount.toString(), 6));
  } catch (err) {
    if (err?.code === 4001 || err?.info?.error?.code === 4001) {
      throw Object.assign(new Error(WalletError.USER_REJECTED), { code: WalletError.USER_REJECTED });
    }
    throw err;
  }

  await tx.wait();
  return tx.hash;
}

// ─── Generic ERC-20 ──────────────────────────────────────────────────────────

/**
 * @param {string} tokenAddress
 * @param {string} to
 * @param {string|number} amount
 * @param {import('ethers').Signer} signer
 * @returns {Promise<string>}  tx hash
 */
export async function sendToken(tokenAddress, to, amount, signer) {
  if (!signer) {
    throw Object.assign(new Error(WalletError.INVALID_SIGNER), { code: WalletError.INVALID_SIGNER });
  }
  const contract = new Contract(tokenAddress, ERC20_ABI, signer);
  let decimals;
  try { decimals = await contract.decimals(); } catch { decimals = 18; }

  let tx;
  try {
    tx = await contract.transfer(to, parseUnits(amount.toString(), decimals));
  } catch (err) {
    if (err?.code === 4001 || err?.info?.error?.code === 4001) {
      throw Object.assign(new Error(WalletError.USER_REJECTED), { code: WalletError.USER_REJECTED });
    }
    throw err;
  }
  await tx.wait();
  return tx.hash;
}

/**
 * @param {string} tokenAddress
 * @param {string} walletAddress
 * @param {BrowserProvider | JsonRpcProvider} [providerOverride]
 */
export async function getTokenBalance(tokenAddress, walletAddress, providerOverride) {
  const p        = providerOverride ?? getProvider();
  const contract = new Contract(tokenAddress, ERC20_ABI, p);
  const [raw, decimals, symbol] = await Promise.all([
    contract.balanceOf(walletAddress),
    contract.decimals(),
    contract.symbol(),
  ]);
  return {
    formatted: (Number(raw) / 10 ** Number(decimals)).toFixed(4),
    raw,
    symbol,
    decimals: Number(decimals),
  };
}

/**
 * Generic contract call. Pass signer for writes, null for reads.
 */
export async function callContract(contractAddress, abi, methodName, args = [], signer = null, providerOverride) {
  const runner   = signer ?? (providerOverride ?? getProvider());
  const contract = new Contract(contractAddress, abi, runner);
  return contract[methodName](...args);
}
