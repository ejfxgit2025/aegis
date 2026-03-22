import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from '../firebase';
import { UserProfile } from '../types';
import { useWallet } from './WalletContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  isLoggingIn: boolean;
  setUserProfile: (profile: UserProfile | null) => void;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  // Wallet passthrough — keeps all existing component imports working
  walletAddress: string | null;
  walletBalance: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,        setUser]        = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Pull wallet state from WalletContext (WalletProvider wraps AuthProvider in App.tsx)
  const wallet = useWallet();

  // ── Persist profile to localStorage ────────────────────────────────────────
  const setUserProfileWithPersistence = (profile: UserProfile | null) => {
    if (profile) {
      localStorage.setItem('userProfile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('userProfile');
    }
    setUserProfile(profile);
  };

  // ── Update specific fields in Firestore + local state ─────────────────────
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...data };
    try {
      const profileRef = doc(db, 'users', userProfile.uid);
      await setDoc(profileRef, data, { merge: true });
    } catch (err) {
      console.error('Failed to update Firestore profile (using local fallback):', err);
    }
    setUserProfileWithPersistence(updated);
  };

  // ── Firebase auth listener ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        setUser(currentUser);
        if (currentUser) {
          const profileRef  = doc(db, 'users', currentUser.uid);
          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            const data = profileSnap.data() as UserProfile;
            if (data.name     === undefined) data.name    = '';
            if (data.balance  === undefined) data.balance = 10000;
            if (!data.role)                  data.role    = 'user';
            setUserProfileWithPersistence(data);
          } else {
            const savedProfileStr = localStorage.getItem('userProfile');
            const savedProfile: UserProfile | null = savedProfileStr
              ? JSON.parse(savedProfileStr)
              : null;

            const newProfile: UserProfile = {
              uid:           currentUser.uid,
              name:          savedProfile?.name || '',
              email:         currentUser.email  || '',
              walletAddress: null,
              createdAt:     new Date().toISOString(),
              balance:       10000,
              role:          'user',
            };

            try {
              await setDoc(profileRef, newProfile);
            } catch (err) {
              console.error('Could not create Firestore profile (using local fallback)', err);
            }
            setUserProfileWithPersistence(newProfile);
          }
        } else {
          setUserProfile(null);
          localStorage.removeItem('userProfile');
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        const saved = localStorage.getItem('userProfile');
        if (saved) {
          setUserProfile(JSON.parse(saved));
        } else if (currentUser) {
          setUserProfile({
            uid:           currentUser.uid,
            name:          '',
            email:         currentUser.email || '',
            walletAddress: null,
            createdAt:     new Date().toISOString(),
            balance:       10000,
            role:          'user',
          });
        } else {
          setUserProfile(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // ── Sync wallet address → Firestore when wallet connects ──────────────────
  useEffect(() => {
    if (!wallet.address || !userProfile) return;
    if (userProfile.walletAddress === wallet.address) return; // already in sync

    updateUserProfile({ walletAddress: wallet.address }).catch((err) =>
      console.error('[Aegis] Failed to sync wallet address to Firestore:', err)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.address, userProfile?.uid]);

  // ── Login / logout ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error('Login failed', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      wallet.disconnect(); // clear wallet state on sign-out
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // ── Wallet passthrough helpers ─────────────────────────────────────────────
  // Settings.tsx and Profile.tsx call these via useAuth() — no import changes needed.
  const connectWallet = async () => {
    await wallet.connect();
  };

  const disconnectWallet = () => {
    wallet.disconnect();
    // Also clear walletAddress from Firestore profile
    if (userProfile) {
      updateUserProfile({ walletAddress: null }).catch(() => {});
    }
  };

  // ── Context value ──────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      setUserProfile: setUserProfileWithPersistence,
      updateUserProfile,
      loading,
      isLoggingIn,
      login:    handleLogin,
      logout:   handleLogout,
      // Wallet — forwarded from WalletContext
      walletAddress:    wallet.address,
      walletBalance:    wallet.balance,
      connectWallet,
      disconnectWallet,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
