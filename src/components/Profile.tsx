import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export function Profile() {
  const { userProfile, updateUserProfile, loading } = useAuth();
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Keep local name in sync whenever profile loads
  useEffect(() => {
    if (userProfile?.name) setName(userProfile.name);
  }, [userProfile?.name]);

  const handleSave = async () => {
    if (!userProfile) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await updateUserProfile({ name: trimmed });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(userProfile?.name || '');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-400 text-sm">Loading profile…</span>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-zinc-400">No profile found. Please sign in again.</p>
      </div>
    );
  }

  const formattedDate = userProfile.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : '—';

  const formattedBalance =
    typeof userProfile.balance === 'number'
      ? userProfile.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
      : '—';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-semibold text-white mb-6">Profile</h1>

      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 space-y-5">

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
          {isEditing ? (
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-emerald-500/50"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <p className="text-white">{userProfile.name || 'No name set'}</p>
              <button
                onClick={() => setIsEditing(true)}
                className="text-emerald-400 text-sm hover:underline"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
          <p className="text-white">{userProfile.email || '—'}</p>
        </div>

        {/* Account Created */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Account Created</label>
          <p className="text-white">{formattedDate}</p>
        </div>

        {/* Balance */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Balance</label>
          <p className="text-emerald-400 font-semibold">{formattedBalance}</p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Role</label>
          <span className="inline-block px-3 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-sm capitalize">
            {userProfile.role || 'user'}
          </span>
        </div>

        {/* Wallet Address */}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">Wallet Address</label>
          <p className="text-white font-mono text-sm break-all">
            {userProfile.walletAddress || 'Not connected'}
          </p>
        </div>
      </div>
    </div>
  );
}
