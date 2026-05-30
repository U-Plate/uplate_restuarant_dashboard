import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AppState } from '../../types';
import {
  ALLERGY_LABEL,
  AUDIENCE_LABEL,
  DIETARY_LABEL,
} from '../../data/constants';

type Category = 'tags' | 'dietary' | 'food' | 'exclusions' | 'behavioral';

const CATEGORY_LABEL: Record<Category, string> = {
  tags: 'Audience tags',
  dietary: 'Dietary',
  food: 'Food interests',
  exclusions: 'Allergens excluded',
  behavioral: 'Behavioral',
};

interface CoverageListProps {
  state: AppState;
}

export function CoverageList({ state }: CoverageListProps) {
  const [category, setCategory] = useState<Category>('tags');

  const rows = useMemo(() => buildRows(state, category), [state, category]);

  return (
    <section
      aria-label="Audience targeting coverage"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 'var(--s-3)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'var(--type-h3)',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.011em',
            }}
          >
            What you target
          </h2>
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
            Counts across all ads.
          </span>
        </div>
        <CategorySelect value={category} onChange={setCategory} />
      </header>

      {rows.length === 0 ? (
        <EmptyBlock category={category} />
      ) : (
        <dl
          style={{
            margin: 0,
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-lg)',
            background: 'var(--surface-raised)',
            overflow: 'hidden',
          }}
        >
          {rows.map((row, i) => (
            <Row key={row.key} row={row} isFirst={i === 0} />
          ))}
        </dl>
      )}
    </section>
  );
}

interface SummaryRow {
  key: string;
  label: string;
  count: number;
}

function buildRows(state: AppState, category: Category): SummaryRow[] {
  const ads = Object.values(state.ads);

  if (category === 'tags') {
    const counts = new Map<string, number>();
    for (const ad of ads) {
      for (const t of ad.targeting.audienceTags) {
        counts.set(t.tag, (counts.get(t.tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        label: AUDIENCE_LABEL[key as keyof typeof AUDIENCE_LABEL] ?? key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  if (category === 'dietary') {
    const counts = new Map<string, number>();
    for (const ad of ads) {
      for (const d of ad.targeting.dietary) {
        counts.set(d.pref, (counts.get(d.pref) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        label: DIETARY_LABEL[key as keyof typeof DIETARY_LABEL] ?? key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  if (category === 'food') {
    const counts = new Map<string, number>();
    for (const ad of ads) {
      for (const f of ad.targeting.foodInterests) {
        const k = f.name.toLowerCase();
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, label: titleCase(key), count }))
      .sort((a, b) => b.count - a.count);
  }

  if (category === 'exclusions') {
    const counts = new Map<string, number>();
    for (const ad of ads) {
      for (const a of ad.targeting.exclusions) {
        counts.set(a, (counts.get(a) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        label: ALLERGY_LABEL[key as keyof typeof ALLERGY_LABEL] ?? key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // behavioral
  const recurring = ads.filter((ad) => ad.targeting.behavioral.recurringCustomer).length;
  if (recurring === 0) return [];
  return [{ key: 'recurring', label: 'Recurring customers', count: recurring }];
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function Row({ row, isFirst }: { row: SummaryRow; isFirst: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        alignItems: 'baseline',
        columnGap: 'var(--s-4)',
        padding: '12px var(--s-5)',
        borderTop: isFirst ? 'none' : '1px solid var(--hairline)',
      }}
    >
      <dt
        style={{
          fontSize: 'var(--type-body)',
          color: 'var(--ink)',
          fontWeight: 500,
        }}
      >
        {row.label}
      </dt>
      <dd
        className="num"
        style={{
          margin: 0,
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
        }}
      >
        {row.count} ad{row.count === 1 ? '' : 's'}
      </dd>
    </div>
  );
}

function CategorySelect({
  value,
  onChange,
}: {
  value: Category;
  onChange: (next: Category) => void;
}) {
  return (
    <label
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--surface-sunken)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)',
        padding: '0 10px',
        height: 32,
      }}
    >
      <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>Show</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Category)}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--ink)',
          fontFamily: 'var(--font-ui)',
          fontSize: 'var(--type-meta)',
          fontWeight: 600,
          appearance: 'none',
          paddingRight: 16,
        }}
      >
        {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
          <option key={k} value={k}>
            {CATEGORY_LABEL[k]}
          </option>
        ))}
      </select>
      <ChevronDown size={12} strokeWidth={2} color="var(--ink-3)" style={{ marginLeft: -14, pointerEvents: 'none' }} />
    </label>
  );
}

function EmptyBlock({ category }: { category: Category }) {
  return (
    <div
      style={{
        border: '1px dashed var(--hairline-strong)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-5)',
        color: 'var(--ink-2)',
        fontSize: 'var(--type-body)',
      }}
    >
      No {CATEGORY_LABEL[category].toLowerCase()} configured yet.
    </div>
  );
}
