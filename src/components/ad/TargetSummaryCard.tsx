import type { ReactNode } from 'react';
import {
  Ban,
  Clock,
  Leaf,
  Pencil,
  Repeat,
  Target,
  Utensils,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Priority, Targeting } from '../../types';
import {
  ALLERGY_LABEL,
  AUDIENCE_LABEL,
  DAYS,
  DIETARY_LABEL,
} from '../../data/constants';

interface TargetSummaryCardProps {
  targeting: Targeting;
  onEdit: () => void;
}

function priorityTone(p: Priority) {
  switch (p) {
    case 'required':
      return { bg: 'var(--accent)', fg: 'var(--surface)' };
    case 'high':
      return { bg: 'var(--accent-35)', fg: 'var(--text)' };
    case 'medium':
      return { bg: 'var(--accent-20)', fg: 'var(--text)' };
    case 'low':
      return { bg: 'var(--secondary-20)', fg: 'var(--text-soft)' };
  }
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const tone = priorityTone(priority);
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 'var(--r-pill)',
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {priority}
    </span>
  );
}

function ChipRow({ label, priority }: { label: string; priority?: Priority }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-pill)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text)',
      }}
    >
      {label}
      {priority && <PriorityBadge priority={priority} />}
    </span>
  );
}

function Section({
  icon,
  title,
  empty,
  children,
}: {
  icon: ReactNode;
  title: string;
  empty?: string;
  children: ReactNode;
}) {
  const isEmptyState = empty !== undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 'var(--r-sm)',
            background: 'var(--accent-12)',
            color: 'var(--accent)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            color: 'var(--text-soft)',
          }}
        >
          {title}
        </span>
      </div>
      {isEmptyState ? (
        <span style={{ fontSize: 12, color: 'var(--text-soft)', fontStyle: 'italic', paddingLeft: 32 }}>
          {empty}
        </span>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: 32 }}>{children}</div>
      )}
    </div>
  );
}

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? 'pm' : 'am';
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${period}`;
}

function formatDays(days: Targeting['time']['days']): string {
  if (days.length === 0 || days.length === 7) return 'Every day';
  const order = DAYS.map((d) => d.value);
  const sorted = [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return sorted.map((d) => DAYS.find((x) => x.value === d)?.short ?? d).join(' · ');
}

export function TargetSummaryCard({ targeting, onEdit }: TargetSummaryCardProps) {
  const {
    audienceTags,
    dietary,
    foodInterests,
    exclusions,
    behavioral,
    time,
  } = targeting;

  const totalSignals =
    audienceTags.length +
    dietary.length +
    foodInterests.length +
    (behavioral.recurringCustomer ? 1 : 0);

  return (
    <Card padding="var(--s-5)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 'var(--s-3)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Targeting</h3>
            <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
              {totalSignals === 0
                ? 'No audience signals configured yet.'
                : `${totalSignals} active signal${totalSignals === 1 ? '' : 's'} feeding the ranker.`}
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Pencil size={13} />}
            onClick={onEdit}
          >
            Edit targets
          </Button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--s-4)',
            rowGap: 'var(--s-4)',
          }}
        >
          <Section
            icon={<Target size={13} />}
            title="Audience tags"
            empty={audienceTags.length === 0 ? 'No audience tags' : undefined}
          >
            {audienceTags.map((r) => (
              <ChipRow key={r.tag} label={AUDIENCE_LABEL[r.tag]} priority={r.priority} />
            ))}
          </Section>

          <Section
            icon={<Leaf size={13} />}
            title="Dietary preferences"
            empty={dietary.length === 0 ? 'No dietary preferences' : undefined}
          >
            {dietary.map((d) => (
              <ChipRow key={d.pref} label={DIETARY_LABEL[d.pref]} priority={d.priority} />
            ))}
          </Section>

          <Section
            icon={<Utensils size={13} />}
            title="Food interests"
            empty={foodInterests.length === 0 ? 'No food interests' : undefined}
          >
            {foodInterests.map((f) => (
              <ChipRow key={f.name} label={f.name} priority={f.priority} />
            ))}
          </Section>

          <Section
            icon={<Ban size={13} />}
            title="Allergen exclusions"
            empty={exclusions.length === 0 ? 'No exclusions' : undefined}
          >
            {exclusions.map((a) => (
              <ChipRow key={a} label={ALLERGY_LABEL[a]} />
            ))}
          </Section>

          <Section
            icon={<Repeat size={13} />}
            title="Behavioral signals"
            empty={behavioral.recurringCustomer ? undefined : 'No behavioral signals'}
          >
            {behavioral.recurringCustomer && (
              <ChipRow label="Recurring customers" priority={behavioral.recurringPriority} />
            )}
          </Section>

          <Section
            icon={<Clock size={13} />}
            title="Time targeting"
            empty={!time.range && time.days.length === 0 ? 'Runs 24/7' : undefined}
          >
            {time.range && (
              <ChipRow
                label={`${formatHour(time.range.startHour)} – ${formatHour(time.range.endHour)}`}
              />
            )}
            {time.days.length > 0 && time.days.length < 7 && (
              <ChipRow label={formatDays(time.days)} />
            )}
            {time.range === null && time.days.length === 7 && (
              <ChipRow label="Every day, all hours" />
            )}
          </Section>
        </div>
      </div>
    </Card>
  );
}
