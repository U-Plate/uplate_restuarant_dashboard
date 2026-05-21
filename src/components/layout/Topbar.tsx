

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header
      style={{
        height: 'var(--topbar-h)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--s-6)',
        gap: 'var(--s-5)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>{title}</h1>
        {subtitle && (
          <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>{subtitle}</p>
        )}
      </div>

  
    </header>
  );
}
