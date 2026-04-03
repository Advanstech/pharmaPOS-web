'use client';

import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  split,
  HttpLink,
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

function makeClient(getToken: () => string | null): ApolloClient<NormalizedCacheObject> {
  const httpLink = new HttpLink({
    uri: getGraphqlHttpUri(),
    // Attach JWT from in-memory store on every request
    fetch: (uri, options) => {
      const token = getToken();
      const headers = new Headers(options?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(uri, { ...options, headers });
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
    httpLink,
  );

  const link = ApolloLink.from([authErrorLink, splitLink]);

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: 'cache-and-network' },
    },
  });
}

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const getToken = () => useAuthStore.getState().accessToken;
  // Stable client ref — recreated only on mount
  const clientRef = useRef<ApolloClient<NormalizedCacheObject> | null>(null);
  if (!clientRef.current) {
    clientRef.current = makeClient(getToken);
  }
  return (
    <BaseApolloProvider client={clientRef.current}>{children}</BaseApolloProvider>
  );
}
