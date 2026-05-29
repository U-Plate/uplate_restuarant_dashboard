import { Link } from 'react-router-dom';
import { ChevronRight, Clock, AlertCircle } from 'lucide-react';
import type { AttentionItem } from '../../lib/attention';

interface WorthALookProps {
  items: AttentionItem[];
}

/**
 * Renders nothing when the list is empty. This is by design: a present-but-
 * empty "All clear!" panel is the kind of placeholder PRODUCT.md bans.
 */
export function WorthALook({ items }: WorthALookProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Worth a look"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 'var(--type-h3)',
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.011em',
          }}
        >
          Worth a look
        </h2>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
          {items.length === 1 ? '1 item' : `${items.length} items`}
        </span>
      </header>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface-raised)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
        }}
      >
        {items.map((item, i) => (
          <li
            key={item.id}
            style={{
              borderTop: i === 0 ? 'none' : '1px solid var(--hairline)',
            }}
          >
            <AttentionRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const Icon = item.severity === 'warn' ? AlertCircle : Clock;
  const iconColor = item.severity === 'warn' ? 'var(--trend-negative)' : 'var(--ink-3)';
  return (
    <Link
      to={item.to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--s-3)',
        padding: 'var(--s-3) var(--s-4)',
        minHeight: 52,
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background var(--motion-fast) var(--ease-out-quart)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--surface-sunken)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          width: 28,
          height: 28,
          alignItems: 'center',
          justifyContent: 'center',
          color: iconColor,
          flexShrink: 0,
        }}
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span
        style={{
          flex: 1,
          fontSize: 'var(--type-body)',
          color: 'var(--ink)',
          lineHeight: 1.4,
        }}
      >
        {item.text}
      </span>
      <ChevronRight size={16} strokeWidth={1.75} color="var(--ink-3)" />
    </Link>
  );
}
