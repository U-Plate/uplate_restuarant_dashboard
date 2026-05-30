import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { aggregateSeries, globalAnalytics } from '../store/selectors';
import { computeVerdict, deltaFor, ctrDelta } from '../lib/verdict';
import { worthALook } from '../lib/attention';
import { formatNumber, formatPercent } from '../lib/format';
import { Verdict } from '../components/overview/Verdict';
import {
  SupportingNumbers,
  type SupportingNumber,
} from '../components/overview/SupportingNumbers';
import { WorthALook } from '../components/overview/WorthALook';
import { OverviewChart } from '../components/overview/OverviewChart';
import { RecentCampaigns } from '../components/overview/RecentCampaigns';

export default function DashboardOverview() {
  const { state } = useApp();

  const verdict = useMemo(() => computeVerdict(state), [state]);
  const stats = useMemo(() => globalAnalytics(state), [state]);
  const series = useMemo(() => aggregateSeries(state), [state]);
  const attention = useMemo(() => worthALook(state), [state]);

  const clicksDelta = useMemo(() => deltaFor(state, 'clicks'), [state]);
  const ctrTrend = useMemo(() => ctrDelta(state), [state]);

  const last30 = useMemo(() => {
    const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-30);
  }, [series]);

  const clicksSpark = last30.map((p) => p.clicks);
  const ctrSpark = last30.map((p) => (p.impressions === 0 ? 0 : p.clicks / p.impressions));

  const pausedCount = stats.totalCampaigns - stats.activeCampaigns;

  const recentCampaigns = useMemo(() => {
    return Object.values(state.campaigns)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 4);
  }, [state.campaigns]);

  const numbers: SupportingNumber[] = [
    {
      label: 'Clicks',
      value: formatNumber(clicksDelta.recent),
      delta: clicksDelta.hasFullWindow ? clicksDelta.delta : null,
      spark: clicksSpark,
      to: '/analytics',
      tone: 'clicks',
    },
    {
      label: 'CTR · clicks per 100 views',
      value:
        stats.impressions === 0
          ? '0.00%'
          : formatPercent(ctrTrend.recent, 2),
      delta: ctrTrend.hasFullWindow ? ctrTrend.delta : null,
      spark: ctrSpark,
      to: '/analytics',
      tone: 'ctr',
    },
    {
      label: 'Active campaigns',
      value: `${stats.activeCampaigns}`,
      delta: null,
      description:
        stats.totalCampaigns === 0
          ? 'No campaigns yet'
          : pausedCount === 0
            ? `All ${stats.totalCampaigns} running`
            : `${pausedCount} paused`,
      to: '/campaigns',
    },
  ];

  const verdictCta =
    verdict.kind === 'no-campaigns' || verdict.kind === 'no-active'
      ? { label: 'Create a campaign', to: '/campaigns' }
      : undefined;

  // Empty-state layout: verdict + CTA only, no fake skeletons.
  if (verdict.kind === 'no-campaigns') {
    return (
      <div className="uplate-overview">
        <Verdict verdict={verdict} cta={verdictCta} />
      </div>
    );
  }

  return (
    <div className="uplate-overview">
      <Verdict verdict={verdict} cta={verdictCta} />
      <SupportingNumbers numbers={numbers} />
      <WorthALook items={attention} />
      <div className="uplate-overview__bottom">
        <OverviewChart series={series} />
        <RecentCampaigns campaigns={recentCampaigns} />
      </div>
    </div>
  );
}
