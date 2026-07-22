import type { ReactNode } from 'react';

export interface RankedRow {
  key: string;
  label: ReactNode;
  sublabel?: ReactNode;
  value: ReactNode;
  valueSublabel?: ReactNode;
}

interface RankedRowsProps {
  rows: RankedRow[];
  ariaLabel: string;
}

// Shared "label left, value right, bordered rows" list used across Menu
// Performance, Ratings, and Search & Demand — the same visual primitive
// CoverageList/EngagementPanel use on Audience Insights, factored once here
// since this page needs it three times.
export function RankedRows({ rows, ariaLabel }: RankedRowsProps) {
  return (
    <dl
      aria-label={ariaLabel}
      style={{
        margin: 0,
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--surface-raised)',
        overflow: 'hidden',
      }}
    >
      {rows.map((row, i) => (
        <div
          key={row.key}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'baseline',
            columnGap: 'var(--s-4)',
            padding: '12px var(--s-5)',
            borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
          }}
        >
          <dt style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 'var(--type-body)',
                color: 'var(--ink)',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.label}
            </div>
            {row.sublabel && (
              <div style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)', marginTop: 2 }}>
                {row.sublabel}
              </div>
            )}
          </dt>
          <dd
            className="num"
            style={{
              margin: 0,
              textAlign: 'right',
              fontSize: 'var(--type-meta)',
              color: 'var(--ink)',
              fontWeight: 600,
            }}
          >
            {row.value}
            {row.valueSublabel && (
              <div style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)', fontWeight: 500, marginTop: 2 }}>
                {row.valueSublabel}
              </div>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
