/*
 * "Worth a look" computes a small list of attention-worthy items from real
 * state. It never invents urgency. If nothing matches, the list is empty
 * and the section renders nothing on the page.
 */

import type { Ad, AppState, Campaign } from '../types';
import { campaignsInOrder } from '../store/selectors';

export type AttentionKind =
  | 'campaign-ending'
  | 'campaign-past-end'
  | 'campaign-no-active-ads'
  | 'ad-cold'; // active ad with impressions but no clicks

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: 'info' | 'warn';
  text: string;
  to: string;
}

const MAX_ITEMS = 3;
const ENDING_HORIZON_DAYS = 4;
const COLD_AD_MIN_IMPRESSIONS = 100;
const COLD_AD_WINDOW_DAYS = 7;

function todayUtcDate(now: Date = new Date()): Date {
  // Use UTC date math; date_str fields are calendar dates.
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function dateFromIso(iso: string): Date {
  return new Date(iso + 'T00:00:00Z');
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function describeEndOffset(days: number): string {
  if (days === 0) return 'ends today';
  if (days === 1) return 'ends tomorrow';
  return `ends in ${days} days`;
}

function adWindowMetrics(ad: Ad, windowDays: number, today: Date) {
  let impressions = 0;
  let clicks = 0;
  const cutoff = new Date(today.getTime() - windowDays * 86_400_000);
  for (const p of ad.metrics.series) {
    if (dateFromIso(p.date) >= cutoff) {
      impressions += p.impressions;
      clicks += p.clicks;
    }
  }
  return { impressions, clicks };
}

export function worthALook(state: AppState, now: Date = new Date()): AttentionItem[] {
  const items: AttentionItem[] = [];
  const today = todayUtcDate(now);
  const campaigns = campaignsInOrder(state);

  for (const c of campaigns) {
    if (c.status !== 'active') continue;

    const endsAt = dateFromIso(c.endDate);
    const daysUntilEnd = daysBetween(today, endsAt);

    if (daysUntilEnd < 0) {
      items.push({
        id: `pastend-${c.id}`,
        kind: 'campaign-past-end',
        severity: 'warn',
        text: `${c.name} is past its end date.`,
        to: `/campaigns/${c.id}`,
      });
      continue; // don't double-flag this campaign for "ends in"
    }

    if (daysUntilEnd >= 0 && daysUntilEnd <= ENDING_HORIZON_DAYS) {
      items.push({
        id: `ending-${c.id}`,
        kind: 'campaign-ending',
        severity: 'info',
        text: `${c.name} ${describeEndOffset(daysUntilEnd)}.`,
        to: `/campaigns/${c.id}`,
      });
    }

    // Active campaign with no active ads is meaningful only if it has ads at all.
    if (c.adIds.length > 0) {
      const anyActive = c.adIds.some((id) => state.ads[id]?.status === 'active');
      if (!anyActive) {
        items.push({
          id: `noads-${c.id}`,
          kind: 'campaign-no-active-ads',
          severity: 'warn',
          text: `${c.name} has no active ads.`,
          to: `/campaigns/${c.id}`,
        });
      }
    }
  }

  // Cold ads: meaningful only when they have a real impression base to compare against.
  const coldCandidates = Object.values(state.ads)
    .filter((ad) => ad.status === 'active')
    .map((ad) => ({ ad, ...adWindowMetrics(ad, COLD_AD_WINDOW_DAYS, today) }))
    .filter((row) => row.impressions >= COLD_AD_MIN_IMPRESSIONS && row.clicks === 0)
    .sort((a, b) => b.impressions - a.impressions);

  for (const c of coldCandidates) {
    const parent: Campaign | undefined = state.campaigns[c.ad.campaignId];
    if (!parent) continue;
    items.push({
      id: `cold-${c.ad.id}`,
      kind: 'ad-cold',
      severity: 'info',
      text: `${c.ad.title} has 0 clicks this week (${c.impressions.toLocaleString()} views).`,
      to: `/campaigns/${parent.id}/ads/${c.ad.id}`,
    });
  }

  // Rank: warnings before info, then preserve insertion order.
  items.sort((a, b) => {
    const sevRank = (s: AttentionItem['severity']) => (s === 'warn' ? 0 : 1);
    return sevRank(a.severity) - sevRank(b.severity);
  });

  return items.slice(0, MAX_ITEMS);
}
