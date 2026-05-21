import type { ReactNode } from 'react';
import { Card } from '../ui/Card';

interface SectionShellProps {
  title: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function SectionShell({ title, hint, icon, children }: SectionShellProps) {
  return (
    <Card padding="var(--s-5)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--s-3)' }}>
          {icon && (
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--r-md)',
                background: 'var(--accent-12)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </span>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{title}</h3>
            {hint && <p style={{ fontSize: 12, color: 'var(--text-soft)' }}>{hint}</p>}
          </div>
        </div>
        {children}
      </div>
    </Card>
  );
}
