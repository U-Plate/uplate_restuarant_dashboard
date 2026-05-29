import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api';
import type { AudienceInsightsResponse } from '../api';
import { Verdict } from '../components/overview/Verdict';
import { CoverageList } from '../components/audience/CoverageList';
import { EngagementPanel } from '../components/audience/EngagementPanel';
import { HeatmapPair } from '../components/audience/HeatmapPair';
import {
  coverageInsight,
  type AggregateEngagement,
} from '../lib/audience-insight';

export default function AudienceInsights() {
  const { state } = useApp();
  const [insights, setInsights] = useState<AudienceInsightsResponse | null>(null);
  const [engagement, setEngagement] = useState<AggregateEngagement | null>(null);
  const [insightsError, setInsightsError] = useState(false);

  const adIds = useMemo(() => Object.keys(state.ads), [state.ads]);

  useEffect(() => {
    let cancelled = false;
    setInsights(null);
    setInsightsError(false);
    api.analytics
      .audienceInsights()
      .then((res) => {
        if (!cancelled) setInsights(res);
      })
      .catch(() => {
        if (!cancelled) setInsightsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

  const insight = useMemo(() => {
    if (!insights || !engagement) return null;
    return coverageInsight(state, insights, engagement);
  }, [state, insights, engagement]);

  const hasAds = adIds.length > 0;

  if (!hasAds) {
    return <EmptyAudience />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-8)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-headline)',
            lineHeight: 'var(--type-headline-lh)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.014em',
            margin: 0,
          }}
        >
          Audience Insights
        </h1>
        <p style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          Who you target, who clicks, when you run.
        </p>
      </header>

      {insight && (
        <Verdict
          verdict={{
            kind: 'up',
            headline: insight.headline,
            support: insight.support,
            clicksLast7: 0,
            clicksPrev7: 0,
            delta: 0,
            hasFullWindow: true,
          }}
        />
      )}

      <div className="uplate-audience-panels">
        <CoverageList state={state} />
        <EngagementPanel adIds={adIds} onLoaded={setEngagement} />
      </div>

      {insights ? (
        <HeatmapPair insights={insights} />
      ) : insightsError ? (
        <ErrorBlock />
      ) : (
        <HeatmapSkeleton />
      )}
    </div>
  );
}

function EmptyAudience() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-5)',
        maxWidth: '52ch',
        padding: 'var(--s-7) 0',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--type-display)',
          lineHeight: 'var(--type-display-lh)',
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '-0.022em',
        }}
      >
        No audience picture yet.
      </h1>
      <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Create a campaign with at least one ad. Audience targeting, who actually clicks, and your time coverage will appear here.
      </p>
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <div
      style={{
        height: 280,
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--r-lg)',
      }}
      className="skeleton"
    />
  );
}

function ErrorBlock() {
  return (
    <div
      style={{
        border: '1px solid var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-5)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
      }}
    >
      Couldn't load audience insights. Refresh to try again.
    </div>
  );
}
