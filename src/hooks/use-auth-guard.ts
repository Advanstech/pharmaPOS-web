'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { useAuthStore } from '@/lib/store/auth.store';
import { gql } from '@apollo/client';
import { isJwtExpired } from '@/lib/auth/jwt-expiry';

const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token) {
      access_token
      refresh_token
      expires_in
    }
  }
`;

interface RefreshResult {
  refreshToken: { access_token: string; refresh_token: string; expires_in: number };
}

/**
 * Guards a page behind authentication.
 * - If accessToken is present and not expired: ready immediately.
 * - If accessToken is missing or expired but refreshToken exists: silent refresh.
 * - If no session: redirects to /login.
 *
 * Returns { ready } — render children only when ready = true.
 */
export function useAuthGuard(): { ready: boolean } {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const user = useAuthStore((s) => s.user);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [doRefresh] = useMutation<RefreshResult>(REFRESH_TOKEN_MUTATION);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (accessToken && !isJwtExpired(accessToken)) {
      setReady(true);
      return;
    }

    if (!refreshToken || !user) {
      router.replace('/login');
      return;
    }

    doRefresh({ variables: { token: refreshToken } })
      .then(({ data }) => {
        if (data?.refreshToken) {
          setAccessToken(data.refreshToken.access_token);
          useAuthStore.setState({ refreshToken: data.refreshToken.refresh_token });
          setReady(true);
        } else {
          clearAuth();
          router.replace('/login');
        }
      })
      .catch(() => {
        clearAuth();
        router.replace('/login');
      });
  }, [hasHydrated, accessToken, refreshToken, user, doRefresh, router, setAccessToken, clearAuth]);

  return { ready };
}
