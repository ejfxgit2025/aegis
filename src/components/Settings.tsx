import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Shield, Zap, LogOut, User as UserIcon, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Settings() {
  const { user, logout, walletAddress, walletBalance, connectWallet, disconnectWallet } = useAuth();
  const [dailyLimit, setDailyLimit] = useState(50000);
  const [autoMode, setAutoMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    fetch('/api/settings/limit')
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (typeof data.limit === 'number') setDailyLimit(data.limit);
      })
      .catch(err => console.error('Failed to load limit', err));

    fetch('/api/treasury')
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (data.autoMode !== undefined) setAutoMode(data.autoMode);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      // Save daily limit to the dedicated endpoint
      const limitRes = await fetch('/api/settings/limit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: dailyLimit })
      });
      if (!limitRes.ok) throw new Error('Failed to save limit');

      // Save autoMode via legacy endpoint
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoMode })
      });

      setSaveMessage('Settings saved successfully.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setSaveMessage('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white font-mono">System Settings</h1>
        <p className="text-zinc-400 mt-2">Configure Aegis autonomous behavior and limits.</p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <UserIcon className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">User Profile</h2>
              <p className="text-sm text-zinc-400">Manage your account access.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50 mb-4">
            <div className="flex items-center gap-4">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full border border-zinc-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-zinc-400" />
                </div>
              )}
              <div>
                <p className="font-medium text-white">{user?.displayName || 'Unknown User'}</p>
                <p className="text-sm text-zinc-400">{user?.email}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Wallet className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-white">Web3 Wallet</p>
                {walletAddress ? (
                  <div className="flex flex-col">
                    <p className="text-sm text-zinc-400 font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
                    <p className="text-xs text-emerald-400 font-mono">{Number(walletBalance).toFixed(4)} ETH</p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">Not connected</p>
                )}
              </div>
            </div>
            {walletAddress ? (
              <button 
                onClick={disconnectWallet}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm font-medium transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <button 
                onClick={connectWallet}
                className="px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-sm font-medium transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </motion.div>

        {/* Treasury Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Treasury Controls</h2>
              <p className="text-sm text-zinc-400">Set hard limits for autonomous spending.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Daily Spending Limit (USDT)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                <input 
                  type="number"
                  min={1}
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-8 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">The AI agent will automatically reject any expense that exceeds this daily limit.</p>
            </div>
          </div>
        </motion.div>

        {/* Agent Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-medium text-white">Agent Configuration</h2>
              <p className="text-sm text-zinc-400">Control the autonomous processing loop.</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
            <div>
              <p className="font-medium text-white">Auto Agent Mode</p>
              <p className="text-sm text-zinc-400">Allow Aegis to autonomously process incoming expenses.</p>
            </div>
            <button 
              onClick={() => setAutoMode(!autoMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${autoMode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </motion.div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-emerald-400">{saveMessage}</span>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
