import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { InsightComposition } from '../../api';
import { formatPercent } from '../../lib/format';
import { RankedRows } from './RankedRows';
import { EmptyNote } from './EmptyNote';

type Category = 'age' | 'dietary' | 'healthGoal' | 'cuisine';

const CATEGORY_LABEL: Record<Category, string> = {
  age: 'Age',
  dietary: 'Dietary',
  healthGoal: 'Health goal',
  cuisine: 'Favorite cuisines',
};

interface CompositionPanelProps {
  composition: InsightComposition;
}

export function CompositionPanel({ composition }: CompositionPanelProps) {
  const [category, setCategory] = useState<Category>('age');
  const rows = composition[
    category === 'age' ? 'ageBuckets' : category
  ].filter((r) => r.pct > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <CategorySelect value={category} onChange={setCategory} />
      </div>
      {composition.visitorCount === 0 ? (
        <EmptyNote>Who's viewing you shows up once you have visitors to describe.</EmptyNote>
      ) : rows.length === 0 ? (
        <EmptyNote>No {CATEGORY_LABEL[category].toLowerCase()} data among your viewers yet.</EmptyNote>
      ) : (
        <RankedRows
          ariaLabel={CATEGORY_LABEL[category]}
          rows={rows.map((r) => ({ key: r.key, label: r.label, value: formatPercent(r.pct, 0) }))}
        />
      )}
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: Category; onChange: (next: Category) => void }) {
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
