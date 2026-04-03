/**
 * HTTP GraphQL URL for Apollo and token refresh.
 * Default: same-origin `/api/graphql` so LAN access (e.g. http://192.168.x.x:3000) works —
 * the browser must not call `localhost:4000` when the app is opened by IP on another device.
 * Override with NEXT_PUBLIC_API_URL if the API is on another host in production.
 */
export function getGraphqlHttpUri(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const pageIsLanOrRemote = host !== 'localhost' && host !== '127.0.0.1';
    const envPointsToLoopback =
      !!fromEnv &&
      (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(fromEnv) ||
        fromEnv.startsWith('http://localhost') ||
        fromEnv.startsWith('http://127.0.0.1'));
    if (pageIsLanOrRemote && envPointsToLoopback) {
      return `${window.location.origin}/api/graphql`;
    }
  }

  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/graphql`;
  }
  return 'http://127.0.0.1:4000/graphql';
}

/**
 * WS GraphQL URL for subscriptions.
 * Uses NEXT_PUBLIC_WS_URL when provided, but avoids loopback values when the app is opened over LAN.
 */
export function getGraphqlWsUri(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WS_URL?.trim();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const pageIsLanOrRemote = host !== 'localhost' && host !== '127.0.0.1';
    const envPointsToLoopback =
      !!fromEnv &&
      (/^wss?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i.test(fromEnv) ||
        fromEnv.startsWith('ws://localhost') ||
        fromEnv.startsWith('ws://127.0.0.1'));

    if (pageIsLanOrRemote && envPointsToLoopback) {
      const envPort = fromEnv.match(/^wss?:\/\/[^/:]+:(\d+)\//i)?.[1] ?? '4000';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${wsProtocol}://${window.location.hostname}:${envPort}/graphql`;
    }
  }

  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${wsProtocol}://${window.location.hostname}:4000/graphql`;
  }
  return 'ws://127.0.0.1:4000/graphql';
}
