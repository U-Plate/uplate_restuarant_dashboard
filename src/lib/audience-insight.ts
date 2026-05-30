/*
 * Audience Insights computation: surface the "coverage line" that names a gap
 * when one exists. The cross-ad engagement aggregate it reads is computed
 * server-side and delivered inside `AudienceInsightsResponse.engagement`.
 */

import type { AudienceEngagement, AudienceInsightsResponse } from '../api';
import type { AppState } from '../types';
import { AUDIENCE_LABEL, DIETARY_LABEL } from '../data/constants';

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
  engagement: AudienceEngagement,
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
