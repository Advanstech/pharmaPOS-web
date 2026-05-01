'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { ShieldCheck, WifiOff, BarChart3, Pill, ArrowRight, CheckCircle2, Stethoscope, Activity, CreditCard, Clock, Syringe, FlaskConical, TestTube, Microscope, Users, BrainCircuit, LineChart, Network, Zap } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { postLoginPathForRole } from '@/lib/auth/post-login-path';
import { GhsMoney } from '@/components/ui/ghs-money';
import { PharmaNewsTicker } from '@/components/marketing/pharma-news-ticker';

function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/40 dark:from-black/40 dark:via-transparent dark:to-black/40 z-10" />
      <img 
        src="/hero-bg.png" 
        alt="Azzay Pharmacy Hero" 
        className="w-full h-full object-cover opacity-60 dark:opacity-30"
      />
    </div>
  );
}

const HERO_WORDS = ["Compliance.", "Speed.", "Intelligence.", "Scale."];

export default function LandingPage() {
  const router = useRouter();
  const prefersReduced = useReducedMotion();
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const { user, refreshToken } = useAuthStore.getState();
    if (user && refreshToken) {
      router.replace(postLoginPathForRole(user.role));
    }
  }, [router]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-base)' }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-transparent transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center gap-2 min-w-0">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-md border border-emerald-100">
              <img src="/logo.png" alt="Azzay Pharmacy Logo" className="w-full h-full object-contain p-1" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Azzay Pharmacy <span className="font-normal" style={{ color: 'var(--color-teal)' }}>Pro</span>
            </span>
          </Link>
          <PharmaNewsTicker />
          <div className="flex items-center gap-4 shrink-0 ml-auto">
            <a href="#pricing" className="text-sm font-medium hidden sm:block hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>
              Subscriptions
            </a>
            <Link 
              href="/login" 
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
              style={{ background: 'var(--color-teal)' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden">
        {/* Background Blobs */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-[100px] opacity-30 -z-10 translate-x-1/2 -translate-y-1/2" style={{ background: 'var(--color-teal)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[80px] opacity-30 -z-10 -translate-x-1/2 translate-y-1/2" style={{ background: 'var(--color-gold)' }} />
        
        <HeroBackground />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={prefersReduced ? "visible" : "hidden"}
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8 shadow-sm backdrop-blur-sm" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
              <span className="flex h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--color-teal)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>The standard for African Pharmacies</span>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-[1.1]" style={{ color: 'var(--text-primary)' }}>
                Intelligent Pharmacy POS <br />
                <span className="inline-flex flex-wrap justify-center items-center">
                  Built for&nbsp;
                  <span className="text-gradient-teal inline-grid text-left">
                    <span className="invisible col-start-1 row-start-1">Compliance.</span>
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={wordIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                        className="col-start-1 row-start-1"
                      >
                        {HERO_WORDS[wordIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </span>
              </h1>
            </motion.div>

            <motion.p variants={fadeInUp} className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Automate FDA compliance, delight patients with digital receipts, predict stockouts with AI, and serve customers faster with a system built for extreme offline reliability.
            </motion.p>
            
            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/login"
                className="group flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold text-white transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--color-teal-dark) 0%, var(--color-teal) 60%, #00838F 100%)', boxShadow: '0 8px 32px rgba(0,109,119,0.3)' }}
              >
                Launch Point of Sale
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <a 
                href="#features"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-semibold border transition-all active:scale-95"
                style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}
              >
                Explore Features
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Dramatic Features Grid */}
      <section id="features" className="py-32 px-6 relative overflow-hidden" style={{ background: 'var(--surface-base)' }}>
        {/* Dramatic background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] opacity-30 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, var(--color-teal) 0%, transparent 70%)', filter: 'blur(100px)' }} />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div
              initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Unfair advantages,<br className="hidden md:block" /> built right in.
              </h2>
              <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                We didn't just build a POS. We engineered a clinical powerhouse that runs your pharmacy on autopilot.
              </p>
            </motion.div>
          </div>

          <motion.div 
            initial={prefersReduced ? "visible" : "hidden"}
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <FeatureCard 
              icon={<ShieldCheck size={28} style={{ color: 'var(--color-gold)' }} />}
              title="Bulletproof Compliance"
              description="Sleep soundly. Military-grade Rx verification, pharmacist approval workflows, and automated controlled substance tracking."
            />
            <FeatureCard 
              icon={<Network size={28} style={{ color: 'var(--color-teal)' }} />}
              title="Unbreakable Offline POS"
              description="Internet goes down? Keep ringing up sales at 0.3s speeds. Everything syncs flawlessly to the cloud the millisecond you reconnect."
            />
            <FeatureCard 
              icon={<Users size={28} style={{ color: 'var(--color-gold)' }} />}
              title="Modern Patient CRM"
              description="Instantly create customer profiles at checkout. Send professional digital receipts via email and trigger automated SMS health alerts."
            />
            <FeatureCard 
              icon={<BrainCircuit size={28} style={{ color: 'var(--color-teal)' }} />}
              title="Pharma AI Copilot"
              description="Powered by OpenAI. Get live WHO/BBC market intelligence, predictive stock reordering, and smart inventory insights."
            />
            <FeatureCard 
              icon={<LineChart size={28} style={{ color: 'var(--color-gold)' }} />}
              title="CFO-Grade Intelligence"
              description="Real-time profitability tracking, automated audit logs, and beautifully branded executive PDF briefings sent straight to your inbox."
            />
            <FeatureCard 
              icon={<Zap size={28} style={{ color: 'var(--color-teal)' }} />}
              title="Multi-Branch Scale"
              description="Manage staff roles, shift limits, and real-time inventory transfers across all your locations from a single centralized dashboard."
            />
          </motion.div>
        </div>
      </section>

      {/* Pricing / Subscriptions */}
      <section id="pricing" className="py-24 px-6 relative border-t" style={{ background: 'var(--surface-base)', borderColor: 'var(--surface-border)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Simple, transparent pricing</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Choose the plan that fits your pharmacy's scale.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="p-8 rounded-3xl border shadow-sm" style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Starter</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Perfect for single-branch chemical shops.</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>Free</span>
                <span style={{ color: 'var(--text-muted)' }}> / forever</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> 1 Branch</li>
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> Up to 3 Staff Accounts</li>
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> Basic POS & Offline Mode</li>
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> Standard Inventory</li>
              </ul>
              <Link href="/login" className="block w-full py-3 px-4 rounded-xl text-center font-semibold border transition-all hover:opacity-80" style={{ borderColor: 'var(--surface-border)', color: 'var(--text-primary)' }}>
                Get Started
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="p-8 rounded-3xl border relative shadow-xl" style={{ background: 'var(--surface-card)', borderColor: 'var(--color-teal)' }}>
              <div className="absolute top-0 right-8 -translate-y-1/2 px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm" style={{ background: 'var(--color-teal)' }}>
                MOST POPULAR
              </div>
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Professional</h3>
                <p style={{ color: 'var(--text-secondary)' }}>For growing multi-branch pharmacies.</p>
              </div>
              <div className="mb-6">
                <span style={{ color: 'var(--text-primary)' }}>
                  <GhsMoney amount={499} className="text-4xl font-bold" />
                </span>
                <span style={{ color: 'var(--text-muted)' }}> / month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> Unlimited Branches & Staff</li>
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> AI Copilot & Market Intelligence</li>
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> Digital Email Receipts & SMS</li>
                <li className="flex items-center gap-3" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={18} style={{ color: 'var(--color-teal)' }} /> CFO Briefing & Audit Logs</li>
              </ul>
              <Link href="/login" className="block w-full py-3 px-4 rounded-xl text-center font-semibold text-white transition-all hover:opacity-90 shadow-md" style={{ background: 'var(--color-teal)' }}>
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6" style={{ background: 'var(--color-teal-dark)' }}>
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="pt-8 md:pt-0">
            <p className="text-5xl font-bold text-white mb-2 tracking-tight">0.3s</p>
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--color-teal-light)' }}>Average Checkout Time</p>
          </div>
          <div className="pt-8 md:pt-0">
            <p className="text-5xl font-bold mb-2 tracking-tight" style={{ color: 'var(--color-gold)' }}>100%</p>
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--color-teal-light)' }}>Offline Capability</p>
          </div>
          <div className="pt-8 md:pt-0">
            <p className="text-5xl font-bold text-white mb-2 tracking-tight">3X</p>
            <p className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--color-teal-light)' }}>Faster stock refilling</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-24 px-6 text-center">
        <motion.div 
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="max-w-4xl mx-auto rounded-[2rem] p-12 shadow-2xl border"
          style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Ready to upgrade your pharmacy?</h2>
          <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>Join the fastest growing network of modern pharmacies across the continent.</p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <Link 
              href="/login"
              className="px-8 py-4 rounded-xl text-lg font-semibold text-white transition-all active:scale-95 w-full sm:w-auto"
              style={{ background: 'var(--color-teal)' }}
            >
              Start using Azzay Pharmacy
            </Link>
            <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-teal)' }} /> No credit card required
            </span>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--surface-border)' }}>
        <p>© {new Date().getFullYear()} Advansis Technologies. Built for African Pharmacies.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  const prefersReduced = useReducedMotion();
  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={prefersReduced ? {} : item}
      className="group relative p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{ background: 'var(--surface-card)', borderColor: 'var(--surface-border)' }}
    >
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(0,109,119,0.05), transparent 60%)' }} />
      <div className="w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110" style={{ background: 'var(--surface-base)' }}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      <p className="leading-relaxed text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>{description}</p>
    </motion.div>
  );
}
