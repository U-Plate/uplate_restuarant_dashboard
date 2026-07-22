import type { ReactNode } from 'react';

interface EmptyNoteProps {
  children: ReactNode;
  tone?: 'empty' | 'error';
}

// Shared "nothing here yet" / "couldn't load" block. Dashed border = honest
// empty state, solid border = fetch error — same distinction CoverageList and
// EngagementPanel already draw on the Audience Insights page.
export function EmptyNote({ children, tone = 'empty' }: EmptyNoteProps) {
  return (
    <div
      style={{
        border: tone === 'empty' ? '1px dashed var(--hairline-strong)' : '1px solid var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-5)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
      }}
    >
      {children}
    </div>
  );
}

export function SectionSkeleton({ height = 120 }: { height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height, background: 'var(--surface-sunken)', borderRadius: 'var(--r-lg)' }}
    />
  );
}
