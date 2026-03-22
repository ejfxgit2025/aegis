/**
 * server/services/payment.js
 * 
 * Production-ready backend payment service for Aegis AI.
 * Uses ethers v6 to send USDT on the configured Evm chain.
 */

import { JsonRpcProvider, Wallet, Contract, parseUnits, isAddress } from 'ethers';

// ─── Environment Configuration ───────────────────────────────────────────────

const RPC_URL      = process.env.RPC_URL;
const PRIVATE_KEY  = process.env.PRIVATE_KEY;
const USDT_ADDRESS = process.env.USDT_ADDRESS;

// Minimal ERC-20 ABI for Transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)'
];

let provider: JsonRpcProvider;
let wallet: Wallet;
let usdtContract: Contract;

// ─── Initialization ─────────────────────────────────────────────────────────

function initWallet() {
  if (!RPC_URL) throw new Error('Missing RPC_URL in environment');
  if (!PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY in environment');
  if (!USDT_ADDRESS) throw new Error('Missing USDT_ADDRESS in environment');

  provider = new JsonRpcProvider(RPC_URL);
  wallet = new Wallet(PRIVATE_KEY, provider);
  usdtContract = new Contract(USDT_ADDRESS, ERC20_ABI, wallet);
  
  console.log(`[PaymentService] Initialized Wallet: ${wallet.address}`);
}

// ─── Core Payment Logic ─────────────────────────────────────────────────────

/**
 * Sends USDT to the specified address.
 * 
 * @param {string} to - Recipient Ethereum address (0x...)
 * @param {number|string} amount - Amount in USDT (e.g., 100)
 * @returns {Promise<{success: boolean, txHash: string}>}
 * @throws {Error} if validation fails or transaction reverts
 */
export async function sendUSDT(to: string, amount: number | string): Promise<{success: boolean, txHash: string}> {
  // Lazy init to ensure env vars are loaded when this is called
  if (!wallet) initWallet();

  // 1. Validate 'to' address
  if (!isAddress(to)) {
    throw new Error('Invalid recipient address format');
  }

  // 2. Validate 'amount'
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new Error('Amount must be greater than 0');
  }


  try {
    console.log(`[PaymentService] Initiating transfer of ${amount} USDT to ${to}...`);
    
    // USDT uses 6 decimal places on most EVM chains
    const parsedAmount = parseUnits(amount.toString(), 6);
    
    // Execute transfer
    const tx = await usdtContract.transfer(to, parsedAmount);
    console.log(`[PaymentService] Tx broadcasted: ${tx.hash}. Waiting for confirmation...`);
    
    // Wait for the transaction to be mined
    await tx.wait();
    console.log(`[PaymentService] Transfer complete: ${tx.hash}`);

    return {
      success: true,
      txHash: tx.hash
    };
  } catch (err: any) {
    console.error(`[PaymentService] Transfer failed to ${to}:`, err.message || err);
    throw new Error(`Transfer failed: ${err.shortMessage || err.message}`);
  }
}
