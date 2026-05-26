// Single import point for pages and the store:
//
//   import { api } from '../api';
//
// The active client is chosen at build time:
//   • If `VITE_API_BASE_URL` is set, an HTTP client is used (real backend).
//     Every outbound request carries the current Firebase ID token as
//     `Authorization: Bearer <token>`; the server resolves the restaurant
//     binding from the user's UID.
//   • Otherwise the localStorage adapter runs — exact behavior of the
//     existing offline dashboard, with the future API surface (and a
//     `UPLATE-DEMO` access code so the sign-up flow can be exercised).
//
// Pages and stores should depend on `ApiClient`, not on the concrete
// implementation, so tests can substitute their own.

import { auth as firebaseAuth } from '../firebase/config';
import type { ApiClient } from './client';
import { createHttpClient } from './http';
import { createLocalClient } from './local';

export type { ApiClient } from './client';
export * from './types';

const baseUrl =
  typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL)
    : '';

let _client: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (_client) return _client;
  _client = baseUrl
    ? createHttpClient({
        baseUrl,
        getAuthToken: async () => {
          const user = firebaseAuth.currentUser;
          if (!user) return null;
          try {
            return await user.getIdToken();
          } catch {
            return null;
          }
        },
      })
    : createLocalClient();
  return _client;
}

export const api: ApiClient = new Proxy({} as ApiClient, {
  get(_target, prop) {
    const client = getApiClient() as unknown as Record<string | symbol, unknown>;
    return client[prop as keyof ApiClient];
  },
});
