import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Terminal, Shield, Zap, Database, CheckCircle2, XCircle, Clock, ChevronRight, Activity, Lock, Globe, Cpu, ArrowUpRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

const FADE_UP = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const STAGGER = {
  visible: { transition: { staggerChildren: 0.1 } }
};

export function Landing() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const { user, login, isLoggingIn } = useAuth();
  const navigate = useNavigate();

  const handleLaunch = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    if (user) {
      navigate('/dashboard');
    } else {
      try {
        await login();
        navigate('/dashboard');
      } catch (error) {
        console.error("Login failed", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/20" />
              <Zap className="w-5 h-5 text-zinc-950 relative z-10" />
            </div>
            <span className="font-semibold text-lg tracking-tight text-white uppercase font-mono">Aegis</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
            <a href="#use-cases" className="hover:text-white transition-colors">Use Cases</a>
          </div>
          <button 
            onClick={handleLaunch}
            disabled={isLoggingIn}
            className="px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isLoggingIn ? 'Logging in...' : (user ? 'Launch App' : 'Login / Signup')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        {/* HERO SECTION */}
        <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
          
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={STAGGER}
            className="relative z-10 max-w-4xl mx-auto"
          >
            <motion.div variants={FADE_UP} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-mono mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              AEGIS CORE V1.0 ONLINE
            </motion.div>
            
            <motion.h1 variants={FADE_UP} className="text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tighter text-white mb-8 leading-[1.1]">
              AI That Controls Money <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Autonomously.</span>
            </motion.h1>
            
            <motion.p variants={FADE_UP} className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Aegis analyzes, decides, and executes USDT payments in real-time. The first truly autonomous treasury management system.
            </motion.p>
            
            <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={handleLaunch}
                disabled={isLoggingIn}
                className="px-8 py-4 bg-white text-black rounded-full text-lg font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50"
              >
                {isLoggingIn ? 'Logging in...' : (user ? 'View Live Agent' : 'Login to View Agent')} <ArrowRight className="w-5 h-5" />
              </button>
              <a 
                href="#preview" 
                className="px-8 py-4 bg-zinc-900 text-white border border-zinc-800 rounded-full text-lg font-medium hover:bg-zinc-800 transition-colors w-full sm:w-auto justify-center flex items-center"
              >
                See How It Works
              </a>
            </motion.div>
          </motion.div>
        </section>

        {/* LIVE AGENT PREVIEW */}
        <section id="preview" className="max-w-5xl mx-auto px-6 py-24 relative">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-black border border-zinc-800/80 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] relative"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none opacity-20" />
            
            <div className="h-12 bg-zinc-950 border-b border-zinc-800/80 flex items-center px-6 gap-3 relative z-10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="ml-4 text-zinc-400 text-xs font-mono flex items-center gap-2 uppercase tracking-widest">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live Execution Feed
              </div>
            </div>
            
            <div className="p-6 font-mono text-sm space-y-4 relative z-10 h-[300px] overflow-hidden flex flex-col justify-end">
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black to-transparent z-10" />
              <AnimatedTerminal />
            </div>
          </motion.div>
        </section>

        {/* PROBLEM / SOLUTION */}
        <section className="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Manual treasury is <span className="text-zinc-500">slow and risky.</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white mb-2">Bottlenecks</h3>
                    <p className="text-zinc-400 leading-relaxed">Human approvals take days. Operations stall while waiting for multisig signers to wake up.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white mb-2">Human Error</h3>
                    <p className="text-zinc-400 leading-relaxed">Manual verification leads to mistakes, duplicate payments, and missed fraudulent invoices.</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
                Aegis is <span className="text-emerald-400">instant and secure.</span>
              </h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white mb-2">Millisecond Execution</h3>
                    <p className="text-zinc-400 leading-relaxed">AI evaluates context, checks policy, and signs transactions on-chain instantly.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Cpu className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white mb-2">Cryptographic Verification</h3>
                    <p className="text-zinc-400 leading-relaxed">Every decision is logged, reasoned, and executed with mathematical precision.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-6">How Aegis Works</h2>
            <p className="text-xl text-zinc-400">A fully autonomous pipeline from request to settlement.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent -translate-y-1/2 z-0" />
            
            {[
              { step: '01', title: 'Detect', desc: 'Ingests invoices, receipts, and API requests instantly.', icon: Activity },
              { step: '02', title: 'Decide', desc: 'LLMs analyze context against historical data and company policy.', icon: Cpu },
              { step: '03', title: 'Execute', desc: 'Signs and broadcasts USDT transactions directly on-chain.', icon: Database },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative z-10 bg-zinc-950 border border-zinc-800 p-8 rounded-3xl text-center group hover:border-emerald-500/50 transition-colors"
              >
                <div className="w-16 h-16 mx-auto bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30">
                  <item.icon className="w-8 h-8 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <div className="text-sm font-mono text-emerald-500 mb-4">{item.step}</div>
                <h3 className="text-2xl font-medium text-white mb-4">{item.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-32 border-t border-white/5">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-3xl md:col-span-2 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-colors" />
              <div className="relative z-10 max-w-xl">
                <h3 className="text-3xl font-semibold text-white mb-4">Autonomous Decisions</h3>
                <p className="text-lg text-zinc-400 mb-8">Aegis doesn't just route approvals—it makes them. Using advanced LLMs, it understands context, checks budgets, and approves expenses without human intervention.</p>
                <ul className="space-y-3">
                  {['Contextual understanding of receipts', 'Historical spending analysis', 'Dynamic policy enforcement'].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-zinc-300">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-3xl relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[60px] group-hover:bg-blue-500/10 transition-colors" />
              <div className="relative z-10">
                <Globe className="w-10 h-10 text-blue-400 mb-6" />
                <h3 className="text-2xl font-semibold text-white mb-4">On-Chain Execution</h3>
                <p className="text-zinc-400 leading-relaxed">Settles payments instantly in USDT across multiple networks. No banks, no borders, no delays.</p>
              </div>
            </div>
            
            <div className="bg-zinc-950 border border-zinc-800 p-10 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[60px] group-hover:bg-orange-500/10 transition-colors" />
              <div className="relative z-10">
                <Lock className="w-10 h-10 text-orange-400 mb-6" />
                <h3 className="text-2xl font-semibold text-white mb-4">Fraud Detection</h3>
                <p className="text-zinc-400 leading-relaxed">Real-time anomaly detection flags suspicious requests, duplicate invoices, and out-of-policy spending.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-5xl mx-auto px-6 py-32 text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 p-16 rounded-[3rem] relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-white mb-6">
                Ready to automate your treasury?
              </h2>
              <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
                Stop waiting for approvals. Start executing at the speed of code.
              </p>
              <button 
                onClick={handleLaunch}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full text-lg font-medium hover:bg-zinc-200 hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50"
              >
                {isLoggingIn ? 'Logging in...' : (user ? 'Launch Dashboard' : 'Login to Launch')} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </section>
      </main>
      
      <footer className="border-t border-white/5 py-12 text-center text-zinc-500 text-sm">
        <p>© 2026 Aegis Core. All rights reserved.</p>
      </footer>
    </div>
  );
}

function AnimatedTerminal() {
  const [lines, setLines] = useState<any[]>([]);
  
  const initialLines = [
    { type: 'sys', text: 'Initializing Aegis Core v1.0.4...' },
    { type: 'sys', text: 'Connecting to treasury smart contracts...' },
    { type: 'sys', text: 'System online. Monitoring for requests.' },
  ];
  
  const dynamicLines = [
    { type: 'ai', text: 'Incoming expense detected: AWS Cloud Services ($4,250.00)' },
    { type: 'ai', text: 'Analyzing historical AWS spend (Avg: $4,100.00)...' },
    { type: 'ai', text: 'Variance within acceptable limits (+3.6%).' },
    { type: 'decision', text: 'Decision: APPROVED. Reason: Matches recurring infrastructure costs.' },
    { type: 'tx', text: 'Executing on-chain transfer of 4250 USDT...' },
    { type: 'tx', text: 'Transaction confirmed. Hash: 0x8f4c...3b9a' },
    { type: 'sys', text: 'Awaiting next event...' },
  ];

  useEffect(() => {
    let currentLine = 0;
    let isDynamic = false;
    
    setLines([initialLines[0]]);
    
    const interval = setInterval(() => {
      if (!isDynamic) {
        currentLine++;
        if (currentLine < initialLines.length) {
          setLines(prev => [...prev, initialLines[currentLine]]);
        } else {
          isDynamic = true;
          currentLine = 0;
          setTimeout(() => {
            setLines(prev => [...prev, dynamicLines[0]]);
          }, 1500);
        }
      } else {
        currentLine++;
        if (currentLine < dynamicLines.length) {
          setLines(prev => [...prev, dynamicLines[currentLine]]);
        } else {
          // Reset dynamic part
          setTimeout(() => {
            setLines([...initialLines]);
            currentLine = 0;
            isDynamic = false;
          }, 3000);
        }
      }
    }, 1200);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {lines.map((line, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={clsx(
            "flex items-start gap-3",
            line.type === 'ai' ? "text-blue-300" :
            line.type === 'tx' ? "text-emerald-300" :
            line.type === 'decision' ? "text-emerald-400 font-bold" :
            "text-zinc-400"
          )}
        >
          <span className="shrink-0 font-bold">
            {line.type === 'ai' ? '[AI]' :
             line.type === 'tx' ? '[TX]' :
             line.type === 'decision' ? '[OK]' :
             '[SYS]'}
          </span>
          <span>{line.text}</span>
        </motion.div>
      ))}
    </>
  );
}
