import type { ApolloError } from '@apollo/client';

/**
 * User-friendly error messages from GraphQL/network errors.
 * Maps raw API errors to clear, actionable messages.
 */
export function formatApolloError(error: ApolloError | undefined | null): string | null {
  if (!error) return null;

  const gql = error.graphQLErrors?.[0]?.message;
  const net = error.networkError;
  const netMsg = net && typeof net === 'object' && 'message' in net ? String((net as Error).message) : null;
  const bodyErr = (net as { result?: { errors?: { message?: string }[] } } | undefined)?.result?.errors?.[0]?.message;

  const raw = gql ?? bodyErr ?? netMsg ?? error.message ?? 'Something went wrong';

  // Map raw API errors to user-friendly messages
  return friendlyMessage(raw);
}

function friendlyMessage(raw: string): string {
  const lower = raw.toLowerCase();

  // Role/authorization errors
  if (lower.includes('not authorized') && lower.includes('role')) {
    const roleMatch = raw.match(/Role '([^']+)'/);
    const role = roleMatch?.[1]?.replace(/_/g, ' ') ?? 'your role';
    return `Your role (${role}) doesn't have permission for this action. Please ask your manager or pharmacist for assistance.`;
  }

  if (lower.includes('forbidden') || lower.includes('403')) {
    return 'You don\'t have permission to perform this action. Contact your manager.';
  }

  if (lower.includes('unauthorized') || lower.includes('401')) {
    return 'Your session has expired. Please log in again.';
  }

  // Prescription errors
  if (lower.includes('pom') && lower.includes('violation')) {
    return 'This is a Prescription-Only Medicine (POM). A verified prescription is required before dispensing.';
  }

  if (lower.includes('gmdc') && lower.includes('invalid')) {
    return 'The prescriber\'s GMDC licence is invalid or expired. Please verify the licence number.';
  }

  if (lower.includes('rx') && lower.includes('expired')) {
    return 'This prescription has expired (older than 30 days). A new prescription is needed.';
  }

  // Stock errors
  if (lower.includes('insufficient stock') || lower.includes('negative stock')) {
    return 'Not enough stock available for this item. Check inventory levels.';
  }

  // Sale errors
  if (lower.includes('idempotency') || lower.includes('duplicate')) {
    return 'This transaction was already processed. Check your recent sales.';
  }

  // Network errors
  if (lower.includes('load failed') || lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Connection lost. Please check your internet and try again.';
  }

  if (lower.includes('timeout') || lower.includes('econnrefused')) {
    return 'Server is not responding. Please wait a moment and try again.';
  }

  // Validation errors
  if (lower.includes('not-null constraint') || lower.includes('violates not-null')) {
    return 'Some required fields are missing. Please fill in all required fields.';
  }

  if (lower.includes('not found') || lower.includes('404')) {
    return 'The requested item was not found. It may have been removed.';
  }

  // Refund errors
  if (lower.includes('refund') && lower.includes('24 hour')) {
    return 'Refunds are only allowed within 24 hours of the sale.';
  }

  // Default: return the raw message but clean it up
  return raw.replace(/^Error:\s*/i, '').trim();
}
