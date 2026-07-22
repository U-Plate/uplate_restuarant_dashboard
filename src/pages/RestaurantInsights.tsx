import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import type { RestaurantInsightsResponse } from '../api';
import { SupportingNumbers, type SupportingNumber } from '../components/overview/SupportingNumbers';
import { ViewsChart } from '../components/insights/ViewsChart';
import { ViewsHeatmap } from '../components/insights/ViewsHeatmap';
import { RankedRows } from '../components/insights/RankedRows';
import { CompositionPanel } from '../components/insights/CompositionPanel';
import { EmptyNote, SectionSkeleton } from '../components/insights/EmptyNote';
import { Sparkline } from '../components/charts/Sparkline';
import { formatNumber, formatPercent } from '../lib/format';

export default function RestaurantInsights() {
  const [insights, setInsights] = useState<RestaurantInsightsResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setInsights(null);
    setError(false);
    api.analytics
      .restaurantInsights()
      .then((res) => {
        if (!cancelled) setInsights(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
          Insights
        </h1>
        <p style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          How students eat with you — logging, rating, and coming back. Separate from anything you've run as an ad.
        </p>
      </header>

      {error ? (
        <EmptyNote tone="error">Couldn't load your insights. Refresh to try again.</EmptyNote>
      ) : !insights ? (
        <PageSkeleton />
      ) : insights.hero.views === 0 ? (
        <EmptyState />
      ) : (
        <Content insights={insights} />
      )}
    </div>
  );
}

function Content({ insights }: { insights: RestaurantInsightsResponse }) {
  const { hero, traffic, menu, ratings, composition } = insights;

  const numbers: SupportingNumber[] = [
    {
      label: 'Views',
      value: formatNumber(hero.views),
      delta: hero.viewsDelta,
      spark: traffic.series.slice(-30).map((p) => p.views),
      to: '/insights',
      tone: 'clicks',
    },
    {
      label: 'Logged meals',
      value: formatNumber(hero.loggedMeals),
      delta: null,
      description: 'Self-reported, not verified orders',
      to: '/insights',
      tone: 'ctr',
    },
    {
      label: 'Average rating',
      value: hero.ratingCount === 0 ? '—' : hero.avgRating.toFixed(1),
      delta: null,
      description: hero.ratingCount === 0 ? 'No ratings yet' : `${formatNumber(hero.ratingCount)} rating${hero.ratingCount === 1 ? '' : 's'}`,
      to: '/insights',
    },
    {
      label: 'Repeat visitors',
      value: formatPercent(hero.repeatVisitorPct, 0),
      delta: null,
      description: `${formatNumber(hero.visitorCount)} visitor${hero.visitorCount === 1 ? '' : 's'}`,
      to: '/insights',
    },
  ];

  return (
    <>
      <SupportingNumbers numbers={numbers} />

      <Section title="Traffic" subtitle="When people open your restaurant to log what they ate.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          <ViewsChart series={traffic.series} />
          <ViewsHeatmap cells={traffic.heatmap.cells} max={traffic.heatmap.max} />
        </div>
      </Section>

      <Section title="Menu performance" subtitle="What people look at, and what they actually eat.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          <SubHeading>Most viewed</SubHeading>
          {menu.topItems.length === 0 ? (
            <EmptyNote>Menu item views will show up here once your menu gets opened.</EmptyNote>
          ) : (
            <RankedRows
              ariaLabel="Most viewed menu items"
              rows={menu.topItems.map((item) => ({
                key: item.menuItemId,
                label: item.name,
                sublabel:
                  item.ratingCount > 0
                    ? `${formatNumber(item.logs)} logged · ${item.avgRating.toFixed(1)}★`
                    : `${formatNumber(item.logs)} logged`,
                value: formatNumber(item.views),
                valueSublabel: 'views',
              }))}
            />
          )}

          <SubHeading>Needs attention</SubHeading>
          {menu.underperformingItems.length === 0 ? (
            <EmptyNote>Nothing stands out yet — items are converting views into logged meals normally.</EmptyNote>
          ) : (
            <RankedRows
              ariaLabel="Items people view but don't commit to"
              rows={menu.underperformingItems.map((item) => ({
                key: item.menuItemId,
                label: item.name,
                sublabel: `${formatNumber(item.logs)} logged of ${formatNumber(item.views)} views`,
                value: formatPercent(item.views === 0 ? 0 : item.logs / item.views, 0),
                valueSublabel: 'logged',
              }))}
            />
          )}

          {menu.trending.length > 0 && (
            <>
              <SubHeading>Trending this week</SubHeading>
              <RankedRows
                ariaLabel="Trending items"
                rows={menu.trending.map((item) => ({
                  key: item.menuItemId,
                  label: item.name,
                  value: `${item.changePct >= 0 ? '+' : ''}${Math.round(item.changePct * 100)}%`,
                }))}
              />
            </>
          )}
        </div>
      </Section>

      <Section title="Ratings" subtitle="What people think once they've eaten.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
          {ratings.count === 0 ? (
            <EmptyNote>No ratings yet — they'll show up once students start rating what they log.</EmptyNote>
          ) : (
            <>
              {ratings.trend.length >= 2 && (
                <div style={{ height: 60, color: 'var(--data-ctr)' }}>
                  <Sparkline data={ratings.trend.map((p) => p.average)} height={60} strokeWidth={2} />
                </div>
              )}
              {ratings.lowestRated.length > 0 && (
                <>
                  <SubHeading>Lowest rated</SubHeading>
                  <RankedRows
                    ariaLabel="Lowest rated menu items"
                    rows={ratings.lowestRated.map((item) => ({
                      key: item.menuItemId,
                      label: item.name,
                      sublabel: `${formatNumber(item.ratingCount)} rating${item.ratingCount === 1 ? '' : 's'}`,
                      value: `${item.avgRating.toFixed(1)}★`,
                    }))}
                  />
                </>
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Who's viewing you" subtitle="Aggregate only — never a single student.">
        <CompositionPanel composition={composition} />
      </Section>
    </>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section aria-label={title} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h2
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-h3)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.011em',
          }}
        >
          {title}
        </h2>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>{subtitle}</span>
      </header>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontSize: 'var(--type-eyebrow)',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}
    >
      {children}
    </span>
  );
}

function PageSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-6)' }}>
      <SectionSkeleton height={88} />
      <SectionSkeleton height={220} />
      <SectionSkeleton height={180} />
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: '52ch', padding: 'var(--s-7) 0' }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--type-display)',
          lineHeight: 'var(--type-display-lh)',
          fontWeight: 500,
          color: 'var(--ink)',
          letterSpacing: '-0.022em',
        }}
      >
        No restaurant views yet.
      </h2>
      <p style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Insights show up once students start opening UPlate to log what they ate at your restaurant. Nothing to show yet, so there's nothing to fake.
      </p>
    </div>
  );
}
