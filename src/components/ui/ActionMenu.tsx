import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface MenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

interface ActionMenuProps {
  items: MenuItem[];
  align?: 'left' | 'right';
}

export function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((s) => !s);
        }}
        aria-label="Open actions"
        style={{
          background: open ? 'var(--accent-12)' : 'transparent',
          border: 'none',
          borderRadius: 'var(--r-md)',
          padding: 6,
          color: 'var(--text-soft)',
          display: 'inline-flex',
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align]: 0,
            minWidth: 180,
            background: 'var(--surface)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: 6,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                fontSize: 13,
                color: item.danger ? 'var(--text-soft)' : 'var(--text)',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--r-sm)',
                textAlign: 'left',
                width: '100%',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
