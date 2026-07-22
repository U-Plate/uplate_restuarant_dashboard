import { useState } from 'react';
import { EmptyNote } from './EmptyNote';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

interface ViewsHeatmapProps {
  cells: number[];
  max: number;
}

// Same visual recipe as the coverage/impressions heatmap on Audience
// Insights (HeatmapPair.tsx), rebuilt here for restaurant-view counts so the
// two pages read as one system without coupling this page to that
// component's ads-specific prop shape.
export function ViewsHeatmap({ cells, max }: ViewsHeatmapProps) {
  const [hovered, setHovered] = useState<{ day: number; hour: number; value: number } | null>(null);
  const hasData = cells.some((v) => v > 0);

  if (!hasData) {
    return <EmptyNote>Peak hours show up once you have restaurant views to plot.</EmptyNote>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end' }}>
        {hovered && (
          <span className="num" style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-2)', fontWeight: 500 }}>
            {DAYS[hovered.day]} {formatHour(hovered.hour)} · {hovered.value.toLocaleString()} view{hovered.value === 1 ? '' : 's'}
          </span>
        )}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          overflowX: 'auto',
          padding: 'var(--s-3)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--surface-raised)',
        }}
        onMouseLeave={() => setHovered(null)}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '32px repeat(24, minmax(16px, 1fr))',
            gap: 2,
            fontSize: 10,
            color: 'var(--ink-3)',
            paddingBottom: 4,
          }}
        >
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} style={{ textAlign: 'center', visibility: h % 3 === 0 ? 'visible' : 'hidden' }}>
              {h}
            </span>
          ))}
        </div>
        {DAYS.map((label, rIdx) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: '32px repeat(24, minmax(16px, 1fr))', gap: 2 }}>
            <span
              style={{
                fontSize: 'var(--type-eyebrow)',
                color: 'var(--ink-3)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                alignSelf: 'center',
              }}
            >
              {label}
            </span>
            {Array.from({ length: 24 }, (_, hIdx) => {
              const v = cells[rIdx * 24 + hIdx] ?? 0;
              const intensity = max === 0 ? 0 : v / max;
              const alpha = intensity === 0 ? 0 : 0.15 + intensity * 0.75;
              return (
                <div
                  key={hIdx}
                  onMouseEnter={() => setHovered({ day: rIdx, hour: hIdx, value: v })}
                  title={`${label} ${formatHour(hIdx)} · ${v}`}
                  style={{
                    height: 18,
                    borderRadius: 3,
                    background: intensity === 0 ? 'var(--surface-sunken)' : `oklch(0.5 0.10 250 / ${alpha})`,
                    transition: 'transform var(--motion-fast) var(--ease-out-quart)',
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? 'pm' : 'am';
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${period}`;
}
