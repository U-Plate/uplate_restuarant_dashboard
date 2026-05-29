/*
 * Audience Insights computations: aggregate engagement across all ads and
 * surface the "coverage line" that names a gap when one exists.
 */

import { api } from '../api';
import type {
  AudienceInsightsResponse,
  ClickSignalsResponse,
} from '../api';
import type { AppState } from '../types';
import { AUDIENCE_LABEL, DIETARY_LABEL } from '../data/constants';

export interface EngagementRow {
  key: string;
  label: string;
  pct: number;
  targeted: boolean;
}

export interface AggregateEngagement {
  totalClicks: number;
  topAudienceTags: EngagementRow[];
  topDietary: EngagementRow[];
  topFoodInterests: EngagementRow[];
  recurringPct: number;
  loadedFor: string[]; // ad ids that contributed
}

/**
 * Aggregate clickSignals across the provided ad ids in parallel. Resolves
 * with totals + ranked top rows. Failed individual calls are dropped, not
 * fatal. Empty result when zero ads reported clicks.
 */
export async function aggregateEngagement(adIds: string[]): Promise<AggregateEngagement> {
  if (adIds.length === 0) {
    return emptyEngagement();
  }

  const results = await Promise.allSettled(
    adIds.map((id) => api.analytics.clickSignals(id)),
  );

  const successful: ClickSignalsResponse[] = [];
  const loadedFor: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      successful.push(r.value);
      loadedFor.push(adIds[i]);
    }
  });

  let totalClicks = 0;
  let recurringClicks = 0;
  const tagAcc = new Map<string, { label: string; clicks: number; targeted: boolean }>();
  const dietAcc = new Map<string, { label: string; clicks: number; targeted: boolean }>();
  const foodAcc = new Map<string, { label: string; clicks: number; targeted: boolean }>();

  for (const sig of successful) {
    totalClicks += sig.totalClicks;
    recurringClicks += sig.recurringPct * sig.totalClicks;
    for (const row of sig.topAudienceTags) {
      const prev = tagAcc.get(row.tag);
      tagAcc.set(row.tag, {
        label: row.label,
        clicks: (prev?.clicks ?? 0) + row.pct * sig.totalClicks,
        targeted: prev?.targeted || row.targeted,
      });
    }
    for (const row of sig.topDietary) {
      const prev = dietAcc.get(row.pref);
      dietAcc.set(row.pref, {
        label: row.label,
        clicks: (prev?.clicks ?? 0) + row.pct * sig.totalClicks,
        targeted: prev?.targeted || row.targeted,
      });
    }
    for (const row of sig.topFoodInterests) {
      const prev = foodAcc.get(row.name.toLowerCase());
      foodAcc.set(row.name.toLowerCase(), {
        label: row.name,
        clicks: (prev?.clicks ?? 0) + row.pct * sig.totalClicks,
        targeted: prev?.targeted || row.targeted,
      });
    }
  }

  const toRows = (m: Map<string, { label: string; clicks: number; targeted: boolean }>): EngagementRow[] => {
    if (totalClicks === 0) return [];
    return Array.from(m.entries())
      .map(([key, v]) => ({
        key,
        label: v.label,
        pct: v.clicks / totalClicks,
        targeted: v.targeted,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  };

  return {
    totalClicks,
    topAudienceTags: toRows(tagAcc),
    topDietary: toRows(dietAcc),
    topFoodInterests: toRows(foodAcc),
    recurringPct: totalClicks === 0 ? 0 : recurringClicks / totalClicks,
    loadedFor,
  };
}

function emptyEngagement(): AggregateEngagement {
  return {
    totalClicks: 0,
    topAudienceTags: [],
    topDietary: [],
    topFoodInterests: [],
    recurringPct: 0,
    loadedFor: [],
  };
}

export interface CoverageInsight {
  headline: string;
  support: string;
}

/**
 * Surface a single "gap" sentence when one is earned. Returns null otherwise.
 * Templates (in priority order):
 *   - tag mismatch: operator targets X heavily but Y converts more per click
 *   - untargeted share: ≥25% of ads have no audience tags
 *   - no tag clicks vs heavy targeting
 */
export function coverageInsight(
  state: AppState,
  coverage: AudienceInsightsResponse,
  engagement: AggregateEngagement,
): CoverageInsight | null {
  const totalAds = Object.keys(state.ads).length;
  if (totalAds === 0) return null;

  const untargetedAds = Object.values(state.ads).filter(
    (ad) => ad.targeting.audienceTags.length === 0,
  ).length;

  // Tag-mismatch: a tag with high engagement that the operator under-targets.
  if (engagement.totalClicks > 0 && coverage.tagUsage.length > 0) {
    const topClickedTag = engagement.topAudienceTags[0];
    if (topClickedTag && !topClickedTag.targeted && topClickedTag.pct >= 0.3) {
      return {
        headline: `${topClickedTag.label} viewers drive ${Math.round(topClickedTag.pct * 100)}% of clicks.`,
        support: `You’re not targeting them. Consider adding ${topClickedTag.label} to your highest-volume campaign.`,
      };
    }

    const heaviestTargetedTag = coverage.tagUsage[0];
    const matchingClickRow = engagement.topAudienceTags.find(
      (r) => r.key === heaviestTargetedTag.tag,
    );
    const otherClickedTag = engagement.topAudienceTags.find(
      (r) => r.key !== heaviestTargetedTag.tag && r.pct > (matchingClickRow?.pct ?? 0) * 1.5,
    );
    if (otherClickedTag) {
      return {
        headline: `${AUDIENCE_LABEL[heaviestTargetedTag.tag]} is your most-targeted audience.`,
        support: `${otherClickedTag.label} viewers click more often. Worth widening your reach.`,
      };
    }
  }

  // Untargeted share.
  if (untargetedAds / totalAds >= 0.25 && untargetedAds >= 2) {
    return {
      headline: `${untargetedAds} of your ${totalAds} ads have no audience targeting.`,
      support: `They serve to everyone, which can dilute your CTR. Try adding at least one audience tag.`,
    };
  }

  // No dietary engagement despite heavy dietary targeting.
  if (coverage.dietaryUsage.length >= 2 && engagement.totalClicks > 0) {
    const dietaryShare = engagement.topDietary.reduce((a, r) => a + r.pct, 0);
    if (dietaryShare < 0.1) {
      const top = coverage.dietaryUsage[0];
      return {
        headline: `Your dietary targeting isn’t pulling clicks.`,
        support: `${DIETARY_LABEL[top.pref]} is set on ${top.count} ad${top.count === 1 ? '' : 's'} but accounts for under 10% of clicks.`,
      };
    }
  }

  return null;
}
