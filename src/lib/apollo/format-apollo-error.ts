import type { ApolloError } from '@apollo/client';

/**
 * Prefer GraphQL `errors[0].message`, then server body errors, then network message.
 * Plain `error.message` is often unhelpful (e.g. "Load failed" on fetch/CORS).
 */
export function formatApolloError(error: ApolloError | undefined | null): string | null {
  if (!error) return null;
  const gql = error.graphQLErrors?.[0]?.message;
  const net = error.networkError;
  const netMsg = net && typeof net === 'object' && 'message' in net ? String((net as Error).message) : null;
  const bodyErr = (net as { result?: { errors?: { message?: string }[] } } | undefined)?.result?.errors?.[0]
    ?.message;
  return gql ?? bodyErr ?? netMsg ?? error.message ?? null;
}
