import { Pencil } from 'lucide-react';
import type { Targeting } from '../../types';
import {
  ALLERGY_LABEL,
  AUDIENCE_LABEL,
  DAYS,
  DIETARY_LABEL,
} from '../../data/constants';

interface TargetingSummaryListProps {
  targeting: Targeting;
  onEdit: () => void;
}

/**
 * Plain list of targeting categories. One row per category. Replaces the
 * MiniStat-grid TargetSummaryCard pattern. Owners scan a single column of
 * values instead of a chip grid.
 */
export function TargetingSummaryList({ targeting, onEdit }: TargetingSummaryListProps) {
  const rows = buildRows(targeting);
  const setCount = rows.filter((r) => !r.empty).length;

  return (
    <section
      aria-label="Audience targeting"
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
            Audience targeting
          </h2>
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--ink-3)' }}>
            {setCount === 0
              ? 'Untargeted, this ad shows to everyone.'
              : `${setCount} category${setCount === 1 ? '' : 's'} set.`}
          </span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-2)',
            fontSize: 'var(--type-meta)',
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <Pencil size={13} strokeWidth={2} />
          Edit targeting
        </button>
      </header>
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
          <Row key={row.label} row={row} isFirst={i === 0} />
        ))}
      </dl>
    </section>
  );
}

interface SummaryRow {
  label: string;
  value: string;
  empty: boolean;
}

function Row({ row, isFirst }: { row: SummaryRow; isFirst: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(140px, max-content) minmax(0, 1fr)',
        alignItems: 'baseline',
        columnGap: 'var(--s-5)',
        padding: '14px var(--s-5)',
        borderTop: isFirst ? 'none' : '1px solid var(--hairline)',
      }}
    >
      <dt
        style={{
          fontSize: 'var(--type-meta)',
          color: 'var(--ink-3)',
          fontWeight: 500,
        }}
      >
        {row.label}
      </dt>
      <dd
        style={{
          margin: 0,
          fontSize: 'var(--type-body)',
          color: row.empty ? 'var(--ink-3)' : 'var(--ink)',
          fontWeight: row.empty ? 400 : 500,
          lineHeight: 1.5,
        }}
      >
        {row.value}
      </dd>
    </div>
  );
}

function buildRows(t: Targeting): SummaryRow[] {
  return [
    audienceRow(t),
    dietaryRow(t),
    foodRow(t),
    exclusionsRow(t),
    behavioralRow(t),
    timeRow(t),
  ];
}

function audienceRow(t: Targeting): SummaryRow {
  if (t.audienceTags.length === 0) {
    return { label: 'Audience tags', value: 'Not set', empty: true };
  }
  return {
    label: 'Audience tags',
    value: t.audienceTags
      .map((r) => withPriority(AUDIENCE_LABEL[r.tag], r.priority))
      .join(', '),
    empty: false,
  };
}

function dietaryRow(t: Targeting): SummaryRow {
  if (t.dietary.length === 0) return { label: 'Dietary', value: 'Not set', empty: true };
  return {
    label: 'Dietary',
    value: t.dietary.map((d) => withPriority(DIETARY_LABEL[d.pref], d.priority)).join(', '),
    empty: false,
  };
}

function foodRow(t: Targeting): SummaryRow {
  if (t.foodInterests.length === 0) {
    return { label: 'Food interests', value: 'Not set', empty: true };
  }
  return {
    label: 'Food interests',
    value: t.foodInterests.map((f) => withPriority(f.name, f.priority)).join(', '),
    empty: false,
  };
}

function exclusionsRow(t: Targeting): SummaryRow {
  if (t.exclusions.length === 0) {
    return { label: 'Allergens excluded', value: 'None', empty: true };
  }
  return {
    label: 'Allergens excluded',
    value: t.exclusions.map((a) => ALLERGY_LABEL[a]).join(', '),
    empty: false,
  };
}

function behavioralRow(t: Targeting): SummaryRow {
  if (!t.behavioral.recurringCustomer) {
    return { label: 'Behavioral', value: 'Not set', empty: true };
  }
  return {
    label: 'Behavioral',
    value: `Recurring customers (${t.behavioral.recurringPriority})`,
    empty: false,
  };
}

function timeRow(t: Targeting): SummaryRow {
  const range = t.time.range;
  const days = t.time.days;

  if (!range && (days.length === 0 || days.length === 7)) {
    return { label: 'When it runs', value: 'Every day, all hours', empty: true };
  }

  const parts: string[] = [];
  if (range) {
    parts.push(`${formatHour(range.startHour)} to ${formatHour(range.endHour)}`);
  }
  if (days.length > 0 && days.length < 7) {
    parts.push(formatDays(days));
  }
  return { label: 'When it runs', value: parts.join(', '), empty: false };
}

function withPriority(label: string, priority: string): string {
  if (priority === 'required') return `${label} (required)`;
  if (priority === 'low') return `${label} (low)`;
  return label;
}

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? 'pm' : 'am';
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${period}`;
}

function formatDays(days: Targeting['time']['days']): string {
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
  const weekend = ['sat', 'sun'] as const;
  const isWeekdays = weekdays.every((d) => days.includes(d)) && days.length === 5;
  const isWeekend = weekend.every((d) => days.includes(d)) && days.length === 2;
  if (isWeekdays) return 'weekdays';
  if (isWeekend) return 'weekends';
  const order = DAYS.map((d) => d.value);
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return sorted.map((d) => DAYS.find((x) => x.value === d)?.short ?? d).join(' · ');
}
