import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { InsightAudienceSlice, InsightItemAudience } from '../../api';
import { formatNumber } from '../../lib/format';
import { TrendStar } from './TrendStar';

interface ItemAudienceRowsProps {
  ariaLabel: string;
  items: InsightItemAudience[];
  /** Menu item IDs trending up this week — renders a small star next to the name. */
  trendingIds?: Set<string>;
}

// The cap hides whatever the active sort ranks lowest — the tail an owner with
// a large menu is least likely to open first.
const DEFAULT_VISIBLE = 8;

type SortKey = 'logs-desc' | 'logs-asc' | 'rating-desc' | 'rating-asc' | 'trending';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'logs-desc', label: 'Most logged' },
  { key: 'logs-asc', label: 'Least logged' },
  { key: 'rating-desc', label: 'Highest rated' },
  { key: 'rating-asc', label: 'Lowest rated' },
  { key: 'trending', label: 'Trending' },
];

// Unrated items (no ratings yet) and items with no prior-week baseline sort to
// the bottom regardless of direction — a `0` rating or missing trend isn't a
// real "lowest", it's an absence, so it shouldn't outrank real data. Ties fall
// back to logs so the order stays stable and sensible.
function sortItems(items: InsightItemAudience[], key: SortKey): InsightItemAudience[] {
  const out = [...items];
  const byLogs = (a: InsightItemAudience, b: InsightItemAudience) => b.logs - a.logs;
  switch (key) {
    case 'logs-desc':
      return out.sort(byLogs);
    case 'logs-asc':
      return out.sort((a, b) => a.logs - b.logs);
    case 'rating-desc':
    case 'rating-asc':
      return out.sort((a, b) => {
        if (a.ratingCount === 0 || b.ratingCount === 0) return a.ratingCount === b.ratingCount ? byLogs(a, b) : a.ratingCount === 0 ? 1 : -1;
        const diff = key === 'rating-desc' ? b.avgRating - a.avgRating : a.avgRating - b.avgRating;
        return diff !== 0 ? diff : byLogs(a, b);
      });
    case 'trending':
      return out.sort((a, b) => {
        if (a.trendPct === null || b.trendPct === null) return a.trendPct === b.trendPct ? byLogs(a, b) : a.trendPct === null ? 1 : -1;
        return b.trendPct - a.trendPct;
      });
  }
}

// Menu items ranked by the selected sort (most-logged by default). Each row
// already states who's ordering it — no click required — and expands (native
// <details>/<summary>, so keyboard support and toggle state come for free) to
// the full health-goal + dietary breakdown. Search appears once the menu is
// big enough to need it; below that, "Show all" plus the row cap is enough.
export function ItemAudienceRows({ ariaLabel, items, trendingIds }: ItemAudienceRowsProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('logs-desc');
  const showSearch = items.length > DEFAULT_VISIBLE;
  const showSort = items.length > 1;

  const sorted = sortItems(items, sort);
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? sorted.filter((item) => item.name.toLowerCase().includes(trimmed)) : sorted;
  const canCollapse = !trimmed && filtered.length > DEFAULT_VISIBLE;
  const visible = trimmed || expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      {(showSearch || showSort) && (
        <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          {showSearch && <SearchField value={query} onChange={setQuery} />}
          {showSort && (
            <div style={{ marginLeft: 'auto' }}>
              <SortSelect value={sort} onChange={setSort} />
            </div>
          )}
        </div>
      )}
      <div
        aria-label={ariaLabel}
        style={{
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-lg)',
          background: 'var(--surface-raised)',
          overflow: 'hidden',
        }}
      >
        {visible.length === 0 ? (
          <div style={{ padding: rowPadding, fontSize: 'var(--type-body)', color: 'var(--ink-3)' }}>No items match &ldquo;{query.trim()}&rdquo;.</div>
        ) : (
          visible.map((item, i) => (
            <ItemRow key={item.menuItemId} item={item} isFirst={i === 0} trending={trendingIds?.has(item.menuItemId) ?? false} />
          ))
        )}
        {canCollapse && (
          <ToggleRow expanded={expanded} hiddenCount={filtered.length - DEFAULT_VISIBLE} onClick={() => setExpanded((e) => !e)} />
        )}
      </div>
    </div>
  );
}

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface-sunken)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)',
        padding: '0 12px',
        height: 36,
        maxWidth: 320,
      }}
    >
      <Search size={14} strokeWidth={2} color="var(--ink-3)" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search items"
        aria-label="Search menu items"
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: 'var(--type-body)',
          color: 'var(--ink)',
          width: '100%',
        }}
      />
    </label>
  );
}

// Native <select> so keyboard, screen-reader, and mobile-wheel behaviour come
// for free; styled to match the search field, with the default arrow swapped
// for the app's chevron.
function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="Sort menu items"
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          MozAppearance: 'none',
          background: 'var(--surface-sunken)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)',
          height: 36,
          padding: '0 34px 0 12px',
          fontSize: 'var(--type-body)',
          fontWeight: 500,
          color: 'var(--ink)',
          cursor: 'pointer',
        }}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        strokeWidth={2}
        color="var(--ink-3)"
        aria-hidden="true"
        style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}
      />
    </div>
  );
}

function ToggleRow({ expanded, hiddenCount, onClick }: { expanded: boolean; hiddenCount: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className="uplate-audience-toggle"
      aria-expanded={expanded}
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        border: 'none',
        borderTop: '1px solid var(--hairline)',
        background: 'transparent',
        padding: '10px var(--s-5)',
        textAlign: 'center',
        fontSize: 'var(--type-meta)',
        fontWeight: 600,
        color: 'var(--accent)',
      }}
    >
      {expanded ? 'Show fewer' : `Show all ${formatNumber(hiddenCount + DEFAULT_VISIBLE)} items`}
    </button>
  );
}

const gridCols = 'minmax(0, 1fr) auto';
const rowPadding = '12px var(--s-5)';

function ratingText(item: InsightItemAudience): string {
  if (item.ratingCount === 0) return 'No ratings yet';
  return `${item.avgRating.toFixed(1)}★ (${item.ratingCount})`;
}

// The one fact worth seeing without a click: which segment this item skews
// toward, or its rating when there's no standout skew to report.
function SummaryLine({ item }: { item: InsightItemAudience }) {
  if (!item.standout) return <>{ratingText(item)}</>;
  return (
    <>
      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
        Skews {item.standout.label} +{Math.round(item.standout.deltaPct * 100)}pts
      </span>
      {' · '}
      {ratingText(item)}
    </>
  );
}

function ItemRow({ item, isFirst, trending }: { item: InsightItemAudience; isFirst: boolean; trending: boolean }) {
  const borderTop = isFirst ? 'none' : '1px solid var(--hairline)';

  if (item.belowThreshold) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'baseline', columnGap: 'var(--s-4)', padding: rowPadding, borderTop }}>
        <RowLabel name={item.name} sublabel="Not enough data yet for a breakdown" trending={trending} />
        <RowValue logs={item.logs} />
      </div>
    );
  }

  return (
    <details className="uplate-audience-row" style={{ borderTop }}>
      <summary style={{ display: 'grid', gridTemplateColumns: `${gridCols} auto`, alignItems: 'baseline', columnGap: 'var(--s-3)', padding: rowPadding }}>
        <RowLabel name={item.name} sublabel={<SummaryLine item={item} />} trending={trending} />
        <RowValue logs={item.logs} />
        <ChevronDown
          className="uplate-audience-chevron"
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          style={{ color: 'var(--ink-3)', transition: 'transform var(--motion-base) var(--ease-out-quart)' }}
        />
      </summary>
      <div style={{ padding: '0 var(--s-5) var(--s-5)', display: 'flex', flexWrap: 'wrap', columnGap: 'var(--s-8)', rowGap: 'var(--s-5)' }}>
        <AudienceAxis title="Health goal" slices={item.healthGoal} />
        <AudienceAxis title="Dietary" slices={item.dietary} />
      </div>
    </details>
  );
}

function RowLabel({ name, sublabel, trending }: { name: string; sublabel: React.ReactNode; trending: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 'var(--type-body)', color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
        {trending && <TrendStar />}
      </div>
      <div
        style={{
          fontSize: 'var(--type-eyebrow)',
          color: 'var(--ink-3)',
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {sublabel}
      </div>
    </div>
  );
}

function RowValue({ logs }: { logs: number }) {
  return (
    <div className="num" style={{ textAlign: 'right', fontSize: 'var(--type-meta)', color: 'var(--ink)', fontWeight: 600 }}>
      {formatNumber(logs)}
      <div style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)', fontWeight: 500, marginTop: 2 }}>logged</div>
    </div>
  );
}

// A labelled share breakdown (Health goal / Dietary). The two axes sit side by
// side and each fills its half, so bars stay compact without leaving the panel
// half empty; they wrap to stacked on narrow screens, and a lone axis stays
// width-bounded rather than stretching thin. One accent for both — the eyebrow
// headings do the separating.
function AudienceAxis({ title, slices }: { title: string; slices: InsightAudienceSlice[] }) {
  if (slices.length === 0) return null;
  return (
    <div style={{ flex: '1 1 260px', minWidth: 0, maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <span style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
        {slices.map((s) => {
          const pct = Math.round(s.pct * 100);
          return (
            <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) 32px', alignItems: 'center', columnGap: 'var(--s-3)' }}>
              <span style={{ fontSize: 'var(--type-body)', color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.label}
              </span>
              <div style={{ height: 7, borderRadius: 'var(--r-pill)', background: 'var(--surface-sunken)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 'var(--r-pill)' }} />
              </div>
              <span className="num" style={{ fontSize: 'var(--type-meta)', color: 'var(--ink)', fontWeight: 600, textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
