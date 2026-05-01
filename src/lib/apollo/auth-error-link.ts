'use client';

import { onError } from '@apollo/client/link/error';
import { Observable } from '@apollo/client/utilities';
import { useAuthStore } from '@/lib/store/auth.store';
import { getGraphqlHttpUri } from '@/lib/apollo/graphql-uri';

let refreshInFlight: Promise<void> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  try {
    const { hasHydrated, refreshToken, setAccessToken, clearAuth } = useAuthStore.getState();
    if (!refreshToken) {
      if (hasHydrated) {
        clearAuth();
      }
      return false;
    }
    const res = await fetch(getGraphqlHttpUri(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation RefreshToken($token: String!) { refreshToken(token: $token) { access_token refresh_token expires_in } }`,
        variables: { token: refreshToken },
      }),
    });
    const json = (await res.json()) as {
      errors?: unknown[];
      data?: { refreshToken: { access_token: string; refresh_token: string } };
    };
    if ((json.errors && json.errors.length > 0) || !json.data?.refreshToken) {
      clearAuth();
      return false;
    }
    const { access_token, refresh_token } = json.data.refreshToken;
    setAccessToken(access_token);
    useAuthStore.setState({ refreshToken: refresh_token });
    return true;
  } catch {
    useAuthStore.getState().clearAuth();
    return false;
  }
}

async function refreshSingleFlight(): Promise<boolean> {
  if (refreshInFlight) {
    try {
      await refreshInFlight;
    } catch {
      return false;
    }
    return !!useAuthStore.getState().accessToken;
  }
  refreshInFlight = refreshAccessToken().then(() => undefined);
  try {
    await refreshInFlight;
    return !!useAuthStore.getState().accessToken;
  } catch {
    return false;
  } finally {
    refreshInFlight = null;
  }
}

function isUnauthenticatedError(
  graphQLErrors?: readonly { extensions?: { code?: string } }[],
  networkError?: unknown,
): boolean {
  if (graphQLErrors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
    return true;
  }
  const ne = networkError as
    | { statusCode?: number; result?: { errors?: { extensions?: { code?: string } }[] } }
    | undefined;
  if (ne?.statusCode === 401) {
    return true;
  }
  if (ne?.result?.errors?.some((e) => e.extensions?.code === 'UNAUTHENTICATED')) {
    return true;
  }
  return false;
}

/**
 * On UNAUTHENTICATED / 401, refresh tokens once and retry the operation.
 * Uses fetch for refresh so this link does not recurse into itself.
 */
export const authErrorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (!isUnauthenticatedError(graphQLErrors, networkError)) {
    return;
  }

  const ctx = operation.getContext() as { authRetry?: boolean };
  if (ctx.authRetry) {
    return;
  }

  return new Observable((observer) => {
    void (async () => {
      const ok = await refreshSingleFlight();
      if (!ok) {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        observer.error(new Error('Unauthorized'));
        return;
      }
      operation.setContext({ authRetry: true });
      forward(operation).subscribe({
        next: observer.next.bind(observer),
        error: observer.error.bind(observer),
        complete: observer.complete.bind(observer),
      });
    })();
  });
});
