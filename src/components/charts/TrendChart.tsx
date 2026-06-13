import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { parseLocalDate } from '../../lib/format';

interface TrendChartProps {
  data: { date: string; value: number }[];
  height?: number;
  label?: string;
  color?: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function formatDate(d: string): string {
  const dt = parseLocalDate(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export function TrendChart({ data, height = 220, label, color = '#94B0DA' }: TrendChartProps) {
  const id = `grad-${color.replace('#', '')}`;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="rgba(143,145,162,0.18)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8F91A2', fontSize: 11 }}
            minTickGap={20}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8F91A2', fontSize: 11 }}
            tickFormatter={formatNumber}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(148,176,218,0.4)', strokeWidth: 1 }}
            contentStyle={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 6px 16px rgba(52,63,62,0.12)',
              padding: '8px 12px',
              fontSize: 12,
              color: '#343F3E',
            }}
            labelFormatter={(d) => formatDate(String(d))}
            labelStyle={{ color: '#505A5B', fontWeight: 500, marginBottom: 4 }}
            formatter={(v) => [formatNumber(Number(v)), label ?? 'value']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${id})`}
            activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
