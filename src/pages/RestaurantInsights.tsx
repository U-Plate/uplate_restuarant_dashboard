import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api";
import type { InsightSegmentLeader, RestaurantInsightsResponse } from "../api";
import {
  SupportingNumbers,
  type SupportingNumber,
} from "../components/overview/SupportingNumbers";
import { ViewsChart } from "../components/insights/ViewsChart";
import { ItemAudienceRows } from "../components/insights/ItemAudienceRows";
import { CompositionPanel } from "../components/insights/CompositionPanel";
import { EmptyNote, SectionSkeleton } from "../components/insights/EmptyNote";
import { formatNumber, formatPercent } from "../lib/format";

export default function RestaurantInsights() {
  const [insights, setInsights] = useState<RestaurantInsightsResponse | null>(
    null,
  );
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
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-8)" }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--type-headline)",
            lineHeight: "var(--type-headline-lh)",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.014em",
            margin: 0,
          }}
        >
          Insights
        </h1>
        <p style={{ fontSize: "var(--type-meta)", color: "var(--ink-3)" }}>
          How students eat with you — logging, rating, and coming back. Separate
          from anything you've run as an ad.
        </p>
      </header>

      {error ? (
        <EmptyNote tone="error">
          Couldn't load your insights. Refresh to try again.
        </EmptyNote>
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
  const { hero, traffic, menu, audienceByItem, composition } = insights;
  const trendingIds = new Set(
    menu.trending.filter((t) => t.changePct > 0).map((t) => t.menuItemId),
  );

  const numbers: SupportingNumber[] = [
    {
      label: "Views",
      value: formatNumber(hero.views),
      delta: hero.viewsDelta,
      spark: traffic.series.slice(-30).map((p) => p.views),
      to: "/insights",
      tone: "clicks",
    },
    {
      label: "Logged meals",
      value: formatNumber(hero.loggedMeals),
      delta: null,
      description: " ",
      to: "/insights",
      tone: "ctr",
    },
    {
      label: "Average rating",
      value: hero.ratingCount === 0 ? "—" : hero.avgRating.toFixed(1),
      delta: null,
      description:
        hero.ratingCount === 0
          ? "No ratings yet"
          : `${formatNumber(hero.ratingCount)} rating${hero.ratingCount === 1 ? "" : "s"}`,
      spark: hero.ratingTrend.map((p) => p.average),
      to: "/insights",
      tone: "ctr",
    },
    {
      label: "Repeat visitors",
      value: formatPercent(hero.repeatVisitorPct, 0),
      delta: null,
      description: `${formatNumber(hero.visitorCount)} visitor${hero.visitorCount === 1 ? "" : "s"}`,
      to: "/insights",
    },
  ];

  return (
    <>
      <SupportingNumbers numbers={numbers} />

      <Section
        title="Who's eating what"
        subtitle="What people log, and who's logging it."
      >
        {audienceByItem.leaders.length > 0 && (
          <SegmentLeaders leaders={audienceByItem.leaders} />
        )}
        {audienceByItem.items.length === 0 ? (
          <EmptyNote>
            Logged meals will show up here, broken down by who's eating what.
          </EmptyNote>
        ) : (
          <ItemAudienceRows
            ariaLabel="Menu items by logged meals, expandable for audience mix"
            items={audienceByItem.items}
            trendingIds={trendingIds}
          />
        )}
      </Section>

      <Section
        title="Traffic"
        subtitle="When people open your restaurant to log what they ate."
      >
        <ViewsChart series={traffic.series} />
      </Section>

      <Section
        title="Who's viewing you"
        subtitle="Aggregate only — never a single student."
      >
        <CompositionPanel composition={composition} />
      </Section>
    </>
  );
}

// Glanceable "#1 Bulking: Chicken Quinoa Power Bowl" — the top item each
// segment logs most, by raw count. Segments that haven't cleared the minimum
// count are simply absent from `leaders`, not shown with a "not enough data"
// note.
function SegmentLeaders({ leaders }: { leaders: InsightSegmentLeader[] }) {
  return (
    <div
      aria-label="Top item by segment"
      style={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: "var(--s-6)",
        rowGap: "var(--s-3)",
      }}
    >
      {leaders.map((l) => (
        <div
          key={l.key}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
            maxWidth: 200,
          }}
        >
          <span
            style={{
              fontSize: "var(--type-eyebrow)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
            }}
          >
            #1 {l.label}
          </span>
          <span
            style={{
              fontSize: "var(--type-meta)",
              fontWeight: 600,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {l.name}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <h2
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "var(--type-h3)",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.011em",
          }}
        >
          {title}
        </h2>
        <span style={{ fontSize: "var(--type-meta)", color: "var(--ink-3)" }}>
          {subtitle}
        </span>
      </header>
      {children}
    </section>
  );
}

function PageSkeleton() {
  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "var(--s-6)" }}
    >
      <SectionSkeleton height={88} />
      <SectionSkeleton height={220} />
      <SectionSkeleton height={180} />
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--s-5)",
        maxWidth: "52ch",
        padding: "var(--s-7) 0",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--type-display)",
          lineHeight: "var(--type-display-lh)",
          fontWeight: 500,
          color: "var(--ink)",
          letterSpacing: "-0.022em",
        }}
      >
        No restaurant views yet.
      </h2>
      <p
        style={{
          fontSize: "var(--type-body)",
          color: "var(--ink-2)",
          lineHeight: 1.5,
        }}
      >
        Insights show up once students start opening UPlate to log what they ate
        at your restaurant. Nothing to show yet, so there's nothing to fake.
      </p>
    </div>
  );
}
