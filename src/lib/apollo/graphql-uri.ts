/**
 * GraphQL HTTP/WS URIs.
 *
 * **HTTP:** The browser always calls same-origin `/api/graphql`. `next.config` rewrites that to
 * `API_PROXY_TARGET` + `/graphql` (same pattern as dev: Next on :3000 → API on :4000).
 * The API host owns `/graphql`, `/health`, `/health/live` — we do not reimplement those here.
 *
 * **SSR / server:** Uses `API_PROXY_TARGET` (or `http://127.0.0.1:4000`) and hits `/graphql` directly.
 *
 * Env:
 * - `API_PROXY_TARGET` — backend base only, e.g. `http://127.0.0.1:4000` or `https://….up.railway.app` (no `/graphql`).
 * - `NEXT_PUBLIC_WS_URL` or `NEXT_PUBLIC_API_URL` — optional public base for WebSocket (subscriptions);
 *   HTTP does not use these for the browser (avoids CORS on GraphQL POST).
 */
function withGraphqlPath(base: string): string {
  const b = base.replace(/\/$/, '');
  if (b.endsWith('/graphql')) return b;
  return `${b}/graphql`;
}

function httpOriginToWsOrigin(base: string): string {
  const b = base.replace(/\/$/, '');
  if (b.startsWith('https://')) return `wss://${b.slice('https://'.length)}`;
  if (b.startsWith('http://')) return `ws://${b.slice('http://'.length)}`;
  return b;
}

function serverGraphqlUrl(): string {
  const base =
    process.env.API_PROXY_TARGET?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://127.0.0.1:4000';
  return withGraphqlPath(base);
}

export function getGraphqlHttpUri(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/graphql`;
  }
  return serverGraphqlUrl();
}

export function getGraphqlWsUri(): string {
  const wsOverride = process.env.NEXT_PUBLIC_WS_URL?.trim();
  const pubBase = wsOverride || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (pubBase) {
    const asHttp = pubBase.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://');
    return withGraphqlPath(httpOriginToWsOrigin(asHttp));
  }
  return withGraphqlPath(httpOriginToWsOrigin(serverGraphqlUrl()));
}
