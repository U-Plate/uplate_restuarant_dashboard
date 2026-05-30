import { useState } from 'react';
import type { AudienceInsightsResponse } from '../../api';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

interface HeatmapPairProps {
  insights: AudienceInsightsResponse;
}

export function HeatmapPair({ insights }: HeatmapPairProps) {
  const coverage = insights.heatmap;
  const impressions = insights.impressionsHeatmap;

  const scheduledHours = countNonZero(coverage.cells);
  const impressionsHours = impressions ? countNonZero(impressions.cells) : 0;

  return (
    <section
      aria-label="Time coverage"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}
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
          Time coverage
        </h2>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          Compare when you’re scheduled to serve against when impressions actually happen.
        </span>
      </header>

      <Heatmap
        title="When your ads are scheduled to serve"
        cells={coverage.cells}
        max={coverage.max}
        tone="coverage"
      />

      {impressions ? (
        <Heatmap
          title="When impressions actually happened"
          cells={impressions.cells}
          max={impressions.max}
          tone="impressions"
        />
      ) : (
        <EmptyImpressions />
      )}

      {impressions && impressionsHours < scheduledHours && (
        <p
          style={{
            fontSize: 'var(--type-meta)',
            color: 'var(--ink-2)',
            fontWeight: 500,
          }}
        >
          You're scheduled for {scheduledHours} hours; impressions cluster in {impressionsHours}.
        </p>
      )}
    </section>
  );
}

function Heatmap({
  title,
  cells,
  max,
  tone,
}: {
  title: string;
  cells: number[];
  max: number;
  tone: 'coverage' | 'impressions';
}) {
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; value: number } | null>(null);
  const baseColor =
    tone === 'coverage' ? 'oklch(0.5 0.10 250 ' : 'oklch(0.55 0.025 250 ';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--type-meta)',
            color: 'var(--ink)',
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
          }}
        >
          {title}
        </span>
        {hoveredCell && (
          <span
            className="num"
            style={{
              fontSize: 'var(--type-meta)',
              color: 'var(--ink-2)',
              fontWeight: 500,
            }}
          >
            {DAYS[hoveredCell.day]} {formatHour(hoveredCell.hour)} ·{' '}
            {tone === 'coverage'
              ? `${Math.round(hoveredCell.value)} ad${hoveredCell.value === 1 ? '' : 's'}`
              : `${Math.round(hoveredCell.value).toLocaleString()} impressions`}
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
        onMouseLeave={() => setHoveredCell(null)}
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
            <span
              key={h}
              style={{
                textAlign: 'center',
                visibility: h % 3 === 0 ? 'visible' : 'hidden',
              }}
            >
              {h}
            </span>
          ))}
        </div>
        {DAYS.map((label, rIdx) => (
          <div
            key={label}
            style={{
              display: 'grid',
              gridTemplateColumns: '32px repeat(24, minmax(16px, 1fr))',
              gap: 2,
            }}
          >
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
                  onMouseEnter={() => setHoveredCell({ day: rIdx, hour: hIdx, value: v })}
                  title={`${label} ${formatHour(hIdx)} · ${v.toFixed(0)}`}
                  style={{
                    height: 18,
                    borderRadius: 3,
                    background:
                      intensity === 0
                        ? 'var(--surface-sunken)'
                        : `${baseColor}/ ${alpha})`,
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

function EmptyImpressions() {
  return (
    <div
      style={{
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-5)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
        Real impressions heatmap not yet available.
      </span>
      <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
        Backend will add a per-hour impressions aggregation in a future update.
      </span>
    </div>
  );
}

function countNonZero(cells: number[]): number {
  return cells.filter((v) => v > 0).length;
}

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? 'pm' : 'am';
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${period}`;
}
