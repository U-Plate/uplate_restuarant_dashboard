/*
 * Verdict: a plain-English one-sentence summary of "is it working?"
 *
 * The library never invents numbers. When there isn't enough signal it says
 * so directly. When there is, it states the delta and names the campaign
 * (or ad) doing the most work in that direction.
 */

import type { Ad, AnalyticsPoint, AppState, Campaign } from '../types';
import { aggregateSeries, campaignsInOrder, adsForCampaign } from '../store/selectors';

export type VerdictKind =
  | 'no-campaigns'
  | 'no-active'
  | 'no-ads'
  | 'no-active-ads'
  | 'too-early'
  | 'flat'
  | 'up'
  | 'down';

export interface Verdict {
  kind: VerdictKind;
  /** Tightly-worded headline phrase. Always present. */
  headline: string;
  /** Italic supporting clause shown under the headline. Empty when none earned. */
  support: string;
  /** Optional inline emphasis target (campaign or ad name + link). */
  link?: { label: string; to: string };
  /** Plain-number summary used by the supporting numbers row's window. */
  clicksLast7: number;
  clicksPrev7: number;
  /** Signed share. 0 when previous is 0 and current is 0. */
  delta: number;
  /** True if we have at least 7 distinct dated points in the series. */
  hasFullWindow: boolean;
}

function lastNDays<T extends { date: string }>(points: T[], n: number, offset = 0): T[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const end = sorted.length - offset;
  const start = Math.max(0, end - n);
  return sorted.slice(start, end);
}

function sumClicks<T extends { clicks: number }>(points: T[]): number {
  return points.reduce((acc, p) => acc + p.clicks, 0);
}

interface CampaignDelta {
  campaign: Campaign;
  recent: number;
  prior: number;
  delta: number;
}

interface AdDelta {
  ad: Ad;
  recent: number;
  prior: number;
  delta: number;
}

function campaignDeltas(state: AppState): CampaignDelta[] {
  return campaignsInOrder(state).map((c) => {
    const ads = c.adIds.map((id) => state.ads[id]).filter(Boolean) as Ad[];
    let recent = 0;
    let prior = 0;
    for (const ad of ads) {
      recent += sumClicks(lastNDays(ad.metrics.series, 7, 0));
      prior += sumClicks(lastNDays(ad.metrics.series, 7, 7));
    }
    return { campaign: c, recent, prior, delta: recent - prior };
  });
}

function adDeltasFor(state: AppState, campaignId: string): AdDelta[] {
  return adsForCampaign(state, campaignId).map((ad) => ({
    ad,
    recent: sumClicks(lastNDays(ad.metrics.series, 7, 0)),
    prior: sumClicks(lastNDays(ad.metrics.series, 7, 7)),
    delta:
      sumClicks(lastNDays(ad.metrics.series, 7, 0)) -
      sumClicks(lastNDays(ad.metrics.series, 7, 7)),
  }));
}

function leadingCampaign(
  deltas: CampaignDelta[],
  direction: 'up' | 'down',
): CampaignDelta | undefined {
  const candidates = deltas.filter((d) => (direction === 'up' ? d.delta > 0 : d.delta < 0));
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) =>
    direction === 'up' ? b.delta - a.delta : a.delta - b.delta,
  );
  return candidates[0];
}

function leadingAd(deltas: AdDelta[], direction: 'up' | 'down'): AdDelta | undefined {
  const candidates = deltas.filter((d) => (direction === 'up' ? d.delta > 0 : d.delta < 0));
  if (candidates.length === 0) return undefined;
  candidates.sort((a, b) => (direction === 'up' ? b.delta - a.delta : a.delta - b.delta));
  return candidates[0];
}

export function computeVerdict(state: AppState): Verdict {
  const series = aggregateSeries(state);
  const campaigns = campaignsInOrder(state);

  if (campaigns.length === 0) {
    return {
      kind: 'no-campaigns',
      headline: 'You haven\'t created a campaign yet.',
      support: 'Pick a goal to start showing ads on UPlate.',
      clicksLast7: 0,
      clicksPrev7: 0,
      delta: 0,
      hasFullWindow: false,
    };
  }

  const activeCount = campaigns.filter((c) => c.status === 'active').length;
  if (activeCount === 0) {
    return {
      kind: 'no-active',
      headline: 'Nothing\'s running right now.',
      support: 'Activate a campaign to start collecting data.',
      clicksLast7: 0,
      clicksPrev7: 0,
      delta: 0,
      hasFullWindow: false,
    };
  }

  return verdictFromSeries(series, () => leadingCampaign(campaignDeltas(state), 'up'), () =>
    leadingCampaign(campaignDeltas(state), 'down'),
  {
    upTemplate: (_pct, leader) =>
      leader
        ? {
            support: `Most of it came from your ${leader.campaign.name} campaign.`,
            link: { label: leader.campaign.name, to: `/campaigns/${leader.campaign.id}` },
          }
        : { support: null },
    downTemplate: (_pct, leader) =>
      leader
        ? {
            support: `Most of the drop is from your ${leader.campaign.name} campaign.`,
            link: { label: leader.campaign.name, to: `/campaigns/${leader.campaign.id}` },
          }
        : { support: null },
  });
}

export function computeCampaignVerdict(state: AppState, campaignId: string): Verdict {
  const campaign = state.campaigns[campaignId];
  if (!campaign) {
    return emptyVerdict('no-ads', 'No data for this campaign.', 'It may have been deleted.');
  }

  const ads = adsForCampaign(state, campaignId);

  if (ads.length === 0) {
    return emptyVerdict(
      'no-ads',
      'No ads in this campaign yet.',
      'Create your first ad to start collecting data.',
    );
  }

  if (ads.every((ad) => ad.status !== 'active') || campaign.status !== 'active') {
    return emptyVerdict(
      'no-active-ads',
      'Nothing\'s running yet for this campaign.',
      campaign.status === 'active'
        ? 'All ads are paused. Activate at least one to start collecting data.'
        : 'Activate the campaign to start collecting data.',
    );
  }

  const series = aggregateSeries(state, campaignId);

  return verdictFromSeries(
    series,
    () => leadingAd(adDeltasFor(state, campaignId), 'up'),
    () => leadingAd(adDeltasFor(state, campaignId), 'down'),
    {
      upTemplate: (_pct, leader) =>
        leader
          ? {
              support: `Most of it came from your ${leader.ad.title} ad.`,
              link: {
                label: leader.ad.title,
                to: `/campaigns/${campaignId}/ads/${leader.ad.id}`,
              },
            }
          : { support: null },
      downTemplate: (_pct, leader) =>
        leader
          ? {
              support: `Your ${leader.ad.title} ad lost the most clicks.`,
              link: {
                label: leader.ad.title,
                to: `/campaigns/${campaignId}/ads/${leader.ad.id}`,
              },
            }
          : { support: null },
      noChange: `${campaign.name} is steady this week.`,
    },
  );
}

interface SeriesTemplateOpts<L> {
  upTemplate: (pct: number, leader: L | undefined) => { support: string | null; link?: Verdict['link'] };
  downTemplate: (pct: number, leader: L | undefined) => { support: string | null; link?: Verdict['link'] };
  /** Headline override for flat. Defaults to "About the same as last week." */
  noChange?: string;
}

function verdictFromSeries<L>(
  series: AnalyticsPoint[],
  upLeader: () => L | undefined,
  downLeader: () => L | undefined,
  opts: SeriesTemplateOpts<L>,
): Verdict {
  const hasFullWindow = series.length >= 7;
  const recent = lastNDays(series, 7, 0);
  const prior = lastNDays(series, 7, 7);
  const clicksLast7 = sumClicks(recent);
  const clicksPrev7 = sumClicks(prior);

  if (!hasFullWindow || clicksPrev7 === 0) {
    return {
      kind: 'too-early',
      headline: 'Too early to call it.',
      support:
        clicksLast7 > 0
          ? `You picked up ${clicksLast7} click${clicksLast7 === 1 ? '' : 's'} so far. Check back in a few days.`
          : 'Check back in a few days once your ads have run.',
      clicksLast7,
      clicksPrev7,
      delta: 0,
      hasFullWindow,
    };
  }

  const delta = (clicksLast7 - clicksPrev7) / clicksPrev7;

  if (Math.abs(delta) < 0.05) {
    return {
      kind: 'flat',
      headline: opts.noChange ?? 'About the same as last week.',
      support: `${formatClicks(clicksLast7)} this week, ${formatClicks(clicksPrev7)} the week before.`,
      clicksLast7,
      clicksPrev7,
      delta,
      hasFullWindow,
    };
  }

  const direction: 'up' | 'down' = delta > 0 ? 'up' : 'down';
  const pct = Math.round(Math.abs(delta) * 100);
  const leader = direction === 'up' ? upLeader() : downLeader();
  const template =
    direction === 'up' ? opts.upTemplate(pct, leader) : opts.downTemplate(pct, leader);

  const fallback = `${formatClicks(clicksLast7)} this week, ${formatClicks(clicksPrev7)} the week before.`;

  return {
    kind: direction,
    headline:
      direction === 'up'
        ? `Clicks are up ${pct}% this week.`
        : `Clicks are down ${pct}% this week.`,
    support: template.support ?? fallback,
    link: template.link,
    clicksLast7,
    clicksPrev7,
    delta,
    hasFullWindow,
  };
}

function emptyVerdict(kind: VerdictKind, headline: string, support: string): Verdict {
  return {
    kind,
    headline,
    support,
    clicksLast7: 0,
    clicksPrev7: 0,
    delta: 0,
    hasFullWindow: false,
  };
}

function formatClicks(n: number): string {
  return `${n.toLocaleString()} click${n === 1 ? '' : 's'}`;
}

export function deltaFor(state: AppState, metric: 'clicks' | 'impressions', campaignId?: string) {
  const series = aggregateSeries(state, campaignId);
  if (series.length < 7) return { recent: 0, prior: 0, delta: 0, hasFullWindow: false };
  const recent = lastNDays(series, 7, 0);
  const prior = lastNDays(series, 7, 7);
  const sumMetric = (rows: typeof series) =>
    rows.reduce((acc, p) => acc + (metric === 'clicks' ? p.clicks : p.impressions), 0);
  const r = sumMetric(recent);
  const p = sumMetric(prior);
  const delta = p === 0 ? (r === 0 ? 0 : 1) : (r - p) / p;
  return { recent: r, prior: p, delta, hasFullWindow: series.length >= 14 };
}

export function ctrDelta(state: AppState, campaignId?: string) {
  const series = aggregateSeries(state, campaignId);
  if (series.length < 14) return { recent: 0, prior: 0, delta: 0, hasFullWindow: false };
  const recent = lastNDays(series, 7, 0);
  const prior = lastNDays(series, 7, 7);
  const ctr = (rows: typeof series) => {
    const i = rows.reduce((a, p) => a + p.impressions, 0);
    const c = rows.reduce((a, p) => a + p.clicks, 0);
    return i === 0 ? 0 : c / i;
  };
  const r = ctr(recent);
  const p = ctr(prior);
  const delta = p === 0 ? (r === 0 ? 0 : 1) : (r - p) / p;
  return { recent: r, prior: p, delta, hasFullWindow: series.length >= 14 };
}

/**
 * Conditional verdict for a single ad. Returns null when the ad doesn't earn
 * a verdict (delta < 10%, not cold, not no-data, not stalled). When a verdict
 * is earned, returns the standard Verdict shape with ad-scoped copy.
 *
 * Thresholds asserted in the brief: 10% delta, 100 impressions / 0 clicks
 * for Cold, 14 days with no impressions for Not-collecting.
 */
export function computeAdVerdict(state: AppState, adId: string): Verdict | null {
  const ad = state.ads[adId];
  if (!ad) return null;
  const series = ad.metrics.series;

  // Not-collecting: 14+ days of life with zero impressions ever.
  const totalImpressionsAllTime = series.reduce((acc, p) => acc + p.impressions, 0);
  if (series.length >= 14 && totalImpressionsAllTime === 0) {
    return {
      kind: 'too-early',
      headline: 'This ad hasn\'t been served yet.',
      support: 'Check the campaign status, audience filters, and date range.',
      clicksLast7: 0,
      clicksPrev7: 0,
      delta: 0,
      hasFullWindow: false,
    };
  }

  const recent = lastNDays(series, 7, 0);
  const prior = lastNDays(series, 7, 7);
  const clicks7d = sumClicks(recent);
  const clicks7dPrev = sumClicks(prior);
  const imp7d = recent.reduce((a, p) => a + p.impressions, 0);

  // Cold: actively serving (≥100 impressions in the last 7d) and 0 clicks.
  if (ad.status === 'active' && imp7d >= 100 && clicks7d === 0) {
    return {
      kind: 'down',
      headline: 'This ad is showing but not converting.',
      support: 'Try changing the copy or audience.',
      clicksLast7: 0,
      clicksPrev7: clicks7dPrev,
      delta: -1,
      hasFullWindow: series.length >= 14,
    };
  }

  // Not enough baseline to compare against.
  if (series.length < 14 || clicks7dPrev === 0) return null;

  const delta = (clicks7d - clicks7dPrev) / clicks7dPrev;
  if (Math.abs(delta) < 0.1) return null;

  const pct = Math.round(Math.abs(delta) * 100);
  if (delta > 0) {
    const gained = clicks7d - clicks7dPrev;
    return {
      kind: 'up',
      headline: `This ad picked up ${gained} more click${gained === 1 ? '' : 's'} this week.`,
      support: `${pct}% more than the week before.`,
      clicksLast7: clicks7d,
      clicksPrev7: clicks7dPrev,
      delta,
      hasFullWindow: true,
    };
  }
  return {
    kind: 'down',
    headline: `This ad cooled off this week.`,
    support: `${pct}% fewer clicks than the week before.`,
    clicksLast7: clicks7d,
    clicksPrev7: clicks7dPrev,
    delta,
    hasFullWindow: true,
  };
}

/**
 * 7-day window metrics for a single ad (no campaign required). Used by the
 * AdsLibrary card to summarize each ad inline.
 */
export function singleAdWindow(state: AppState, adId: string): AdWindowMetrics | null {
  const ad = state.ads[adId];
  if (!ad) return null;
  const recent = lastNDays(ad.metrics.series, 7, 0);
  const prior = lastNDays(ad.metrics.series, 7, 7);
  const clicks7d = sumClicks(recent);
  const clicks7dPrev = sumClicks(prior);
  const imp7d = recent.reduce((a, p) => a + p.impressions, 0);
  const impPrev = prior.reduce((a, p) => a + p.impressions, 0);
  const ctr7d = imp7d === 0 ? 0 : clicks7d / imp7d;
  const ctr7dPrev = impPrev === 0 ? 0 : clicks7dPrev / impPrev;
  const ctrDeltaValue =
    ctr7dPrev === 0 ? (ctr7d === 0 ? 0 : 1) : (ctr7d - ctr7dPrev) / ctr7dPrev;
  const clicksDelta =
    clicks7dPrev === 0 ? (clicks7d === 0 ? 0 : 1) : (clicks7d - clicks7dPrev) / clicks7dPrev;
  const spark30d = lastNDays(ad.metrics.series, 30, 0).map((p) => p.clicks);
  return {
    ad,
    clicks7d,
    clicks7dPrev,
    impressions7d: imp7d,
    ctr7d,
    ctr7dPrev,
    ctrDelta: ctrDeltaValue,
    clicksDelta,
    spark30d,
  };
}

/**
 * 7-day window metrics for a single campaign (clicks + sparkline). Used by
 * the CampaignCard.
 */
export interface CampaignWindowMetrics {
  clicks7d: number;
  clicks7dPrev: number;
  impressions7d: number;
  ctr7d: number;
  ctr7dPrev: number;
  ctrDelta: number;
  clicksDelta: number;
  spark30d: number[];
}

export function campaignWindow(state: AppState, campaignId: string): CampaignWindowMetrics {
  const series = aggregateSeries(state, campaignId);
  const recent = lastNDays(series, 7, 0);
  const prior = lastNDays(series, 7, 7);
  const clicks7d = sumClicks(recent);
  const clicks7dPrev = sumClicks(prior);
  const imp7d = recent.reduce((a, p) => a + p.impressions, 0);
  const impPrev = prior.reduce((a, p) => a + p.impressions, 0);
  const ctr7d = imp7d === 0 ? 0 : clicks7d / imp7d;
  const ctr7dPrev = impPrev === 0 ? 0 : clicks7dPrev / impPrev;
  const ctrDeltaValue =
    ctr7dPrev === 0 ? (ctr7d === 0 ? 0 : 1) : (ctr7d - ctr7dPrev) / ctr7dPrev;
  const clicksDelta =
    clicks7dPrev === 0 ? (clicks7d === 0 ? 0 : 1) : (clicks7d - clicks7dPrev) / clicks7dPrev;
  const sortedSeries = [...series].sort((a, b) => a.date.localeCompare(b.date));
  const spark30d = sortedSeries.slice(-30).map((p) => p.clicks);
  return {
    clicks7d,
    clicks7dPrev,
    impressions7d: imp7d,
    ctr7d,
    ctr7dPrev,
    ctrDelta: ctrDeltaValue,
    clicksDelta,
    spark30d,
  };
}

/**
 * Per-ad 7-day window metrics + 30-day clicks series. Used by AdsTable.
 */
export interface AdWindowMetrics {
  ad: Ad;
  clicks7d: number;
  clicks7dPrev: number;
  impressions7d: number;
  ctr7d: number;
  ctr7dPrev: number;
  ctrDelta: number;
  clicksDelta: number;
  spark30d: number[];
}

export function adWindowMetrics(state: AppState, campaignId: string): AdWindowMetrics[] {
  return adsForCampaign(state, campaignId).map((ad) => {
    const recent = lastNDays(ad.metrics.series, 7, 0);
    const prior = lastNDays(ad.metrics.series, 7, 7);
    const clicks7d = sumClicks(recent);
    const clicks7dPrev = sumClicks(prior);
    const imp7d = recent.reduce((a, p) => a + p.impressions, 0);
    const impPrev = prior.reduce((a, p) => a + p.impressions, 0);
    const ctr7d = imp7d === 0 ? 0 : clicks7d / imp7d;
    const ctr7dPrev = impPrev === 0 ? 0 : clicks7dPrev / impPrev;
    const ctrDeltaValue =
      ctr7dPrev === 0 ? (ctr7d === 0 ? 0 : 1) : (ctr7d - ctr7dPrev) / ctr7dPrev;
    const clicksDelta =
      clicks7dPrev === 0
        ? clicks7d === 0
          ? 0
          : 1
        : (clicks7d - clicks7dPrev) / clicks7dPrev;
    const spark30d = lastNDays(ad.metrics.series, 30, 0).map((p) => p.clicks);
    return {
      ad,
      clicks7d,
      clicks7dPrev,
      impressions7d: imp7d,
      ctr7d,
      ctr7dPrev,
      ctrDelta: ctrDeltaValue,
      clicksDelta,
      spark30d,
    };
  });
}
