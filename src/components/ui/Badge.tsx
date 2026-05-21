import type { ReactNode } from 'react';

type BadgeTone = 'active' | 'paused' | 'neutral' | 'accent';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  withDot?: boolean;
}

export function Badge({ tone = 'neutral', children, withDot = false }: BadgeProps) {
  const palette = (() => {
    switch (tone) {
      case 'active':
        return { bg: 'var(--accent-20)', fg: 'var(--text)', dot: 'var(--accent)' };
      case 'paused':
        return { bg: 'var(--secondary-20)', fg: 'var(--text-soft)', dot: 'var(--secondary)' };
      case 'accent':
        return { bg: 'var(--accent)', fg: 'var(--surface)', dot: 'var(--surface)' };
      case 'neutral':
      default:
        return { bg: 'var(--secondary-12)', fg: 'var(--text-soft)', dot: 'var(--secondary)' };
    }
  })();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 'var(--r-pill)',
        background: palette.bg,
        color: palette.fg,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.1,
      }}
    >
      {withDot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: palette.dot,
          }}
        />
      )}
      {children}
    </span>
  );
}
