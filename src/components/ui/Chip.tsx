import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type ChipVariant = 'positive' | 'negative';

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children: ReactNode;
  size?: 'sm' | 'md';
  variant?: ChipVariant;
}

const VARIANT_TOKENS: Record<ChipVariant, { fill: string; tint: string; on: string }> = {
  positive: {
    fill: 'var(--accent)',
    tint: 'var(--accent-12)',
    on: 'var(--surface)',
  },
  negative: {
    fill: 'var(--trend-negative)',
    tint: 'var(--trend-negative-tint)',
    on: 'var(--surface)',
  },
};

export function Chip({
  selected,
  onClick,
  onRemove,
  children,
  size = 'md',
  variant = 'positive',
}: ChipProps) {
  const padding = size === 'sm' ? '4px 10px' : '6px 12px';
  const fontSize = size === 'sm' ? 12 : 13;
  const tokens = VARIANT_TOKENS[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding,
        fontSize,
        fontWeight: 500,
        borderRadius: 'var(--r-pill)',
        border: 'none',
        background: selected ? tokens.fill : tokens.tint,
        color: selected ? tokens.on : 'var(--text-soft)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      {children}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: 'var(--r-pill)',
            opacity: 0.75,
            cursor: 'pointer',
          }}
        >
          <X size={12} />
        </span>
      )}
    </button>
  );
}
