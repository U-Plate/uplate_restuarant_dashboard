import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

function variantStyles(variant: Variant): CSSProperties {
  switch (variant) {
    case 'primary':
      return { background: 'var(--accent)', color: 'var(--surface)' };
    case 'secondary':
      return { background: 'var(--accent-12)', color: 'var(--text)' };
    case 'ghost':
      return { background: 'transparent', color: 'var(--text-soft)' };
    case 'danger':
      return { background: 'transparent', color: 'var(--text-soft)' };
  }
}

export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  children,
  style,
  ...rest
}: ButtonProps) {
  const sizing: CSSProperties =
    size === 'sm'
      ? { height: 32, padding: '0 12px', fontSize: 13 }
      : { height: 40, padding: '0 16px', fontSize: 14 };

  return (
    <button
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: 'none',
        outline: 'none',
        borderRadius: 'var(--r-md)',
        fontWeight: 500,
        letterSpacing: 0,
        transition: 'transform 80ms ease, opacity 120ms ease, background 120ms ease',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        ...sizing,
        ...variantStyles(variant),
        opacity: rest.disabled ? 0.5 : 1,
        cursor: rest.disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseDown={(e) => {
        if (!rest.disabled) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
