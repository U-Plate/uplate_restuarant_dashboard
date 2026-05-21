import type { Ad, AppState, Campaign, Priority, Targeting } from '../types';

export interface GlobalAnalytics {
  impressions: number;
  clicks: number;
  ctr: number;
  activeCampaigns: number;
  activeAds: number;
  totalCampaigns: number;
  totalAds: number;
}

export function globalAnalytics(state: AppState): GlobalAnalytics {
  let impressions = 0;
  let clicks = 0;
  let activeAds = 0;
  for (const ad of Object.values(state.ads)) {
    impressions += ad.metrics.impressions;
    clicks += ad.metrics.clicks;
    if (ad.status === 'active') activeAds += 1;
  }
  const campaigns = Object.values(state.campaigns);
  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  return {
    impressions,
    clicks,
    ctr,
    activeCampaigns,
    activeAds,
    totalCampaigns: campaigns.length,
    totalAds: Object.keys(state.ads).length,
  };
}

export function campaignAnalytics(state: AppState, campaignId: string) {
  const c = state.campaigns[campaignId];
  if (!c) return { impressions: 0, clicks: 0, ctr: 0, adCount: 0, activeAdCount: 0 };
  let impressions = 0;
  let clicks = 0;
  let activeAdCount = 0;
  for (const adId of c.adIds) {
    const ad = state.ads[adId];
    if (!ad) continue;
    impressions += ad.metrics.impressions;
    clicks += ad.metrics.clicks;
    if (ad.status === 'active') activeAdCount += 1;
  }
  const ctr = impressions === 0 ? 0 : clicks / impressions;
  return { impressions, clicks, ctr, adCount: c.adIds.length, activeAdCount };
}

export function aggregateSeries(state: AppState, campaignId?: string) {
  const ads = campaignId
    ? state.campaigns[campaignId]?.adIds.map((id) => state.ads[id]).filter(Boolean) ?? []
    : Object.values(state.ads);

  const byDate = new Map<string, { date: string; impressions: number; clicks: number }>();
  for (const ad of ads as Ad[]) {
    for (const point of ad.metrics.series) {
      const existing = byDate.get(point.date);
      if (existing) {
        existing.impressions += point.impressions;
        existing.clicks += point.clicks;
      } else {
        byDate.set(point.date, { ...point });
      }
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function topPerformingAds(state: AppState, n = 5): Ad[] {
  return Object.values(state.ads)
    .filter((ad) => ad.metrics.impressions > 0)
    .sort((a, b) => b.metrics.clicks / b.metrics.impressions - a.metrics.clicks / a.metrics.impressions)
    .slice(0, n);
}

export function adCtr(ad: Ad): number {
  return ad.metrics.impressions === 0 ? 0 : ad.metrics.clicks / ad.metrics.impressions;
}

export function campaignsInOrder(state: AppState): Campaign[] {
  return state.campaignOrder
    .map((id) => state.campaigns[id])
    .filter((c): c is Campaign => Boolean(c));
}

export function adsForCampaign(state: AppState, campaignId: string): Ad[] {
  const c = state.campaigns[campaignId];
  if (!c) return [];
  return c.adIds.map((id) => state.ads[id]).filter((ad): ad is Ad => Boolean(ad));
}

export interface TargetingSummary {
  required: number;
  high: number;
  medium: number;
  low: number;
  exclusions: number;
  total: number;
}

export function summarizeTargeting(t: Targeting): TargetingSummary {
  const counts: TargetingSummary = {
    required: 0,
    high: 0,
    medium: 0,
    low: 0,
    exclusions: t.exclusions.length,
    total: 0,
  };
  const bump = (p: Priority) => {
    counts[p] += 1;
    counts.total += 1;
  };
  for (const r of t.audienceTags) bump(r.priority);
  for (const d of t.dietary) bump(d.priority);
  for (const f of t.foodInterests) bump(f.priority);
  if (t.behavioral.recurringCustomer) bump(t.behavioral.recurringPriority);
  return counts;
}

