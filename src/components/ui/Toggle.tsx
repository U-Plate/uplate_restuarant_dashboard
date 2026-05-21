interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export function Toggle({ checked, onChange, label, size = 'md' }: ToggleProps) {
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const knob = h - 4;

  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <span
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative',
          width: w,
          height: h,
          borderRadius: 'var(--r-pill)',
          background: checked ? 'var(--accent)' : 'var(--secondary)',
          opacity: checked ? 1 : 0.6,
          transition: 'background 160ms ease, opacity 160ms ease',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: checked ? w - knob - 2 : 2,
            width: knob,
            height: knob,
            borderRadius: '50%',
            background: 'var(--surface)',
            transition: 'left 160ms ease',
            boxShadow: '0 1px 3px rgba(52,63,62,0.15)',
          }}
        />
      </span>
      {label && (
        <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{label}</span>
      )}
    </label>
  );
}
