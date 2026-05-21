import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ChipProps {
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children: ReactNode;
  size?: 'sm' | 'md';
}

export function Chip({ selected, onClick, onRemove, children, size = 'md' }: ChipProps) {
  const padding = size === 'sm' ? '4px 10px' : '6px 12px';
  const fontSize = size === 'sm' ? 12 : 13;

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
        background: selected ? 'var(--accent)' : 'var(--accent-12)',
        color: selected ? 'var(--surface)' : 'var(--text-soft)',
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
