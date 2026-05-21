import type { ReactNode } from 'react';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon?: ReactNode;
  sparkline?: ReactNode;
}

export function StatCard({ label, value, delta, icon, sparkline }: StatCardProps) {
  return (
    <Card padding="var(--s-5)">
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-soft)',
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </span>
          <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: -0.5 }}>
            {value}
          </span>
          {delta && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: delta.positive ? 'var(--accent)' : 'var(--secondary)',
              }}
            >
              {delta.value}
            </span>
          )}
        </div>
        {icon && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 'var(--r-md)',
              background: 'var(--accent-12)',
              color: 'var(--accent)',
            }}
          >
            {icon}
          </span>
        )}
      </div>
      {sparkline && <div style={{ marginTop: 'var(--s-3)', height: 40 }}>{sparkline}</div>}
    </Card>
  );
}
