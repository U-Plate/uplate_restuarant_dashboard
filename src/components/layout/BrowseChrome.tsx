import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface BrowseSortOption<K extends string> {
  value: K;
  label: string;
}

interface BrowseChromeProps<S extends string> {
  title: string;
  subtitle?: string;
  query: string;
  onQueryChange: (next: string) => void;
  searchPlaceholder: string;
  status: 'all' | 'active' | 'paused';
  onStatusChange: (next: 'all' | 'active' | 'paused') => void;
  sort: S;
  sortOptions: BrowseSortOption<S>[];
  onSortChange: (next: S) => void;
  cta: ReactNode;
}

export function BrowseChrome<S extends string>({
  title,
  subtitle,
  query,
  onQueryChange,
  searchPlaceholder,
  status,
  onStatusChange,
  sort,
  sortOptions,
  onSortChange,
  cta,
}: BrowseChromeProps<S>) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > 80);
    handle();
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <header className="uplate-browse">
      <div className="uplate-browse__title-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-headline)',
              lineHeight: 'var(--type-headline-lh)',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.014em',
              margin: 0,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 'var(--type-meta)',
                color: 'var(--ink-3)',
                fontWeight: 500,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div
        className="uplate-browse__filter"
        data-scrolled={scrolled}
      >
        <SearchField value={query} onChange={onQueryChange} placeholder={searchPlaceholder} />
        <StatusFilter value={status} onChange={onStatusChange} />
        <SortMenu value={sort} options={sortOptions} onChange={onSortChange} />
        <div className="uplate-browse__cta">{cta}</div>
      </div>
    </header>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label
      className="uplate-browse__search"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface-sunken)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)',
        padding: '0 12px',
        height: 36,
        minWidth: 0,
      }}
    >
      <Search size={14} strokeWidth={2} color="var(--ink-3)" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 'var(--type-body)',
          color: 'var(--ink)',
          width: '100%',
          minWidth: 0,
        }}
      />
    </label>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: 'all' | 'active' | 'paused';
  onChange: (v: 'all' | 'active' | 'paused') => void;
}) {
  const options: { value: 'all' | 'active' | 'paused'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' },
  ];
  return (
    <div role="tablist" aria-label="Status filter" className="uplate-browse__segmented">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              border: 'none',
              background: active ? 'var(--surface)' : 'transparent',
              color: active ? 'var(--ink)' : 'var(--ink-2)',
              fontSize: 'var(--type-meta)',
              fontWeight: active ? 600 : 500,
              borderRadius: 'var(--r-pill)',
              cursor: 'pointer',
              boxShadow: active ? '0 1px 2px oklch(0.22 0.01 250 / 0.06)' : 'none',
              transition: 'background var(--motion-fast) var(--ease-out-quart), color var(--motion-fast) var(--ease-out-quart)',
              fontFamily: 'var(--font-ui)',
              minHeight: 28,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SortMenu<S extends string>({
  value,
  options,
  onChange,
}: {
  value: S;
  options: BrowseSortOption<S>[];
  onChange: (next: S) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value)?.label ?? 'Updated';

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
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 12px',
          height: 36,
          background: 'var(--surface-sunken)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-2)',
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        <span style={{ color: 'var(--ink-3)' }}>Sort by</span>
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{current}</span>
        <ChevronDown size={13} strokeWidth={2} />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 200,
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-pop)',
            padding: 4,
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '8px 10px',
                  background: active ? 'var(--accent-tint)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--r-sm)',
                  fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--type-body)',
                  color: 'var(--ink)',
                  fontWeight: active ? 600 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--surface-sunken)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                {opt.label}
                {active && <Check size={14} strokeWidth={2} color="var(--accent)" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
