import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';
import type { Ad } from '../../types';
import { useApp } from '../../store/AppContext';
import { formatNumber, formatPercent } from '../../lib/format';
import type { RangeKey } from '../overview/OverviewChart';

const RANGE_LENS: Record<RangeKey, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
};

const MIN_IMPRESSIONS = 100;

interface TopAdsListProps {
  range: RangeKey;
}

interface Row {
  ad: Ad;
  impressions: number;
  clicks: number;
  ctr: number;
  spark: number[];
}

export function TopAdsList({ range }: TopAdsListProps) {
  const { state } = useApp();

  const rows = useMemo<Row[]>(() => {
    const days = RANGE_LENS[range];
    return Object.values(state.ads)
      .map((ad) => {
        const sorted = [...ad.metrics.series].sort((a, b) => a.date.localeCompare(b.date));
        const sliced = days === null ? sorted : sorted.slice(-days);
        const impressions = sliced.reduce((acc, p) => acc + p.impressions, 0);
        const clicks = sliced.reduce((acc, p) => acc + p.clicks, 0);
        const ctr = impressions === 0 ? 0 : clicks / impressions;
        const spark = sorted.slice(-30).map((p) => p.clicks);
        return { ad, impressions, clicks, ctr, spark };
      })
      .filter((r) => r.impressions >= MIN_IMPRESSIONS)
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 5);
  }, [state, range]);

  if (rows.length === 0) return null;

  return (
    <section
      aria-label="Top performing ads"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
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
          Top performing ads
        </h2>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          Ranked by CTR with at least {MIN_IMPRESSIONS} impressions in range
        </span>
      </header>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--surface-raised)',
          overflow: 'hidden',
        }}
      >
        {rows.map((row, i) => (
          <li
            key={row.ad.id}
            style={{ borderTop: i === 0 ? 'none' : '1px solid var(--hairline)' }}
          >
            <AdItem row={row} rank={i + 1} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdItem({ row, rank }: { row: Row; rank: number }) {
  const { state } = useApp();
  const campaign = state.campaigns[row.ad.campaignId];

  return (
    <Link
      to={`/campaigns/${row.ad.campaignId}/ads/${row.ad.id}`}
      state={{ from: '/analytics' }}
      style={{
        display: 'grid',
        gridTemplateColumns: '28px minmax(0, 1fr) 96px auto auto 16px',
        alignItems: 'center',
        gap: 'var(--s-4)',
        padding: 'var(--s-3) var(--s-4)',
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 60,
        transition: 'background var(--motion-fast) var(--ease-out-quart)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-sunken)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        className="num"
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        {rank}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-body)',
            fontWeight: 500,
            color: 'var(--ink)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.ad.title}
        </span>
        <span style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)' }}>
          {campaign?.name ?? 'Unknown campaign'}
        </span>
      </div>
      <div style={{ color: 'var(--data-clicks)', opacity: 0.85 }}>
        {row.spark.length >= 2 ? (
          <Sparkline data={row.spark} height={20} strokeWidth={1.5} />
        ) : null}
      </div>
      <span
        className="num"
        style={{
          fontSize: 'var(--type-body)',
          color: 'var(--ink-2)',
          fontWeight: 500,
          minWidth: 60,
          textAlign: 'right',
        }}
      >
        {formatNumber(row.clicks)} clicks
      </span>
      <span
        className="num"
        style={{
          fontSize: 'var(--type-body)',
          color: 'var(--ink)',
          fontWeight: 600,
          minWidth: 64,
          textAlign: 'right',
        }}
      >
        {formatPercent(row.ctr, 2)}
      </span>
      <ChevronRight size={14} strokeWidth={1.75} color="var(--ink-3)" />
    </Link>
  );
}
