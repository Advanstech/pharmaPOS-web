/**
 * Lightweight JWT payload read (no crypto) — only for client-side expiry checks.
 * Returns true if missing exp, malformed, or past (optionally within skewSeconds of expiry).
 */
export function isJwtExpired(token: string, skewSeconds = 30): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    if (!payload.exp || typeof payload.exp !== 'number') return true;
    const expMs = payload.exp * 1000;
    return Date.now() >= expMs - skewSeconds * 1000;
  } catch {
    return true;
  }
}
