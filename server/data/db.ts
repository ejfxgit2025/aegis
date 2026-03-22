import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'server', 'data', 'treasury.json');

export interface TreasuryData {
  balance: number;
  dailyLimit: number;
  spentToday: number;
  autoMode: boolean;
  expenses: any[];
  alerts: any[];
  logs: any[];
  rules: any[];
  automations: any[];
}

export interface TreasuryData {
  balance: number;
  dailyLimit: number;
  spentToday: number;
  autoMode: boolean;
  expenses: any[];
  alerts: any[];
  logs: any[];
  rules: any[];
  automations: any[];
}

let MOCK_DATA: TreasuryData = {
  balance: 1500000.00,
  dailyLimit: 50000.00,
  spentToday: 12450.00,
  autoMode: false,
  expenses: [],
  alerts: [],
  logs: [],
  rules: [
    {
      id: '1',
      type: 'recurring',
      amount: 500,
      token: 'USDT',
      interval: 'daily',
      recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      status: 'active',
      description: 'Daily AWS Server Costs'
    },
    {
      id: '2',
      type: 'trigger',
      condition: 'api_usage > 10000',
      action: 'send_payment',
      amount: 1000,
      token: 'USDC',
      recipient: '0x123...abc',
      status: 'active',
      description: 'OpenAI API Overage'
    }
  ],
  automations: []
};

export async function getTreasuryData(): Promise<TreasuryData> {
  return MOCK_DATA;
}

export async function saveTreasuryData(data: TreasuryData) {
  MOCK_DATA = { ...data };
}
