import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: number | string;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, width = 520, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(52, 63, 62, 0.32)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 'var(--s-4)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--s-5) var(--s-5) var(--s-3)',
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-soft)',
              padding: 6,
              borderRadius: 'var(--r-sm)',
              display: 'inline-flex',
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            padding: '0 var(--s-5) var(--s-5)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-4)',
          }}
        >
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: 'var(--s-4) var(--s-5)',
              background: 'var(--surface-2)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--s-2)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
