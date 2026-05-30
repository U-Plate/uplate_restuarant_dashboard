import { useEffect } from 'react';
import { Button } from './Button';

interface StickyBarProps {
  visible: boolean;
  saving?: boolean;
  headline?: string;
  subtext?: string;
  saveLabel?: string;
  discardLabel?: string;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * Fixed save bar shown when there are unsaved changes. Slides up from the
 * bottom. On desktop it offsets the sidebar; on mobile it sits above the
 * bottom tabbar. Cmd/Ctrl+S triggers Save while visible.
 */
export function StickyBar({
  visible,
  saving = false,
  headline = 'Unsaved changes',
  subtext = 'Save to apply.',
  saveLabel = 'Save changes',
  discardLabel = 'Discard',
  onSave,
  onDiscard,
}: StickyBarProps) {
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!saving) onSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, saving, onSave]);

  return (
    <div
      role="region"
      aria-label="Unsaved changes"
      aria-hidden={!visible}
      className="uplate-stickybar"
      data-visible={visible}
    >
      <div className="uplate-stickybar__inner">
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-body)',
            color: 'var(--ink)',
            fontWeight: 500,
          }}
        >
          {headline}
        </span>
        <span
          style={{
            fontSize: 'var(--type-meta)',
            color: 'var(--ink-3)',
            flex: 1,
          }}
        >
          {subtext}
        </span>
        <div style={{ display: 'inline-flex', gap: 'var(--s-2)' }}>
          <Button variant="ghost" size="sm" onClick={onDiscard} disabled={saving}>
            {discardLabel}
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? 'Saving' : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
