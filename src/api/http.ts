// fetch-based `ApiClient` implementation. Wire to the real backend by
// setting `VITE_API_BASE_URL` in `.env` and exporting this client from
// `src/api/index.ts` instead of the local adapter.

import type { ApiClient } from './client';
import { ApiError, type ApiErrorBody } from './types';
import type {
  AdInput,
  AdListQuery,
  AdPatch,
  AnalyticsOverviewQuery,
  AnalyticsSeriesQuery,
  CampaignInput,
  CampaignPatch,
  DuplicateAdRequest,
  DuplicateCampaignRequest,
  RegisterRequest,
  ReorderCampaignsRequest,
  RestaurantPatch,
  SetStatusRequest,
  Status,
  UpdateAdRequest,
  ValidateAccessCodeRequest,
} from './types';

export interface HttpClientOptions {
  baseUrl: string;
  /** Called before each request — return the current auth token, or null. */
  getAuthToken?: () => string | null | Promise<string | null>;
  /** Optional `fetch` override (testing, retries, request signing). */
  fetch?: typeof fetch;
}

export function createHttpClient(opts: HttpClientOptions): ApiClient {
  const doFetch = opts.fetch ?? fetch.bind(globalThis);

  async function request<T>(
    method: string,
    path: string,
    init?: { body?: unknown; query?: Record<string, unknown>; ifMatch?: string },
  ): Promise<T> {
    const url = new URL(`${opts.baseUrl.replace(/\/$/, '')}${path}`);
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v === undefined || v === null || v === '') continue;
        url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
    if (init?.ifMatch) headers['If-Match'] = init.ifMatch;

    const token = await opts.getAuthToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await doFetch(url.toString(), {
      method,
      headers,
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    });

    if (res.status === 204) return undefined as T;

    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;

    if (!res.ok) {
      throw new ApiError(res.status, (json ?? { error: { code: 'unknown', message: res.statusText } }) as ApiErrorBody);
    }
    return json as T;
  }

  const q = (obj: Record<string, unknown> | undefined) => obj ?? {};

  return {
    auth: {
      validateAccessCode: (input: ValidateAccessCodeRequest) =>
        request('POST', '/auth/validate-access-code', { body: input }),
      register: (input: RegisterRequest) =>
        request('POST', '/auth/register', { body: input }),
      session: () => request('GET', '/auth/session'),
    },

    bootstrap: () => request('GET', '/bootstrap'),

    restaurant: {
      get: () => request('GET', '/restaurant'),
      patch: (input: RestaurantPatch) => request('PATCH', '/restaurant', { body: input }),
    },

    campaigns: {
      list: (opts) => request('GET', '/campaigns', { query: q(opts as Record<string, unknown>) }),
      create: (input: CampaignInput) => request('POST', '/campaigns', { body: input }),
      detail: (id) => request('GET', `/campaigns/${encodeURIComponent(id)}`),
      patch: (id, input: CampaignPatch, ifMatch) =>
        request('PATCH', `/campaigns/${encodeURIComponent(id)}`, { body: input, ifMatch }),
      remove: (id, ifMatch) =>
        request('DELETE', `/campaigns/${encodeURIComponent(id)}`, { ifMatch }),
      duplicate: (id, input?: DuplicateCampaignRequest) =>
        request('POST', `/campaigns/${encodeURIComponent(id)}/duplicate`, { body: input ?? {} }),
      setStatus: (id, input: SetStatusRequest) =>
        request('POST', `/campaigns/${encodeURIComponent(id)}/status`, { body: input }),
      reorder: (input: ReorderCampaignsRequest) =>
        request('POST', '/campaigns/reorder', { body: input }),
    },

    ads: {
      list: (query?: AdListQuery) => request('GET', '/ads', { query: q(query as Record<string, unknown>) }),
      create: (input: AdInput) => request('POST', '/ads', { body: input }),
      detail: (id) => request('GET', `/ads/${encodeURIComponent(id)}`),
      update: (id, input: UpdateAdRequest, ifMatch) =>
        request('PUT', `/ads/${encodeURIComponent(id)}`, { body: input, ifMatch }),
      patch: (id, input: AdPatch, ifMatch) =>
        request('PATCH', `/ads/${encodeURIComponent(id)}`, { body: input, ifMatch }),
      remove: (id, ifMatch) =>
        request('DELETE', `/ads/${encodeURIComponent(id)}`, { ifMatch }),
      duplicate: (id, input: DuplicateAdRequest) =>
        request('POST', `/ads/${encodeURIComponent(id)}/duplicate`, { body: input }),
      setStatus: (id, input: SetStatusRequest) =>
        request('POST', `/ads/${encodeURIComponent(id)}/status`, { body: input }),
    },

    analytics: {
      overview: (query?: AnalyticsOverviewQuery) =>
        request('GET', '/analytics/overview', { query: q(query as Record<string, unknown>) }),
      campaignComparison: () => request('GET', '/analytics/campaign-comparison'),
      series: (query: AnalyticsSeriesQuery) =>
        request('GET', '/analytics/series', { query: q(query as Record<string, unknown>) }),
      audienceInsights: () => request('GET', '/analytics/audience-insights'),
      clickSignals: (adId) =>
        request('GET', `/analytics/ads/${encodeURIComponent(adId)}/click-signals`),
    },
  };
}

// Silence unused-imports for narrowing-only types in some bundlers.
export type { Status };
