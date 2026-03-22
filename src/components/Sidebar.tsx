import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Activity, ShieldAlert, Settings, Zap, Menu, X, ListPlus, PlayCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Payment Rules', path: '/dashboard/rules', icon: ListPlus },
  { name: 'Automations', path: '/dashboard/automations', icon: PlayCircle },
  { name: 'Transactions', path: '/dashboard/transactions', icon: Receipt },
  { name: 'Agent Activity', path: '/dashboard/agent', icon: Activity },
];

export function Sidebar() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  useEffect(() => {
    const fetchTreasury = async () => {
      try {
        const res = await fetch('/api/treasury');
        const json = await res.json().catch(() => ({}));
        setAutoMode(json.autoMode);
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchTreasury();
    const interval = setInterval(fetchTreasury, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={clsx(
        "w-64 h-screen bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-800/50 flex flex-col p-4 fixed left-0 top-0 text-zinc-300 z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 px-2 py-4 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20" />
            <Zap className="w-5 h-5 text-zinc-950 relative z-10" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-white uppercase font-mono">Aegis Core</span>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group',
                  isActive ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={clsx("w-5 h-5 relative z-10 transition-colors", isActive ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                <span className="font-medium text-sm relative z-10 font-mono tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-zinc-800/50">
          <Link 
            to="/dashboard/settings"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-all duration-200 w-full text-left group"
          >
            <Settings className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="font-medium text-sm font-mono tracking-wide">Settings</span>
          </Link>
          
          <div className="mt-4 px-3 py-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center gap-3 relative overflow-hidden group">
            <div className={clsx("absolute inset-0 transition-colors", autoMode ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-zinc-800/10")} />
            <div className={clsx("w-2.5 h-2.5 rounded-full relative z-10", autoMode ? "bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" : "bg-zinc-600")} />
            <div className="flex flex-col relative z-10">
              <span className={clsx("text-xs font-mono font-medium tracking-wider", autoMode ? "text-emerald-400" : "text-zinc-500")}>
                {autoMode ? 'AGENT.ACTIVE' : 'AGENT.STANDBY'}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {autoMode ? 'Monitoring treasury...' : 'Awaiting manual trigger'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
