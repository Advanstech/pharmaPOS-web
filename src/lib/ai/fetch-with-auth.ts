/**
 * Authenticated fetch for internal AI API routes.
 * Reads the access token from Zustand auth store and attaches it as Bearer.
 */
import { useAuthStore } from '@/lib/store/auth.store';

export async function aiFetch(url: string, body: unknown): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
