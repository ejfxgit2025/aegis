import { Wallet, JsonRpcProvider, Contract, parseUnits } from 'ethers';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

export async function sendUSDT(to: string, amount: number | string) {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL;
  const usdtAddress = process.env.USDT_ADDRESS;

  if (!privateKey || !rpcUrl || !usdtAddress) {
    throw new Error('Backend Payment Service configuration missing in .env (PRIVATE_KEY, RPC_URL, USDT_ADDRESS)');
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(privateKey, provider);
  const contract = new Contract(usdtAddress, ERC20_ABI, signer);

  let decimals = 6;
  try {
    decimals = await contract.decimals();
  } catch (err) {
    console.warn('Could not fetch decimals, defaulting to 6');
  }

  let tx;
  try {
    tx = await contract.transfer(to, parseUnits(amount.toString(), decimals));
    // Wait for the transaction to be mined
    await tx.wait();
    return { success: true, txHash: tx.hash, status: 'paid' };
  } catch (error: any) {
    console.error('Backend sendUSDT error:', error);
    throw new Error(error.message || 'Payment processing failed');
  }
}
