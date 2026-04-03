'use client';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAuthStore } from '@/lib/store/auth.store';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2, Stethoscope, LayoutDashboard, Home, LogOut } from 'lucide-react';
import Link from 'next/link';

export function PosTopBar() {
  const router = useRouter();
  const { isOnline, isReconnecting } = useNetworkStatus();
  const { user, clearAuth } = useAuthStore();

  function handleSignOut() {
    clearAuth();
    router.replace('/login');
  }
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-GH', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Accra',
      }));
      setDate(now.toLocaleDateString('en-GH', {
        weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Accra',
      }));
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="flex flex-wrap items-center justify-between gap-y-2 px-3 sm:px-5 py-1.5 min-h-14 shrink-0"
      style={{
        background:
          'linear-gradient(135deg, color-mix(in oklab, var(--color-teal-dark) 85%, #000 15%) 0%, var(--color-teal-dark) 48%, var(--color-teal) 100%)',
        boxShadow: '0 2px 12px rgba(0,78,87,0.42)',
        borderBottom: '1px solid rgba(255,255,255,0.16)',
      }}
    >
      {/* Left: brand + branch */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-white/15 transition-colors"
            title="Marketing home"
            aria-label="Go to marketing home"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/25 bg-black/20">
              <Stethoscope size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-wide text-white underline-offset-2 hover:underline" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.35)' }}>
              PharmaPOS Pro
            </span>
          </Link>
        </div>
        <span className="text-white/30 text-xs">·</span>
        <span className="text-xs font-semibold text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
          {user?.branch_id ? 'Azzay Pharmacy' : 'Azzay Pharmacy'}
        </span>
        {user && (
          <>
            <span className="text-white/50 text-xs">·</span>
            <span className="text-xs font-semibold text-white/90 capitalize">
              {user.role.replace('_', ' ')}
            </span>
          </>
        )}

        {/* Back to desk + sign out — always visible on POS (touch-friendly min 44px height) */}
        <div
          className="flex items-center gap-1 ml-2 pl-2 border-l border-white/25"
          role="navigation"
          aria-label="Leave POS"
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs font-semibold text-white bg-white/16 hover:bg-white/28 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.28)' }}
            title="Clinical desk, prescriptions, inventory"
            aria-label="Open dashboard"
          >
            <LayoutDashboard size={16} className="shrink-0 opacity-90" aria-hidden />
            <span className="hidden sm:inline">Desk</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs font-semibold text-white bg-white/16 hover:bg-white/28 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.28)' }}
            title="Marketing home"
            aria-label="Go to home page"
          >
            <Home size={16} className="shrink-0 opacity-90" aria-hidden />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs font-semibold text-white bg-white/16 hover:bg-red-500/42 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.28)' }}
            aria-label="Sign out"
          >
            <LogOut size={16} className="shrink-0 opacity-90" aria-hidden />
            <span className="hidden sm:inline">Out</span>
          </button>
        </div>
      </div>

      {/* Right: time + WS status */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {time && (
          <div className="text-right">
            <p className="font-mono text-sm font-semibold text-white leading-none">{time}</p>
            <p className="text-[10px] text-white/50 mt-0.5">{date}</p>
          </div>
        )}

        {/* WebSocket status — colour + text + icon (never colour alone).
            suppressHydrationWarning: status is client-only (navigator.onLine),
            server always renders "Live" then client corrects after mount. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isReconnecting ? 'reconnecting' : isOnline ? 'online' : 'offline'}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{
              background: isReconnecting
                ? 'rgba(234,179,8,0.2)'
                : isOnline
                ? 'rgba(34,197,94,0.2)'
                : 'rgba(239,68,68,0.2)',
            }}
            aria-label={`Connection: ${isReconnecting ? 'Reconnecting' : isOnline ? 'Live' : 'Offline'}`}
            suppressHydrationWarning
          >
            {isReconnecting ? (
              <Loader2 size={11} className="text-yellow-300 animate-spin" aria-hidden="true" />
            ) : isOnline ? (
              <Wifi size={11} className="text-green-300" aria-hidden="true" />
            ) : (
              <WifiOff size={11} className="text-red-300" aria-hidden="true" />
            )}
            <span
              suppressHydrationWarning
              className={`text-[11px] font-semibold ${
                isReconnecting ? 'text-yellow-300' : isOnline ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {isReconnecting ? 'Reconnecting' : isOnline ? 'Live' : 'Offline'}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </header>
  );
}
