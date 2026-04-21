'use client';

import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  split,
  type NormalizedCacheObject,
} from '@apollo/client';
import { authErrorLink } from '@/lib/apollo/auth-error-link';
import { getGraphqlHttpUri, getGraphqlWsUri } from '@/lib/apollo/graphql-uri';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client';
import { useRef } from 'react';
import { useAuthStore } from '@/lib/store/auth.store';
import createUploadLink from 'apollo-upload-client/createUploadLink.mjs';

function makeClient(getToken: () => string | null): ApolloClient<NormalizedCacheObject> {
  // Always use the Next.js proxy in the browser to avoid CORS and direct connection issues
  const graphqlUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/graphql`
    : (process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000') + '/graphql';
  
  // Create upload-capable HTTP link using apollo-upload-client
  const uploadLink = createUploadLink({
    uri: graphqlUri,
    fetch: (uri: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
      const headers = new Headers(options?.headers ?? {});
      const token = getToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return fetch(uri, {
        ...options,
        headers,
      }).catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.debug('[Apollo HTTP] Request aborted');
        } else if (/load failed/i.test(message)) {
          console.warn('[Apollo HTTP] Network request failed');
        } else {
          console.error('[Apollo HTTP] Fetch error:', error);
        }
        throw error;
      });
    },
  });

  // WS link — subscriptions only (ADR: graphql-ws, not subscriptions-transport-ws)
  const wsLink = new GraphQLWsLink(
    createClient({
      url: getGraphqlWsUri(),
      connectionParams: () => {
        const token = getToken();
        return { Authorization: token ? `Bearer ${token}` : '' };
      },
      // 30s heartbeat per architecture rules
      keepAlive: 30_000,
      retryAttempts: Infinity,
      shouldRetry: () => true,
      retryWait: async (retries) => {
        // Exponential backoff: 1s → 2s → 4s … max 30s
        await new Promise((r) =>
          setTimeout(r, Math.min(1_000 * 2 ** retries, 30_000)),
        );
      },
    }),
  );

  // Apollo split link: HTTP for query/mutation, WS for subscription only
  const splitLink = split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return def.kind === 'OperationDefinition' && def.operation === 'subscription';
    },
    wsLink,
    uploadLink as any,  // Use upload-capable link for HTTP
  );

  const link = ApolloLink.from([authErrorLink, splitLink]);

  return new ApolloClient({
    link,
    cache: new InMemoryCache({
      // Type policies for better caching and normalization
      typePolicies: {
        Query: {
          fields: {
            // Cache inventory list by branch
            listInventory: {
              keyArgs: false, // Don't use args for cache key
              merge(existing, incoming) {
                return incoming;
              },
            },
            // Cache sales by date
            dailySummary: {
              keyArgs: ['date'],
            },
            recentSales: {
              keyArgs: false,
              merge(existing, incoming) {
                return incoming;
              },
            },
            // Cache low stock alerts
            lowStockAlerts: {
              keyArgs: false,
              merge(existing, incoming) {
                return incoming;
              },
            },
            myStockAlerts: {
              keyArgs: false,
              merge(existing, incoming) {
                return incoming;
              },
            },
          },
        },
      },
    }),
    defaultOptions: {
      watchQuery: { 
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
      mutate: {
        errorPolicy: 'all',
      },
    },
    // Enable query deduplication for better performance
    queryDeduplication: true,
  });
}

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const getToken = () => useAuthStore.getState().accessToken;
  const clientRef = useRef<ApolloClient<NormalizedCacheObject> | null>(null);
  // Always recreate on first client-side render so the browser URL is used
  if (!clientRef.current) {
    clientRef.current = makeClient(getToken);
  }
  return (
    <BaseApolloProvider client={clientRef.current}>{children}</BaseApolloProvider>
  );
}
