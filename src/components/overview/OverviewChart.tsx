import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsPoint } from '../../types';
import { parseLocalDate } from '../../lib/format';

type MetricKey = 'clicks' | 'impressions' | 'ctr';

const METRICS: Array<{ key: MetricKey; label: string; color: string; format: (n: number) => string }> = [
  {
    key: 'clicks',
    label: 'Clicks',
    color: 'oklch(0.5 0.10 250)',
    format: (n) => Math.round(n).toLocaleString(),
  },
  {
    key: 'ctr',
    label: 'CTR',
    color: 'oklch(0.42 0.07 65)',
    format: (n) => `${(n * 100).toFixed(2)}%`,
  },
  {
    key: 'impressions',
    label: 'Impressions',
    color: 'oklch(0.6 0.025 250)',
    format: (n) => Math.round(n).toLocaleString(),
  },
];

export type RangeKey = '7d' | '30d' | '90d' | 'all';

const RANGE_DAYS: Record<RangeKey, number | 'all'> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: 'all',
};

const RANGE_LABEL: Record<RangeKey, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
};

interface OverviewChartProps {
  series: AnalyticsPoint[];
  /** Controls the time window. Defaults to 30d when omitted. */
  range?: RangeKey;
}

export function OverviewChart({ series, range = '30d' }: OverviewChartProps) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('metric') as MetricKey | null;
  const active: MetricKey =
    requested === 'clicks' || requested === 'ctr' || requested === 'impressions'
      ? requested
      : 'clicks';
  const config = METRICS.find((m) => m.key === active) ?? METRICS[0];

  const recent = useMemo(() => {
    const sorted = [...series].sort((a, b) => a.date.localeCompare(b.date));
    const days = RANGE_DAYS[range];
    const sliced = days === 'all' ? sorted : sorted.slice(-Number(days));
    return sliced.map((p) => ({
      date: p.date,
      value:
        active === 'clicks'
          ? p.clicks
          : active === 'impressions'
            ? p.impressions
            : p.impressions === 0
              ? 0
              : p.clicks / p.impressions,
    }));
  }, [series, active, range]);

  const setMetric = (m: MetricKey) => {
    const next = new URLSearchParams(params);
    if (m === 'clicks') next.delete('metric');
    else next.set('metric', m);
    setParams(next, { replace: true });
  };

  const isEmpty = recent.every((r) => r.value === 0);

  return (
    <section
      aria-label="Performance over time"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-h3)',
              fontWeight: 600,
              letterSpacing: '-0.011em',
              color: 'var(--ink)',
            }}
          >
            {RANGE_LABEL[range]}
          </h2>
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
            {config.label}, daily
          </span>
        </div>
        <SegmentedControl
          value={active}
          onChange={setMetric}
          options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
        />
      </header>
      <div
        style={{
          height: 240,
          background: 'var(--surface-raised)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-lg)',
          padding: 'var(--s-4) var(--s-3) var(--s-3) var(--s-2)',
        }}
      >
        {isEmpty ? <EmptyChart label={config.label} /> : <Plot data={recent} config={config} />}
      </div>
    </section>
  );
}

function Plot({
  data,
  config,
}: {
  data: { date: string; value: number }[];
  config: (typeof METRICS)[number];
}) {
  const id = `overview-grad-${config.key}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={config.color} stopOpacity={0.22} />
            <stop offset="100%" stopColor={config.color} stopOpacity={0.0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="oklch(0.9 0.012 250)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTickDate}
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'oklch(0.58 0.012 250)', fontSize: 11 }}
          minTickGap={28}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'oklch(0.58 0.012 250)', fontSize: 11 }}
          tickFormatter={(v) => config.format(Number(v))}
          width={46}
        />
        <Tooltip
          cursor={{ stroke: 'oklch(0.5 0.10 250 / 0.4)', strokeWidth: 1 }}
          contentStyle={{
            background: 'oklch(0.987 0.004 250)',
            border: '1px solid oklch(0.82 0.018 250)',
            borderRadius: 10,
            boxShadow: '0 12px 32px oklch(0.22 0.01 250 / 0.08)',
            padding: '8px 12px',
            fontSize: 12,
            color: 'oklch(0.22 0.01 250)',
            fontFamily: 'var(--font-ui)',
          }}
          labelFormatter={(d) => formatTooltipDate(String(d))}
          labelStyle={{ color: 'oklch(0.4 0.01 250)', fontWeight: 500, marginBottom: 4 }}
          formatter={(v) => [config.format(Number(v)), config.label] as [string, string]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={config.color}
          strokeWidth={2}
          fill={`url(#${id})`}
          activeDot={{ r: 4, stroke: 'oklch(0.987 0.004 250)', strokeWidth: 2, fill: config.color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--ink-3)',
        textAlign: 'center',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 'var(--type-body)', fontWeight: 500 }}>
        No {label.toLowerCase()} yet.
      </span>
      <span style={{ fontSize: 'var(--type-meta)' }}>
        Activate a campaign to start collecting data.
      </span>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}

function SegmentedControl<T extends string>({ value, onChange, options }: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
        gap: 2,
        border: '1px solid var(--hairline)',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              border: 'none',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              fontSize: 'var(--type-meta)',
              fontWeight: active ? 600 : 500,
              borderRadius: 'var(--r-pill)',
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px oklch(0.22 0.01 250 / 0.06)' : 'none',
              transition: 'background var(--motion-fast) var(--ease-out-quart), color var(--motion-fast) var(--ease-out-quart)',
              fontFamily: 'var(--font-ui)',
              minHeight: 30,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function formatTickDate(d: string): string {
  const dt = parseLocalDate(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTooltipDate(d: string): string {
  const dt = parseLocalDate(d);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
