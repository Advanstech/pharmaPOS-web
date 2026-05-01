'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { RESET_PASSWORD_WITH_TOKEN_MUTATION } from '@/lib/graphql/auth.queries';

interface ResetPasswordResult {
  resetPasswordWithToken: boolean;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-base)',
        color: 'var(--text-muted)',
        fontSize: 14,
      }}
    >
      Loading reset form...
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [resetPassword, { loading }] = useMutation<ResetPasswordResult>(RESET_PASSWORD_WITH_TOKEN_MUTATION);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Reset link is invalid. Please request a new one.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await resetPassword({ variables: { token, newPassword } });
      setSuccess('Password reset successful. Redirecting to login...');
      setTimeout(() => {
        router.replace('/login');
      }, 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset failed. Please request a new link.';
      setError(message);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--surface-base)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface-card)',
          border: '1px solid var(--surface-border)',
          borderRadius: 16,
          padding: 24,
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, color: 'var(--text-primary)' }}>Reset Password</h1>
        <p style={{ marginTop: 8, marginBottom: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          Enter your new password to complete account recovery.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{
              height: 44,
              borderRadius: 10,
              border: '1px solid var(--surface-border)',
              background: 'var(--surface-base)',
              color: 'var(--text-primary)',
              padding: '0 12px',
              fontSize: 14,
            }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              height: 44,
              borderRadius: 10,
              border: '1px solid var(--surface-border)',
              background: 'var(--surface-base)',
              color: 'var(--text-primary)',
              padding: '0 12px',
              fontSize: 14,
            }}
          />

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }} role="alert">
              {error}
            </p>
          )}

          {success && (
            <p style={{ margin: 0, fontSize: 13, color: '#16a34a' }}>
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            style={{
              height: 44,
              borderRadius: 10,
              border: 'none',
              background: 'var(--color-teal)',
              color: '#fff',
              fontWeight: 700,
              cursor: loading || !token ? 'not-allowed' : 'pointer',
              opacity: loading || !token ? 0.6 : 1,
            }}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 12 }}>
          <Link href="/login" style={{ color: 'var(--color-teal)' }}>
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
