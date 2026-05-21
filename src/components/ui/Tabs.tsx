interface Tab {
  value: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (next: string) => void;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'var(--surface)',
        padding: 4,
        borderRadius: 'var(--r-pill)',
        boxShadow: 'var(--shadow-sm)',
        gap: 2,
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--r-pill)',
              border: 'none',
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--surface)' : 'var(--text-soft)',
              fontSize: 13,
              fontWeight: 600,
              transition: 'background 120ms ease, color 120ms ease',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
