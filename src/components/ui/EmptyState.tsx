import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--s-7) var(--s-5)',
        textAlign: 'center',
        gap: 'var(--s-3)',
      }}
    >
      {icon && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 'var(--r-pill)',
            background: 'var(--accent-12)',
            color: 'var(--accent)',
            marginBottom: 'var(--s-2)',
          }}
        >
          {icon}
        </span>
      )}
      <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 13, color: 'var(--text-soft)', maxWidth: 380 }}>{description}</p>
      )}
      {action && <div style={{ marginTop: 'var(--s-2)' }}>{action}</div>}
    </div>
  );
}
