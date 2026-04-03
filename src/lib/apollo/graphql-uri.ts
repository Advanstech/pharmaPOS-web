/**
 * GraphQL endpoints. `NEXT_PUBLIC_API_URL` is the API **base** (e.g. `https://…railway.app` — no path).
 * `/graphql` is appended (Nest default). Omit env for local `http://127.0.0.1:4000/graphql`.
 *
 * Optional `NEXT_PUBLIC_WS_URL`: same kind of base; if unset, derived from `NEXT_PUBLIC_API_URL`.
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

export function getGraphqlHttpUri(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (base) return withGraphqlPath(base);
  return withGraphqlPath('http://127.0.0.1:4000');
}

export function getGraphqlWsUri(): string {
  const wsBase = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (wsBase) return withGraphqlPath(wsBase);
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (base) return withGraphqlPath(httpOriginToWsOrigin(base));
  return withGraphqlPath('ws://127.0.0.1:4000');
}
