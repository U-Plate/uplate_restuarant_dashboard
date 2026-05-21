import { Clock } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { DAYS } from '../../data/constants';
import type { DayOfWeek, TimeTargeting } from '../../types';

interface Props {
  value: TimeTargeting;
  onChange: (next: TimeTargeting) => void;
}

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? 'pm' : 'am';
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${period}`;
}

export function TimeTargetingSection({ value, onChange }: Props) {
  const range = value.range ?? { startHour: 11, endHour: 21 };
  const enabled = value.range !== null;

  const toggleDay = (day: DayOfWeek) => {
    const has = value.days.includes(day);
    onChange({
      ...value,
      days: has ? value.days.filter((d) => d !== day) : [...value.days, day],
    });
  };

  return (
    <SectionShell
      icon={<Clock size={16} />}
      title="Time targeting"
      hint="Restrict when and which days this ad surfaces. Leave open for 24/7 reach."
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              range: enabled ? null : { startHour: 11, endHour: 21 },
            })
          }
          style={{
            padding: '8px 14px',
            background: enabled ? 'var(--accent)' : 'var(--accent-12)',
            color: enabled ? 'var(--surface)' : 'var(--text-soft)',
            border: 'none',
            borderRadius: 'var(--r-pill)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {enabled ? 'Time window on' : 'Run all hours'}
        </button>
        {enabled && (
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
            {formatHour(range.startHour)} – {formatHour(range.endHour)}
          </span>
        )}
      </div>

      {enabled && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-3)',
            padding: 'var(--s-4)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
          }}
        >
          <RangeRow
            label="Start"
            value={range.startHour}
            onChange={(next) => onChange({ ...value, range: { ...range, startHour: next } })}
          />
          <RangeRow
            label="End"
            value={range.endHour}
            onChange={(next) => onChange({ ...value, range: { ...range, endHour: next } })}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-soft)',
            fontWeight: 600,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
          }}
        >
          Days of week
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DAYS.map((d) => {
            const selected = value.days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                title={d.label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--r-pill)',
                  border: 'none',
                  background: selected ? 'var(--accent)' : 'var(--surface-2)',
                  color: selected ? 'var(--surface)' : 'var(--text-soft)',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 120ms ease, color 120ms ease',
                }}
              >
                {d.short}
              </button>
            );
          })}
        </div>
        {value.days.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
            No day restrictions — runs every day.
          </span>
        )}
      </div>
    </SectionShell>
  );
}

function RangeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 600, width: 40 }}>
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={23}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)' }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--text)',
          width: 48,
          textAlign: 'right',
        }}
      >
        {formatHour(value)}
      </span>
    </div>
  );
}
