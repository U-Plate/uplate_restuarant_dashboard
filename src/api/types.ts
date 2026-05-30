// Wire-format DTOs for the dashboard backend.
//
// These are the request/response shapes documented in /backend.md. They are
// deliberately structurally identical to the domain types in `src/types`
// where possible — the few additions are analytics-only response shapes that
// the server precomputes so the client never has to.

import type {
  Ad,
  AdLocation,
  Allergy,
  AudienceTag,
  Campaign,
  DayOfWeek,
  DietaryPreference,
  Priority,
  Status,
  Targeting,
  AnalyticsPoint,
} from '../types';

export type {
  Ad,
  AdLocation,
  Allergy,
  AudienceTag,
  Campaign,
  DayOfWeek,
  DietaryPreference,
  Priority,
  Status,
  Targeting,
  AnalyticsPoint,
};

export interface RestaurantProfile {
  id: string;
  name?: string;
  iconUrl?: string;
  contactEmail?: string;
  notifications: {
    weekly: boolean;
    emailAlerts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface GlobalStats {
  impressions: number;
  clicks: number;
  ctr: number;
  activeCampaigns: number;
  activeAds: number;
  totalCampaigns: number;
  totalAds: number;
}

export interface CampaignStats {
  impressions: number;
  clicks: number;
  ctr: number;
  adCount: number;
  activeAdCount: number;
}

// ---------- Auth ----------
//
// The dashboard uses Firebase Auth for primary credential management
// (email + password). Server endpoints accept the Firebase ID token in the
// `Authorization: Bearer <token>` header and resolve `restaurant_id` from
// the binding row in `restaurant_users`.

export interface ValidateAccessCodeRequest {
  accessCode: string;
}

export interface ValidateAccessCodeResponse {
  valid: boolean;
  /** Lightweight preview shown on the sign-up screen ("Joining: Boiler Bowl Co."). */
  restaurant?: { id: string; name: string };
}

export interface RegisterRequest {
  accessCode: string;
}

export interface RegisterResponse {
  restaurantId: string;
  restaurant: RestaurantProfile;
}

export interface AuthSessionResponse {
  restaurantId: string;
  restaurant: RestaurantProfile;
}

// ---------- Bootstrap ----------

export interface BootstrapResponse {
  restaurant: RestaurantProfile;
  campaigns: Campaign[];
  ads: Ad[];
  campaignOrder: string[];
  serverTime: string;
}

// ---------- Restaurant ----------

export interface RestaurantPatch {
  name?: string | null;
  iconUrl?: string | null;
  contactEmail?: string | null;
  notifications?: Partial<RestaurantProfile['notifications']>;
}

// ---------- Campaigns ----------

export interface CampaignInput {
  name: string;
  status?: Status;
  startDate: string;
  endDate: string;
}

export interface CampaignPatch {
  name?: string;
  status?: Status;
  startDate?: string;
  endDate?: string;
}

export interface CampaignListItem extends Campaign {
  stats: CampaignStats;
  impressionsSpark: number[];
}

export interface CampaignListResponse {
  campaigns: CampaignListItem[];
}

export interface CampaignDetailResponse {
  campaign: Campaign;
  ads: Ad[];
  stats: CampaignStats;
  series: AnalyticsPoint[];
  best: Array<{ adId: string; title: string; ctr: number }>;
  worst: Array<{ adId: string; title: string; ctr: number }>;
}

export interface CreateCampaignResponse { campaign: Campaign }

export interface DeleteCampaignResponse {
  deletedCampaignId: string;
  deletedAdIds: string[];
}

export interface DuplicateCampaignRequest { nameSuffix?: string }
export interface DuplicateCampaignResponse { campaign: Campaign; ads: Ad[] }

// ---------- Ads ----------

export interface AdInput {
  campaignId: string;
  title: string;
  description?: string;
  redirectUrl?: string;
  iconUrl?: string;
  status?: Status;
  location?: AdLocation;
  targeting?: Targeting;
}

export interface AdPatch {
  title?: string;
  description?: string;
  redirectUrl?: string;
  iconUrl?: string | null;
  location?: AdLocation;
  status?: Status;
  campaignId?: string;
}

export interface UpdateAdRequest {
  title: string;
  description: string;
  redirectUrl: string;
  iconUrl?: string | null;
  location: AdLocation;
  status: Status;
  targeting: Targeting;
}

export interface AdListItem extends Ad {
  campaignName: string;
}

export interface AdListResponse {
  ads: AdListItem[];
  nextCursor: string | null;
}

export interface AdListQuery {
  status?: Status;
  q?: string;
  campaignId?: string;
  limit?: number;
  cursor?: string;
}

export interface AdDetailResponse {
  ad: Ad;
  campaign: { id: string; name: string };
}

export interface CreateAdResponse { ad: Ad }

export interface DeleteAdResponse { deletedAdId: string; campaignId: string }

export interface DuplicateAdRequest {
  targetCampaignId: string;
  titleSuffix?: string;
}
export interface DuplicateAdResponse { ad: Ad }

export interface SetStatusRequest { status?: Status; toggle?: boolean }

// ---------- Analytics ----------

export type AnalyticsRange = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsOverviewQuery { range?: AnalyticsRange }
export interface AnalyticsOverviewResponse {
  stats: GlobalStats;
  series: AnalyticsPoint[];
  topAds: Array<{
    adId: string;
    title: string;
    campaignId: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: Status;
    adCount: number;
    updatedAt: string;
  }>;
}

export interface CampaignComparisonResponse {
  rows: Array<{
    campaignId: string;
    name: string;
    status: Status;
    impressions: number;
    clicks: number;
    ctr: number;
    adCount: number;
  }>;
}

export interface AnalyticsSeriesQuery {
  from?: string;
  to?: string;
  campaignId?: string;
}
export interface AnalyticsSeriesResponse {
  series: AnalyticsPoint[];
  from: string;
  to: string;
}

/** One ranked row in the cross-ad engagement aggregate. */
export interface AudienceEngagementRow {
  /** Stable identity for the row (tag / pref / lowercased food name). */
  key: string;
  label: string;
  /** Share of total clicks carrying this signal, in [0,1]. */
  pct: number;
  /** Whether any of the restaurant's ads target this signal. */
  targeted: boolean;
}

/**
 * Click-engagement aggregated across every ad, precomputed server-side so the
 * Audience Insights screen reads it from the single `/analytics/audience-insights`
 * call instead of fanning out one `click-signals` request per ad.
 */
export interface AudienceEngagement {
  totalClicks: number;
  topAudienceTags: AudienceEngagementRow[];
  topDietary: AudienceEngagementRow[];
  topFoodInterests: AudienceEngagementRow[];
  recurringPct: number;
  /** Number of ads that received at least one click. */
  contributingAdCount: number;
}

export interface AudienceInsightsResponse {
  tagUsage: Array<{ tag: AudienceTag; count: number; pct: number }>;
  dietaryUsage: Array<{
    pref: DietaryPreference;
    count: number;
    avgPriorityScore: number;
  }>;
  /** Cross-ad click engagement (who actually clicks), aggregated server-side. */
  engagement: AudienceEngagement;
  heatmap: {
    cells: number[];
    perDayAdCount: number[];
    max: number;
  };
  /**
   * Optional 7x24 heatmap of real impressions, indexed as `day*24 + hour`.
   * Not yet returned by the production backend; available from the local
   * adapter for dev. Front-end falls back to an empty-state when absent.
   */
  impressionsHeatmap?: {
    cells: number[];
    max: number;
    totalImpressions: number;
  };
}

export interface ClickSignalsResponse {
  totalClicks: number;
  topAudienceTags: Array<{
    tag: AudienceTag;
    label: string;
    pct: number;
    targeted: boolean;
  }>;
  topDietary: Array<{
    pref: DietaryPreference;
    label: string;
    pct: number;
    targeted: boolean;
  }>;
  topFoodInterests: Array<{
    name: string;
    pct: number;
    targeted: boolean;
  }>;
  recurringPct: number;
  clicksByDay: number[];
  clicksByHour: number[];
  peakHour: number;
}

// ---------- Errors ----------

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
    requestId: string;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string>;
  readonly requestId?: string;

  constructor(status: number, body: ApiErrorBody | { error?: Partial<ApiErrorBody['error']> }) {
    const err = body?.error ?? { code: 'unknown', message: 'Unknown error' };
    super(err.message ?? 'Unknown error');
    this.name = 'ApiError';
    this.status = status;
    this.code = err.code ?? 'unknown';
    this.fieldErrors = err.fieldErrors;
    this.requestId = err.requestId;
  }
}
