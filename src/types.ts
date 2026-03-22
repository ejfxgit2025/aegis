export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  walletAddress: string | null;
  createdAt: string;
  balance: number;
  role: string;
}

export type RuleType = 'recurring' | 'trigger';

export interface PaymentRule {
  id: string;
  userId: string;
  type: RuleType;
  amount: number;
  token: string;
  interval?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  condition?: string;
  action: 'send_payment';
  recipient: string;
  description: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  ruleId?: string;
  amount: number;
  token: string;
  recipient: string;
  status: 'pending' | 'completed' | 'failed' | 'rejected';
  txHash?: string;
  reason?: string;
  timestamp: string;
}

export interface AutomationLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'decision';
  ruleId?: string;
}
