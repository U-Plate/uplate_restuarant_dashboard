import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BarComparisonProps {
  data: { name: string; value: number }[];
  height?: number;
  valueLabel?: string;
  formatValue?: (n: number) => string;
}

const defaultFormat = (n: number) => {
  if (n < 1) return `${(n * 100).toFixed(2)}%`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toString();
};

export function BarComparison({
  data,
  height = 260,
  valueLabel = 'value',
  formatValue = defaultFormat,
}: BarComparisonProps) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
          barSize={14}
        >
          <CartesianGrid horizontal={false} stroke="rgba(143,145,162,0.18)" />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8F91A2', fontSize: 11 }}
            tickFormatter={formatValue}
          />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#505A5B', fontSize: 12 }}
            width={140}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent-08)' }}
            contentStyle={{
              background: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 6px 16px rgba(52,63,62,0.12)',
              padding: '8px 12px',
              fontSize: 12,
            }}
            formatter={(v) => [formatValue(Number(v)), valueLabel]}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={i === 0 ? '#94B0DA' : i < 3 ? '#94B0DA' : '#8F91A2'}
                fillOpacity={i === 0 ? 1 : 0.7 - i * 0.08}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
