import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { InsightPoint } from '../../api';
import { parseLocalDate } from '../../lib/format';
import { EmptyNote } from './EmptyNote';

const COLOR = 'oklch(0.5 0.10 250)';

interface ViewsChartProps {
  series: InsightPoint[];
}

export function ViewsChart({ series }: ViewsChartProps) {
  if (series.length === 0) {
    return <EmptyNote>No restaurant views yet — this fills in once students start finding you.</EmptyNote>;
  }

  return (
    <div
      style={{
        height: 220,
        background: 'var(--surface-raised)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-4) var(--s-3) var(--s-3) var(--s-2)',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="insights-views-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR} stopOpacity={0.22} />
              <stop offset="100%" stopColor={COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(0.9 0.012 250)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => parseLocalDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'oklch(0.58 0.012 250)', fontSize: 11 }}
            minTickGap={28}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'oklch(0.58 0.012 250)', fontSize: 11 }}
            width={32}
            allowDecimals={false}
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
            labelFormatter={(d) => parseLocalDate(String(d)).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            labelStyle={{ color: 'oklch(0.4 0.01 250)', fontWeight: 500, marginBottom: 4 }}
            formatter={(v) => [`${v}`, 'Views'] as [string, string]}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke={COLOR}
            strokeWidth={2}
            fill="url(#insights-views-grad)"
            activeDot={{ r: 4, stroke: 'oklch(0.987 0.004 250)', strokeWidth: 2, fill: COLOR }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
