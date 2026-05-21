import type { Priority } from '../../types';
import { PRIORITIES } from '../../data/constants';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (next: Priority) => void;
  size?: 'sm' | 'md';
}

export function PrioritySelector({ value, onChange, size = 'sm' }: PrioritySelectorProps) {
  const padY = size === 'sm' ? 4 : 6;
  const padX = size === 'sm' ? 10 : 12;
  const fs = size === 'sm' ? 11 : 12;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-pill)',
        padding: 3,
        gap: 2,
      }}
    >
      {PRIORITIES.map((p) => {
        const active = p.value === value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            style={{
              padding: `${padY}px ${padX}px`,
              fontSize: fs,
              fontWeight: 600,
              letterSpacing: 0.2,
              borderRadius: 'var(--r-pill)',
              border: 'none',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--surface)' : 'var(--text-soft)',
              transition: 'background 120ms ease, color 120ms ease',
              textTransform: 'uppercase',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
