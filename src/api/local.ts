// In-process `ApiClient` backed by the existing localStorage store.
//
// Lets pages use the API surface today without a backend deployed. When the
// real server is ready, swap `getApiClient()` in `src/api/index.ts` to
// return the HTTP client and delete this file.

import type { ApiClient } from './client';
import type {
  Ad,
  AdInput,
  AdListQuery,
  AdPatch,
  AnalyticsOverviewQuery,
  AnalyticsOverviewResponse,
  AnalyticsPoint,
  AnalyticsSeriesQuery,
  AnalyticsSeriesResponse,
  AudienceEngagement,
  AudienceInsightsResponse,
  AuthSessionResponse,
  BootstrapResponse,
  Campaign,
  CampaignDetailResponse,
  CampaignInput,
  CampaignListResponse,
  CampaignPatch,
  ClickSignalsResponse,
  CreateAdResponse,
  CreateCampaignResponse,
  DeleteAdResponse,
  DeleteCampaignResponse,
  DuplicateAdRequest,
  DuplicateAdResponse,
  DuplicateCampaignRequest,
  DuplicateCampaignResponse,
  RegisterRequest,
  RegisterResponse,

  RestaurantPatch,
  RestaurantProfile,
  SetStatusRequest,
  Status,
  UpdateAdRequest,
  ValidateAccessCodeRequest,
  ValidateAccessCodeResponse,
} from './types';
import { ApiError } from './types';
import type { AdEvent, AppState, Targeting } from '../types';
import { buildSeedState, metricsFromEvents } from '../data/mockData';
import { cloneAd, cloneCampaign, emptyTargeting, newAdSkeleton, newCampaignSkeleton } from '../lib/clone';
import { AUDIENCE_LABEL, DIETARY_LABEL, DEMO_SCHOOL_ID } from '../data/constants';

const STORAGE_KEY = 'uplate-dashboard-v2';

function nowIso(): string {
  return new Date().toISOString();
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Migrate pre-events snapshots: an old localStorage state has no
      // `events` array. Reseed instead of fabricating fake events for it
      // so the click-signals breakdown stays honest.
      if (!Array.isArray(parsed.events) || parsed.events.length === 0) {
        const seed = buildSeedState();
        save(seed);
        return seed;
      }
      return parsed;
    }
  } catch {
    // fall through to seed
  }
  const seed = buildSeedState();
  save(seed);
  return seed;
}

function save(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / unavailable
  }
}

function mustCampaign(state: AppState, id: string): Campaign {
  const c = state.campaigns[id];
  if (!c) {
    throw new ApiError(404, {
      error: { code: 'campaign_not_found', message: `Campaign ${id} not found`, requestId: 'local' },
    });
  }
  return c;
}

function mustAd(state: AppState, id: string): Ad {
  const a = state.ads[id];
  if (!a) {
    throw new ApiError(404, {
      error: { code: 'ad_not_found', message: `Ad ${id} not found`, requestId: 'local' },
    });
  }
  return a;
}

function adsOf(state: AppState, campaignId: string): Ad[] {
  const c = state.campaigns[campaignId];
  if (!c) return [];
  return c.adIds.map((id) => state.ads[id]).filter((x): x is Ad => Boolean(x));
}

function ctr(impressions: number, clicks: number): number {
  return impressions === 0 ? 0 : clicks / impressions;
}

function eventsForAd(state: AppState, adId: string): AdEvent[] {
  return state.events.filter((e) => e.adId === adId);
}

function eventsForAds(state: AppState, adIds: Set<string>): AdEvent[] {
  return state.events.filter((e) => adIds.has(e.adId));
}

function adMetricsFromEvents(state: AppState, adId: string) {
  return metricsFromEvents(eventsForAd(state, adId));
}

function hydrateAd(state: AppState, ad: Ad): Ad {
  return { ...ad, metrics: adMetricsFromEvents(state, ad.id) };
}

function aggregateSeriesFromEvents(events: AdEvent[]): AnalyticsPoint[] {
  const byDate = new Map<string, AnalyticsPoint>();
  for (const ev of events) {
    const date = ev.occurredAt.slice(0, 10);
    const point = byDate.get(date) ?? { date, impressions: 0, clicks: 0 };
    if (ev.type === 'impression') point.impressions += 1;
    else point.clicks += 1;
    byDate.set(date, point);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function totalsOf(events: AdEvent[]): { impressions: number; clicks: number } {
  let impressions = 0;
  let clicks = 0;
  for (const ev of events) {
    if (ev.type === 'impression') impressions += 1;
    else clicks += 1;
  }
  return { impressions, clicks };
}

function campaignStats(state: AppState, campaignId: string) {
  const ads = adsOf(state, campaignId);
  const adIdSet = new Set(ads.map((a) => a.id));
  const { impressions, clicks } = totalsOf(eventsForAds(state, adIdSet));
  let activeAdCount = 0;
  for (const ad of ads) if (ad.status === 'active') activeAdCount += 1;
  return {
    impressions,
    clicks,
    ctr: ctr(impressions, clicks),
    adCount: ads.length,
    activeAdCount,
  };
}

function aggregateSeries(state: AppState, campaignId?: string): AnalyticsPoint[] {
  if (!campaignId) return aggregateSeriesFromEvents(state.events);
  const ads = adsOf(state, campaignId);
  const adIds = new Set(ads.map((a) => a.id));
  return aggregateSeriesFromEvents(eventsForAds(state, adIds));
}

// Cross-ad click engagement. Mirrors the per-ad click-signals math but folds
// every ad's click events into one ranked aggregate, so the Audience Insights
// screen needs a single request instead of one click-signals call per ad.
function aggregateAdEngagement(state: AppState): AudienceEngagement {
  const clickEvents = state.events.filter((e) => e.type === 'click');
  const totalClicks = clickEvents.length;

  // targeted = at least one of the restaurant's ads targets that signal.
  const targetedTags = new Set<string>();
  const targetedDiet = new Set<string>();
  const targetedFood = new Map<string, string>(); // lowercased -> original case
  for (const ad of Object.values(state.ads)) {
    for (const r of ad.targeting.audienceTags) targetedTags.add(r.tag);
    for (const r of ad.targeting.dietary) targetedDiet.add(r.pref);
    for (const r of ad.targeting.foodInterests) targetedFood.set(r.name.toLowerCase(), r.name);
  }

  const tagCounts = new Map<string, number>();
  const dietCounts = new Map<string, number>();
  const foodCounts = new Map<string, number>();
  const contributingAds = new Set<string>();
  let recurringClicks = 0;
  for (const ev of clickEvents) {
    contributingAds.add(ev.adId);
    for (const tag of ev.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    for (const pref of ev.dietary) dietCounts.set(pref, (dietCounts.get(pref) ?? 0) + 1);
    for (const name of ev.foodInterests) {
      const k = name.toLowerCase();
      foodCounts.set(k, (foodCounts.get(k) ?? 0) + 1);
    }
    if (ev.recurringCustomer) recurringClicks += 1;
  }

  const safeDivide = (n: number) => (totalClicks === 0 ? 0 : n / totalClicks);

  const topAudienceTags = [...tagCounts.entries()]
    .map(([tag, count]) => ({
      key: tag,
      label: AUDIENCE_LABEL[tag as keyof typeof AUDIENCE_LABEL] ?? tag,
      pct: safeDivide(count),
      targeted: targetedTags.has(tag),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const topDietary = [...dietCounts.entries()]
    .map(([pref, count]) => ({
      key: pref,
      label: DIETARY_LABEL[pref as keyof typeof DIETARY_LABEL] ?? pref,
      pct: safeDivide(count),
      targeted: targetedDiet.has(pref),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const topFoodInterests = [...foodCounts.entries()]
    .map(([key, count]) => ({
      key,
      label: targetedFood.get(key) ?? titleCase(key),
      pct: safeDivide(count),
      targeted: targetedFood.has(key),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  return {
    totalClicks,
    topAudienceTags,
    topDietary,
    topFoodInterests,
    recurringPct: safeDivide(recurringClicks),
    contributingAdCount: contributingAds.size,
  };
}

function toRestaurantProfile(state: AppState): RestaurantProfile {
  const r = state.restaurant ?? {};
  const stored = (r as RestaurantProfile & { contactEmail?: string; notifications?: RestaurantProfile['notifications'] }) ?? {};
  return {
    id: 'local',
    name: r.name,
    iconUrl: r.iconUrl,
    contactEmail: stored.contactEmail,
    notifications: stored.notifications ?? {
      weekly: true,
      emailAlerts: true,
    },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

function ensureTargeting(input?: Targeting): Targeting {
  return input ?? emptyTargeting();
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// In local mode there is no real access-code list. To exercise the sign-up
// flow without a backend, treat this exact code as valid; anything else fails.
const LOCAL_DEMO_ACCESS_CODE = 'UPLATE-DEMO';

// The school this demo account is bound to (one school per account). Real
// access codes carry a school_id; created campaigns inherit it.
const LOCAL_DEMO_SCHOOL_ID = DEMO_SCHOOL_ID;

export function createLocalClient(): ApiClient {
  return {
    auth: {
      validateAccessCode: async (input: ValidateAccessCodeRequest): Promise<ValidateAccessCodeResponse> => {
        if (input.accessCode?.trim().toUpperCase() === LOCAL_DEMO_ACCESS_CODE) {
          const state = load();
          return {
            valid: true,
            restaurant: { id: 'local', name: state.restaurant?.name ?? 'Demo Restaurant' },
          };
        }
        return { valid: false };
      },
      register: async (input: RegisterRequest): Promise<RegisterResponse> => {
        if (input.accessCode?.trim().toUpperCase() !== LOCAL_DEMO_ACCESS_CODE) {
          throw new ApiError(404, {
            error: {
              code: 'access_code_not_found',
              message: 'That access code is not recognized.',
              requestId: 'local',
            },
          });
        }
        const state = load();
        return { restaurantId: 'local', restaurant: toRestaurantProfile(state) };
      },
      session: async (): Promise<AuthSessionResponse> => {
        const state = load();
        return { restaurantId: 'local', restaurant: toRestaurantProfile(state) };
      },
    },

    bootstrap: async (): Promise<BootstrapResponse> => {
      const state = load();
      return {
        restaurant: toRestaurantProfile(state),
        campaigns: state.campaignOrder.map((id) => state.campaigns[id]).filter(Boolean),
        ads: Object.values(state.ads).map((ad) => hydrateAd(state, ad)),
        campaignOrder: [...state.campaignOrder],
        serverTime: nowIso(),
      };
    },

    restaurant: {
      get: async () => toRestaurantProfile(load()),
      patch: async (input: RestaurantPatch) => {
        const state = load();
        const prev = state.restaurant ?? {};
        const merged = {
          ...prev,
          ...(input.name !== undefined && { name: input.name ?? undefined }),
          ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl ?? undefined }),
        } as AppState['restaurant'];
        const next: AppState = { ...state, restaurant: merged };
        save(next);
        return toRestaurantProfile(next);
      },
    },

    campaigns: {
      list: async (filter): Promise<CampaignListResponse> => {
        const state = load();
        const campaigns = state.campaignOrder
          .map((id) => state.campaigns[id])
          .filter((c): c is Campaign => Boolean(c))
          .filter((c) => !filter?.status || c.status === filter.status);
        return {
          campaigns: campaigns.map((c) => {
            const ads = adsOf(state, c.id);
            const spark = aggregateSeries(state, c.id)
              .slice(-30)
              .map((p) => p.impressions);
            void ads;
            return {
              ...c,
              stats: campaignStats(state, c.id),
              impressionsSpark: spark,
            };
          }),
        };
      },

      create: async (input: CampaignInput): Promise<CreateCampaignResponse> => {
        const state = load();
        const c: Campaign = {
          ...newCampaignSkeleton(),
          ...input,
          // School is inherited from the account, never sent by the client.
          schoolId: LOCAL_DEMO_SCHOOL_ID,
          status: input.status ?? 'paused',
        };
        const next: AppState = {
          ...state,
          campaigns: { ...state.campaigns, [c.id]: c },
          campaignOrder: [c.id, ...state.campaignOrder],
        };
        save(next);
        return { campaign: c };
      },

      detail: async (id): Promise<CampaignDetailResponse> => {
        const state = load();
        const c = mustCampaign(state, id);
        const ads = adsOf(state, id).map((ad) => hydrateAd(state, ad));
        const sortedByCtr = [...ads].sort((a, b) => ctr(b.metrics.impressions, b.metrics.clicks) - ctr(a.metrics.impressions, a.metrics.clicks));
        return {
          campaign: c,
          ads,
          stats: campaignStats(state, id),
          series: aggregateSeries(state, id),
          best: sortedByCtr.slice(0, 3).map((ad) => ({
            adId: ad.id,
            title: ad.title,
            ctr: ctr(ad.metrics.impressions, ad.metrics.clicks),
          })),
          worst: sortedByCtr.slice(-3).reverse().map((ad) => ({
            adId: ad.id,
            title: ad.title,
            ctr: ctr(ad.metrics.impressions, ad.metrics.clicks),
          })),
        };
      },

      patch: async (id, input: CampaignPatch): Promise<CreateCampaignResponse> => {
        const state = load();
        const existing = mustCampaign(state, id);
        const updated: Campaign = { ...existing, ...input, updatedAt: nowIso() };
        save({ ...state, campaigns: { ...state.campaigns, [id]: updated } });
        return { campaign: updated };
      },

      remove: async (id): Promise<DeleteCampaignResponse> => {
        const state = load();
        const existing = mustCampaign(state, id);
        const nextCampaigns = { ...state.campaigns };
        delete nextCampaigns[id];
        const nextAds = { ...state.ads };
        const deletedAdIds = new Set(existing.adIds);
        for (const adId of existing.adIds) delete nextAds[adId];
        save({
          ...state,
          campaigns: nextCampaigns,
          ads: nextAds,
          events: state.events.filter((e) => !deletedAdIds.has(e.adId)),
          campaignOrder: state.campaignOrder.filter((cid) => cid !== id),
        });
        return { deletedCampaignId: id, deletedAdIds: [...existing.adIds] };
      },

      duplicate: async (id, _input?: DuplicateCampaignRequest): Promise<DuplicateCampaignResponse> => {
        void _input;
        const state = load();
        const source = mustCampaign(state, id);
        const sourceAds = adsOf(state, id);
        const cloned = cloneCampaign(source, sourceAds);
        const nextAds = { ...state.ads };
        for (const ad of cloned.ads) nextAds[ad.id] = ad;
        save({
          ...state,
          campaigns: { ...state.campaigns, [cloned.campaign.id]: cloned.campaign },
          ads: nextAds,
          campaignOrder: [cloned.campaign.id, ...state.campaignOrder],
        });
        return { campaign: cloned.campaign, ads: cloned.ads };
      },

      setStatus: async (id, input: SetStatusRequest): Promise<CreateCampaignResponse> => {
        const state = load();
        const existing = mustCampaign(state, id);
        const nextStatus: Status = input.toggle
          ? existing.status === 'active' ? 'paused' : 'active'
          : input.status ?? existing.status;
        const updated: Campaign = { ...existing, status: nextStatus, updatedAt: nowIso() };
        save({ ...state, campaigns: { ...state.campaigns, [id]: updated } });
        return { campaign: updated };
      },

      
    },

    ads: {
      list: async (query?: AdListQuery): Promise<{ ads: Array<Ad & { campaignName: string }>; nextCursor: string | null }> => {
        const state = load();
        const q = query?.q?.trim().toLowerCase();
        const ads = Object.values(state.ads)
          .filter((ad) => !query?.status || ad.status === query.status)
          .filter((ad) => !query?.campaignId || ad.campaignId === query.campaignId)
          .filter((ad) => !q || ad.title.toLowerCase().includes(q))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return {
          ads: ads.map((ad) => ({
            ...hydrateAd(state, ad),
            campaignName: state.campaigns[ad.campaignId]?.name ?? '',
          })),
          nextCursor: null,
        };
      },

      create: async (input: AdInput): Promise<CreateAdResponse> => {
        const state = load();
        const campaign = mustCampaign(state, input.campaignId);
        const skeleton = newAdSkeleton(campaign.id);
        const ad: Ad = {
          ...skeleton,
          title: input.title,
          description: input.description ?? '',
          redirectUrl: input.redirectUrl ?? '',
          iconUrl: input.iconUrl,
          status: input.status ?? 'paused',
          location: input.location ?? 'homeScreen',
          targeting: ensureTargeting(input.targeting),
        };
        save({
          ...state,
          ads: { ...state.ads, [ad.id]: ad },
          campaigns: {
            ...state.campaigns,
            [campaign.id]: { ...campaign, adIds: [ad.id, ...campaign.adIds], updatedAt: nowIso() },
          },
        });
        return { ad };
      },

      detail: async (id) => {
        const state = load();
        const ad = mustAd(state, id);
        const campaign = mustCampaign(state, ad.campaignId);
        return { ad: hydrateAd(state, ad), campaign: { id: campaign.id, name: campaign.name } };
      },

      update: async (id, input: UpdateAdRequest): Promise<CreateAdResponse> => {
        const state = load();
        const existing = mustAd(state, id);
        const next: Ad = {
          ...existing,
          title: input.title,
          description: input.description,
          redirectUrl: input.redirectUrl,
          iconUrl: input.iconUrl ?? undefined,
          location: input.location,
          status: input.status,
          targeting: input.targeting,
          updatedAt: nowIso(),
        };
        save({ ...state, ads: { ...state.ads, [id]: next } });
        return { ad: next };
      },

      patch: async (id, input: AdPatch): Promise<CreateAdResponse> => {
        const state = load();
        const existing = mustAd(state, id);
        if (input.campaignId && input.campaignId !== existing.campaignId) {
          mustCampaign(state, input.campaignId);
        }
        const next: Ad = {
          ...existing,
          ...input,
          iconUrl: input.iconUrl ?? existing.iconUrl,
          campaignId: input.campaignId ?? existing.campaignId,
          updatedAt: nowIso(),
        };
        let campaigns = state.campaigns;
        if (input.campaignId && input.campaignId !== existing.campaignId) {
          const oldC = state.campaigns[existing.campaignId];
          const newC = state.campaigns[input.campaignId];
          if (oldC && newC) {
            campaigns = {
              ...campaigns,
              [oldC.id]: { ...oldC, adIds: oldC.adIds.filter((x) => x !== id), updatedAt: nowIso() },
              [newC.id]: { ...newC, adIds: [id, ...newC.adIds], updatedAt: nowIso() },
            };
          }
        }
        save({ ...state, ads: { ...state.ads, [id]: next }, campaigns });
        return { ad: next };
      },

      remove: async (id): Promise<DeleteAdResponse> => {
        const state = load();
        const existing = mustAd(state, id);
        const nextAds = { ...state.ads };
        delete nextAds[id];
        const parent = state.campaigns[existing.campaignId];
        const nextCampaigns = parent
          ? { ...state.campaigns, [parent.id]: { ...parent, adIds: parent.adIds.filter((x) => x !== id), updatedAt: nowIso() } }
          : state.campaigns;
        save({
          ...state,
          ads: nextAds,
          campaigns: nextCampaigns,
          events: state.events.filter((e) => e.adId !== id),
        });
        return { deletedAdId: id, campaignId: existing.campaignId };
      },

      duplicate: async (id, input: DuplicateAdRequest): Promise<DuplicateAdResponse> => {
        const state = load();
        const source = mustAd(state, id);
        mustCampaign(state, input.targetCampaignId);
        const clone = cloneAd(source, input.targetCampaignId);
        const target = state.campaigns[input.targetCampaignId]!;
        save({
          ...state,
          ads: { ...state.ads, [clone.id]: clone },
          campaigns: {
            ...state.campaigns,
            [target.id]: { ...target, adIds: [clone.id, ...target.adIds], updatedAt: nowIso() },
          },
        });
        return { ad: clone };
      },

      setStatus: async (id, input: SetStatusRequest): Promise<CreateAdResponse> => {
        const state = load();
        const existing = mustAd(state, id);
        const nextStatus: Status = input.toggle
          ? existing.status === 'active' ? 'paused' : 'active'
          : input.status ?? existing.status;
        const next: Ad = { ...existing, status: nextStatus, updatedAt: nowIso() };
        save({ ...state, ads: { ...state.ads, [id]: next } });
        return { ad: next };
      },
    },

    analytics: {
      overview: async (query?: AnalyticsOverviewQuery): Promise<AnalyticsOverviewResponse> => {
        const state = load();
        const { impressions, clicks } = totalsOf(state.events);
        let activeAds = 0;
        const perAdTotals = new Map<string, { impressions: number; clicks: number }>();
        for (const ev of state.events) {
          const cur = perAdTotals.get(ev.adId) ?? { impressions: 0, clicks: 0 };
          if (ev.type === 'impression') cur.impressions += 1;
          else cur.clicks += 1;
          perAdTotals.set(ev.adId, cur);
        }
        for (const ad of Object.values(state.ads)) {
          if (ad.status === 'active') activeAds += 1;
        }
        const campaigns = Object.values(state.campaigns);
        const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
        const series = aggregateSeries(state);
        const range = query?.range ?? '30d';
        const n = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : series.length;
        const slicedSeries = series.slice(-n);
        const topAds = Object.values(state.ads)
          .map((ad) => {
            const t = perAdTotals.get(ad.id) ?? { impressions: 0, clicks: 0 };
            return { ad, ...t };
          })
          .filter((row) => row.impressions > 0)
          .sort((a, b) => ctr(b.impressions, b.clicks) - ctr(a.impressions, a.clicks))
          .slice(0, 6)
          .map((row) => ({
            adId: row.ad.id,
            title: row.ad.title,
            campaignId: row.ad.campaignId,
            impressions: row.impressions,
            clicks: row.clicks,
            ctr: ctr(row.impressions, row.clicks),
          }));
        const recentCampaigns = state.campaignOrder
          .map((id) => state.campaigns[id])
          .filter((c): c is Campaign => Boolean(c))
          .slice(0, 4)
          .map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            adCount: c.adIds.length,
            updatedAt: c.updatedAt,
          }));
        return {
          stats: {
            impressions,
            clicks,
            ctr: ctr(impressions, clicks),
            activeCampaigns,
            activeAds,
            totalCampaigns: campaigns.length,
            totalAds: Object.keys(state.ads).length,
          },
          series: slicedSeries,
          topAds,
          recentCampaigns,
        };
      },

      campaignComparison: async () => {
        const state = load();
        return {
          rows: state.campaignOrder
            .map((id) => state.campaigns[id])
            .filter((c): c is Campaign => Boolean(c))
            .map((c) => {
              const s = campaignStats(state, c.id);
              return {
                campaignId: c.id,
                name: c.name,
                status: c.status,
                impressions: s.impressions,
                clicks: s.clicks,
                ctr: s.ctr,
                adCount: s.adCount,
              };
            }),
        };
      },

      series: async (query: AnalyticsSeriesQuery): Promise<AnalyticsSeriesResponse> => {
        const state = load();
        const series = aggregateSeries(state, query.campaignId);
        const from = query.from ?? series[0]?.date ?? '';
        const to = query.to ?? series.at(-1)?.date ?? '';
        const filtered = series.filter((p) => (!from || p.date >= from) && (!to || p.date <= to));
        return { series: filtered, from, to };
      },

      audienceInsights: async (): Promise<AudienceInsightsResponse> => {
        const state = load();
        const tagCounts = new Map<string, number>();
        for (const ad of Object.values(state.ads)) {
          for (const t of ad.targeting.audienceTags) {
            tagCounts.set(t.tag, (tagCounts.get(t.tag) ?? 0) + 1);
          }
        }
        const tagTotal = [...tagCounts.values()].reduce((a, b) => a + b, 0) || 1;
        const tagUsage = [...tagCounts.entries()].map(([tag, count]) => ({
          tag: tag as AudienceInsightsResponse['tagUsage'][number]['tag'],
          count,
          pct: count / tagTotal,
        }));

        const priorityScore = { required: 100, high: 75, medium: 50, low: 25 } as const;
        const dietMap = new Map<string, { count: number; avgPriorityScore: number }>();
        for (const ad of Object.values(state.ads)) {
          for (const d of ad.targeting.dietary) {
            const cur = dietMap.get(d.pref) ?? { count: 0, avgPriorityScore: 0 };
            const score = priorityScore[d.priority];
            dietMap.set(d.pref, {
              count: cur.count + 1,
              avgPriorityScore: (cur.avgPriorityScore * cur.count + score) / (cur.count + 1),
            });
          }
        }
        const dietaryUsage = [...dietMap.entries()].map(([pref, v]) => ({
          pref: pref as AudienceInsightsResponse['dietaryUsage'][number]['pref'],
          count: v.count,
          avgPriorityScore: v.avgPriorityScore,
        }));

        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
        const cells = Array.from({ length: 7 * 24 }, () => 0);
        const perDayAdCount = Array.from({ length: 7 }, () => 0);
        for (const ad of Object.values(state.ads)) {
          const range = ad.targeting.time.range;
          const adDays = ad.targeting.time.days.length > 0 ? ad.targeting.time.days : days;
          const start = range?.startHour ?? 0;
          const end = range?.endHour ?? 24;
          for (const d of adDays) {
            const rIdx = days.indexOf(d);
            if (rIdx < 0) continue;
            perDayAdCount[rIdx] += 1;
            const bump = (a: number, b: number) => {
              for (let h = a; h < b; h++) cells[rIdx * 24 + h] += 1;
            };
            if (end >= start) bump(start, end);
            else {
              bump(start, 24);
              bump(0, end);
            }
          }
        }
        const max = Math.max(1, ...cells);

        // Real-impressions heatmap: distribute each ad's lifetime impressions
        // across the day-hour cells the ad is configured to serve in. This
        // is a defensible approximation given the local adapter has no
        // per-event timestamps for impressions. Real backend will replace
        // this with a true `count(*) GROUP BY dow, hour` aggregation.
        const impressionsCells = Array.from({ length: 7 * 24 }, () => 0);
        let totalImpressions = 0;
        for (const ad of Object.values(state.ads)) {
          const adImpressions = ad.metrics.impressions;
          if (adImpressions === 0) continue;
          totalImpressions += adImpressions;
          const range = ad.targeting.time.range;
          const adDays = ad.targeting.time.days.length > 0 ? ad.targeting.time.days : days;
          const start = range?.startHour ?? 0;
          const end = range?.endHour ?? 24;
          const hourSpans: Array<[number, number]> = [];
          if (end >= start) hourSpans.push([start, end || 24]);
          else {
            hourSpans.push([start, 24]);
            hourSpans.push([0, end]);
          }
          const totalCells = adDays.length * hourSpans.reduce((acc, [a, b]) => acc + (b - a), 0);
          if (totalCells === 0) continue;
          const perCell = adImpressions / totalCells;
          for (const d of adDays) {
            const rIdx = days.indexOf(d);
            if (rIdx < 0) continue;
            for (const [a, b] of hourSpans) {
              for (let h = a; h < b; h++) impressionsCells[rIdx * 24 + h] += perCell;
            }
          }
        }
        const impressionsMax = Math.max(1, ...impressionsCells);

        return {
          tagUsage,
          dietaryUsage,
          engagement: aggregateAdEngagement(state),
          heatmap: { cells, perDayAdCount, max },
          impressionsHeatmap:
            totalImpressions > 0
              ? { cells: impressionsCells, max: impressionsMax, totalImpressions }
              : undefined,
        };
      },

      clickSignals: async (adId): Promise<ClickSignalsResponse> => {
        const state = load();
        const ad = mustAd(state, adId);
        const clickEvents = eventsForAd(state, adId).filter((e) => e.type === 'click');
        const totalClicks = clickEvents.length;

        // Tag / dietary / food-interest distributions: count distinct
        // click events that carried each signal. Same shape the wire
        // contract documents in /backend.md.
        const tagCounts = new Map<string, number>();
        const dietCounts = new Map<string, number>();
        const foodCounts = new Map<string, number>();
        let recurringClicks = 0;
        const dayCounts = Array<number>(7).fill(0);
        const hourCounts = Array<number>(24).fill(0);
        for (const ev of clickEvents) {
          for (const tag of ev.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
          for (const pref of ev.dietary) dietCounts.set(pref, (dietCounts.get(pref) ?? 0) + 1);
          for (const name of ev.foodInterests) {
            const k = name.toLowerCase();
            foodCounts.set(k, (foodCounts.get(k) ?? 0) + 1);
          }
          if (ev.recurringCustomer) recurringClicks += 1;
          const d = new Date(ev.occurredAt);
          dayCounts[(d.getDay() + 6) % 7] += 1;
          hourCounts[d.getHours()] += 1;
        }

        const safeDivide = (n: number) => (totalClicks === 0 ? 0 : n / totalClicks);
        const targetedTagSet = new Set(ad.targeting.audienceTags.map((r) => r.tag));
        const targetedDietSet = new Set(ad.targeting.dietary.map((r) => r.pref));
        const targetedFoodMap = new Map(
          ad.targeting.foodInterests.map((r) => [r.name.toLowerCase(), r.name] as const),
        );

        const topAudienceTags = [...tagCounts.entries()]
          .map(([tag, count]) => ({
            tag: tag as ClickSignalsResponse['topAudienceTags'][number]['tag'],
            label: AUDIENCE_LABEL[tag as keyof typeof AUDIENCE_LABEL] ?? tag,
            pct: safeDivide(count),
            targeted: targetedTagSet.has(tag as ClickSignalsResponse['topAudienceTags'][number]['tag']),
          }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 5);

        const topDietary = [...dietCounts.entries()]
          .map(([pref, count]) => ({
            pref: pref as ClickSignalsResponse['topDietary'][number]['pref'],
            label: DIETARY_LABEL[pref as keyof typeof DIETARY_LABEL] ?? pref,
            pct: safeDivide(count),
            targeted: targetedDietSet.has(pref as ClickSignalsResponse['topDietary'][number]['pref']),
          }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 5);

        const topFoodInterests = [...foodCounts.entries()]
          .map(([key, count]) => ({
            name: targetedFoodMap.get(key) ?? titleCase(key),
            pct: safeDivide(count),
            targeted: targetedFoodMap.has(key),
          }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 5);

        const dayTotal = dayCounts.reduce((a, b) => a + b, 0) || 1;
        const hourTotal = hourCounts.reduce((a, b) => a + b, 0) || 1;
        const clicksByDay = dayCounts.map((n) => n / dayTotal);
        const clicksByHour = hourCounts.map((n) => n / hourTotal);
        const peakHour = clicksByHour.indexOf(Math.max(...clicksByHour, 0));

        return {
          totalClicks,
          topAudienceTags,
          topDietary,
          topFoodInterests,
          recurringPct: safeDivide(recurringClicks),
          clicksByDay,
          clicksByHour,
          peakHour: peakHour < 0 ? 0 : peakHour,
        };
      },
    },
  };
}
