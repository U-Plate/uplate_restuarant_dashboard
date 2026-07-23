import type { InsightComposition } from '../../api';
import { formatPercent } from '../../lib/format';
import { RankedRows } from './RankedRows';
import { EmptyNote } from './EmptyNote';

interface CompositionPanelProps {
  composition: InsightComposition;
}

// Health-goal and dietary mix used to live here too, but owners care about
// those tied to a specific item ("who's ordering what"), not the restaurant
// overall — that view moved into the Menu performance section. Age and
// cuisine affinity aren't item-specific in the same way, so they stay here
// as general audience context.
export function CompositionPanel({ composition }: CompositionPanelProps) {
  if (composition.visitorCount === 0) {
    return <EmptyNote>Who's viewing you shows up once you have visitors to describe.</EmptyNote>;
  }

  const age = composition.ageBuckets.filter((r) => r.pct > 0);
  const cuisine = composition.cuisine.filter((r) => r.pct > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <CompositionGroup title="Age" rows={age} emptyLabel="age" />
      <CompositionGroup title="Favorite cuisines" rows={cuisine} emptyLabel="favorite cuisine" />
    </div>
  );
}

function CompositionGroup({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: InsightComposition['ageBuckets'];
  emptyLabel: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
      <span style={{ fontSize: 'var(--type-eyebrow)', color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </span>
      {rows.length === 0 ? (
        <EmptyNote>No {emptyLabel} data among your viewers yet.</EmptyNote>
      ) : (
        <RankedRows ariaLabel={title} rows={rows.map((r) => ({ key: r.key, label: r.label, value: formatPercent(r.pct, 0) }))} />
      )}
    </div>
  );
}
