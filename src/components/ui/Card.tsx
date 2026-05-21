import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  padding?: number | string;
  className?: string;
  style?: CSSProperties;
  elevated?: boolean;
}

export function Card({ children, padding = 'var(--s-5)', className, style, elevated }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r-lg)',
        boxShadow: elevated ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
