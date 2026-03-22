import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

export function Onboarding() {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }
    
    setSaving(true);

    const profile = {
      uid: user.uid,
      name: name.trim() || user.displayName || 'New User',
      email: user.email || '',
      walletAddress: null,
      createdAt: new Date().toISOString(),
      balance: 10000,
      role: 'user',
    };

    try {
      // Use updateUserProfile from context to ensure state and DB both sync correctly
      await updateUserProfile({
        name: name.trim()
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving profile', error);
      // Fallback: still let them into the dashboard if it fails
      navigate('/dashboard');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 max-w-md w-full backdrop-blur-sm">
        <h2 className="text-2xl font-semibold text-white mb-2">Complete your profile</h2>
        <p className="text-zinc-400 text-sm mb-6">Choose a display name to get started.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-4 text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="Enter your name"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
