import { BrowserProvider, Contract, formatUnits } from 'ethers';

// ─── Config ────────────────────────────────────────────────────────────────────

const USDT_ADDRESS: string = import.meta.env.VITE_USDT_ADDRESS || '';
const USDT_DECIMALS = 6;

// ─── ABI ───────────────────────────────────────────────────────────────────────

export const USDT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface USDTTransfer {
  id: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;       // human-readable, e.g. "50.00"
  amountRaw: bigint;
  direction: 'sent' | 'received';
  blockNumber: number;
  timestamp: number | null; // milliseconds; null if block timestamp unavailable
}

// ─── Contract factory ──────────────────────────────────────────────────────────

function getContract(providerOrSigner: BrowserProvider) {
  if (!USDT_ADDRESS) {
    throw new Error('VITE_USDT_ADDRESS is not set. Check your .env file.');
  }
  return new Contract(USDT_ADDRESS, USDT_ABI, providerOrSigner);
}

function getProvider(): BrowserProvider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask.');
  }
  return new BrowserProvider(window.ethereum);
}

// ─── getBalance ────────────────────────────────────────────────────────────────

/**
 * Returns the USDT balance for `address`, formatted with 6 decimals.
 * @example "1234.56"
 */
export async function getBalance(address: string): Promise<string> {
  const provider = getProvider();
  const contract = getContract(provider);
  const raw: bigint = await contract.balanceOf(address);
  return formatUnits(raw, USDT_DECIMALS);
}

// ─── getTransfers ──────────────────────────────────────────────────────────────

/**
 * Returns a merged, newest-first list of USDT Transfer events where
 * `address` is sender OR receiver. Fetches the last ~2000 blocks.
 */
export async function getTransfers(address: string): Promise<USDTTransfer[]> {
  const provider = getProvider();
  const contract = getContract(provider);

  const latestBlock = await provider.getBlockNumber();
  const fromBlock   = Math.max(0, latestBlock - 2000);

  // Filter sent  (from = address)
  const sentFilter = contract.filters.Transfer(address, null);
  // Filter received (to = address)
  const receivedFilter = contract.filters.Transfer(null, address);

  const [sentEvents, receivedEvents] = await Promise.all([
    contract.queryFilter(sentFilter, fromBlock, 'latest'),
    contract.queryFilter(receivedFilter, fromBlock, 'latest'),
  ]);

  // Deduplicate (a transfer to self would appear in both)
  const seen = new Set<string>();
  const all = [...sentEvents, ...receivedEvents].filter((e) => {
    const key = `${e.transactionHash}-${e.index ?? 0}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Resolve block timestamps in parallel (with fallback)
  const transfersWithTime = await Promise.all(
    all.map(async (event): Promise<USDTTransfer> => {
      const log = event as any;
      const args = log.args ?? {};
      const from: string  = args[0] ?? args.from ?? '';
      const to: string    = args[1] ?? args.to   ?? '';
      const value: bigint = args[2] ?? args.value ?? 0n;

      let timestamp: number | null = null;
      try {
        const block = await provider.getBlock(log.blockNumber);
        if (block?.timestamp) timestamp = block.timestamp * 1000;
      } catch {
        // Non-fatal
      }

      const lowerAddr = address.toLowerCase();
      const direction: 'sent' | 'received' = from.toLowerCase() === lowerAddr ? 'sent' : 'received';

      return {
        id: `${log.transactionHash}-${log.index ?? 0}`,
        txHash: log.transactionHash ?? '',
        from,
        to,
        amount: formatUnits(value, USDT_DECIMALS),
        amountRaw: value,
        direction,
        blockNumber: log.blockNumber ?? 0,
        timestamp,
      };
    })
  );

  // Sort newest first
  return transfersWithTime.sort((a, b) => b.blockNumber - a.blockNumber);
}
