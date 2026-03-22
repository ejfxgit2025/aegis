import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { AgentActivity } from './components/AgentActivity';
import { PaymentRules } from './components/PaymentRules';
import { Automations } from './components/Automations';
import { Landing } from './components/Landing';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { Onboarding } from './components/Onboarding';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-emerald-500 font-mono text-sm animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // If the user hasn't set up a custom name, redirect to onboarding 
  // so they can choose their display name instead of being stuck with default.
  const { userProfile } = useAuth();
  if (userProfile && (!userProfile.name || userProfile.name.trim() === "")) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

function AppLayout() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30 relative">
      {/* Ambient background glow and grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[150px] pointer-events-none" />
      
      <Sidebar />
      <main className="pl-0 lg:pl-64 min-h-screen relative z-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/rules" element={<PaymentRules />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/agent" element={<AgentActivity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </WalletProvider>
  );
}
