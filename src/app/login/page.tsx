'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useMutation, type ApolloError } from '@apollo/client';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth.store';
import { LOGIN_MUTATION } from '@/lib/graphql/auth.queries';
import { postLoginPathForRole, asUserRole } from '@/lib/auth/post-login-path';
import type { AuthUser } from '@/types';
import Link from 'next/link';

interface LoginResult {
  login: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    user: Omit<AuthUser, 'role'> & { role: string };
  };
}

function messageFromLoginError(err: unknown): string {
  const gql = err as ApolloError | undefined;
  const first = gql?.graphQLErrors?.[0];
  if (first?.message) return first.message;
  if (err instanceof Error && err.message) return err.message;
  return 'Sign-in failed. Check your email and password.';
}

// ── Inline style objects — zero Tailwind dependency ──────────────────────────
// This page must render correctly even if PostCSS/Tailwind fails to process.

const S = {
  backLink: {
    position: 'absolute' as const,
    top: 24,
    left: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'color 0.2s',
    zIndex: 20,
  },
  root: {
    position: 'fixed' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'var(--surface-base)',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  blob1: {
    position: 'absolute' as const,
    width: 560, height: 560,
    top: -180, right: -140,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,163,176,0.15) 0%, transparent 70%)',
    filter: 'blur(72px)',
    pointerEvents: 'none' as const,
    animation: 'blobDrift 14s ease-in-out infinite alternate',
  },
  blob2: {
    position: 'absolute' as const,
    width: 420, height: 420,
    bottom: -120, left: -100,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(232,168,56,0.1) 0%, transparent 70%)',
    filter: 'blur(72px)',
    pointerEvents: 'none' as const,
    animation: 'blobDrift 18s ease-in-out infinite alternate-reverse',
  },
  blob3: {
    position: 'absolute' as const,
    width: 320, height: 320,
    top: '45%', left: '35%',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,109,119,0.1) 0%, transparent 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none' as const,
    animation: 'blobDrift 10s ease-in-out infinite alternate',
    animationDelay: '-5s',
  },
  grid: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: 'radial-gradient(var(--text-muted) 1px, transparent 1px)',
    opacity: 0.1,
    backgroundSize: '28px 28px',
    pointerEvents: 'none' as const,
  },
  wrap: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: 420,
    zIndex: 10,
  },
  card: {
    background: 'var(--surface-card)',
    borderRadius: 24,
    overflow: 'hidden',
    boxShadow: 'var(--shadow-card-hover)',
    border: '1px solid var(--surface-border)',
  },
  accent: {
    height: 4,
    background: 'linear-gradient(90deg, var(--color-teal-dark) 0%, var(--color-teal) 45%, var(--color-gold) 100%)',
  },
  logoBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '36px 40px 24px',
    gap: 12,
  },
  logoIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    background: 'linear-gradient(145deg, var(--color-teal-dark) 0%, var(--color-teal) 60%, #00838F 100%)',
    boxShadow: '0 8px 28px rgba(0,109,119,0.3), 0 2px 8px rgba(0,0,0,0.1)',
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.4px',
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
    lineHeight: 1.2,
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    textAlign: 'center' as const,
    margin: 0,
    marginTop: 2,
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, transparent, var(--surface-border) 20%, var(--surface-border) 80%, transparent)',
    margin: '0 40px',
  },
  form: {
    padding: '28px 40px 32px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-secondary)',
  },
  input: {
    width: '100%',
    height: 50,
    padding: '0 16px',
    borderRadius: 12,
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: 'var(--surface-border)',
    background: 'var(--surface-base)',
    fontSize: 14,
    color: 'var(--text-primary)',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
  },
  inputFocused: {
    borderColor: 'var(--color-teal)',
    background: 'var(--surface-card)',
    boxShadow: '0 0 0 3px rgba(0,109,119,0.14)',
  },
  inputWrap: {
    position: 'relative' as const,
  },
  inputPw: {
    paddingRight: 50,
  },
  pwToggle: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    height: 50,
    width: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '0 12px 12px 0',
    transition: 'color 0.15s',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--color-controlled)',
    background: 'rgba(220,38,38,0.07)',
    border: '1px solid rgba(220,38,38,0.2)',
    overflow: 'hidden',
  },
  errorDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--color-controlled)',
    flexShrink: 0,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '0.01em',
    color: '#fff',
    background: 'linear-gradient(135deg, var(--color-teal-dark) 0%, var(--color-teal) 55%, #00838F 100%)',
    boxShadow: '0 4px 18px rgba(0,109,119,0.3), 0 1px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    marginTop: 4,
    transition: 'opacity 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  },
  btnDisabled: {
    opacity: 0.42,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  compliance: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 40px 20px',
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  },
  complianceDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--color-otc)',
    flexShrink: 0,
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: 20,
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  footerBrand: {
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const prefersReduced = useReducedMotion();

  const [mounted, setMounted]   = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [shaking, setShaking]   = useState(false);
  const [emailFocus, setEmailFocus]   = useState(false);
  const [pwFocus, setPwFocus]         = useState(false);

  const [login, { loading }] = useMutation<LoginResult>(LOGIN_MUTATION);

  // Already signed in (persisted refresh + profile) — go to role home
  useEffect(() => {
    const { user, refreshToken } = useAuthStore.getState();
    if (user && refreshToken) {
      router.replace(postLoginPathForRole(user.role));
    }
  }, [router]);

  // Inject keyframes once on mount
  useEffect(() => {
    const id = 'pharmapos-login-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes blobDrift {
        0%   { transform: translate(0,0) scale(1); }
        50%  { transform: translate(28px,-18px) scale(1.07); }
        100% { transform: translate(-18px,28px) scale(0.94); }
      }
      @keyframes loginShake {
        0%,100% { transform: translateX(0); }
        15%     { transform: translateX(-7px); }
        30%     { transform: translateX(7px); }
        45%     { transform: translateX(-5px); }
        60%     { transform: translateX(5px); }
        75%     { transform: translateX(-3px); }
        90%     { transform: translateX(3px); }
      }
      @keyframes loginSpin {
        to { transform: rotate(360deg); }
      }
      .login-shake { animation: loginShake 0.52s cubic-bezier(0.36,0.07,0.19,0.97); }
      .login-spin  { animation: loginSpin 0.75s linear infinite; }
    `;
    document.head.appendChild(style);
    setMounted(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login({ variables: { email, password } });
      if (data?.login) {
        const { user: loggedIn, access_token, refresh_token } = data.login;
        const role = asUserRole(loggedIn.role);
        if (!role) {
          setError('This account role is not supported in the web app. Contact your administrator.');
          return;
        }
        const user: AuthUser = {
          id: loggedIn.id,
          name: loggedIn.name,
          email: loggedIn.email ?? undefined,
          role,
          branch_id: loggedIn.branch_id,
        };
        setAuth(user, access_token, refresh_token);
        router.replace(postLoginPathForRole(role));
      }
    } catch (err) {
      setError(messageFromLoginError(err));
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
  }

  const isDisabled = !mounted || loading || !email || !password;

  return (
    <div style={S.root}>
      <Link href="/" style={S.backLink} onMouseEnter={(e) => e.currentTarget.style.color = '#fff'} onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}>
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      {/* Animated background blobs */}
      <div style={S.blob1} aria-hidden="true" />
      <div style={S.blob2} aria-hidden="true" />
      <div style={S.blob3} aria-hidden="true" />
      <div style={S.grid}  aria-hidden="true" />

      <motion.div
        style={S.wrap}
        className={shaking ? 'login-shake' : ''}
        initial={prefersReduced ? false : { opacity: 0, y: 36, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      >
        <div style={S.card}>
          {/* Top accent bar */}
          <div style={S.accent} />

          {/* Logo */}
          <div style={S.logoBlock}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <motion.div
                style={S.logoIcon}
                initial={prefersReduced ? false : { scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
              >
                <ShieldCheck size={30} strokeWidth={1.7} />
              </motion.div>
              <motion.div
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                style={{ textAlign: 'center' }}
              >
                <h1 style={S.title}>PharmaPOS Pro</h1>
                <p style={S.subtitle}>Azzay Pharmacy &nbsp;·&nbsp; Accra, Ghana</p>
              </motion.div>
            </Link>
          </div>

          <div style={S.divider} />

          {/* Form — credentials are validated only via GraphQL login mutation (see API reference) */}
          <form onSubmit={handleSubmit} noValidate style={S.form}>

            {/* Email */}
            <motion.div
              style={S.field}
              initial={prefersReduced ? false : { opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 }}
            >
              <label htmlFor="email" style={S.label}>Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
                placeholder="you@azzaypharmacy.com"
                style={{ ...S.input, ...(emailFocus ? S.inputFocused : {}) }}
              />
            </motion.div>

            {/* Password */}
            <motion.div
              style={S.field}
              initial={prefersReduced ? false : { opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.28 }}
            >
              <label htmlFor="password" style={S.label}>Password</label>
              <div style={S.inputWrap}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  placeholder="••••••••••"
                  style={{ ...S.input, ...S.inputPw, ...(pwFocus ? S.inputFocused : {}) }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={S.pwToggle}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </motion.div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  role="alert"
                  style={S.error}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <span style={S.errorDot} aria-hidden="true" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isDisabled}
              suppressHydrationWarning
              style={{ ...S.btn, ...(isDisabled ? S.btnDisabled : {}) }}
              whileHover={prefersReduced || isDisabled ? {} : { scale: 1.015, boxShadow: '0 6px 28px rgba(0,109,119,0.55)' }}
              whileTap={prefersReduced || isDisabled ? {} : { scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              initial={prefersReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: isDisabled ? 0.42 : 1, y: 0 }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="login-spin" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in to PharmaPOS'
              )}
            </motion.button>
          </form>

          {/* Compliance */}
          <motion.div
            style={S.compliance}
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span style={S.complianceDot} aria-hidden="true" />
            Ghana FDA Compliant &nbsp;·&nbsp; GRA VAT Registered
          </motion.div>
        </div>

        {/* Footer */}
        <p style={S.footer}>
          Powered by{' '}
          <span style={S.footerBrand}>Advansis Technologies</span>
        </p>
      </motion.div>
    </div>
  );
}
