import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: string | true;
  onBack?: () => void;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, back, onBack, meta, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  const showBack = onBack ? true : back;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--s-4)',
        marginBottom: 'var(--s-5)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        {showBack && (
          <button
            type="button"
            onClick={() => {
              if (onBack) return onBack();
              if (typeof back === 'string') return navigate(back);
              navigate(-1);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-soft)',
              fontSize: 12,
              fontWeight: 500,
              padding: 0,
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.4 }}>{title}</h2>
          {meta}
        </div>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-soft)' }}>{subtitle}</p>}
      </div>
      {actions && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
