import { Clock } from 'lucide-react';
import { TargetingSection } from './TargetingSection';
import { DAYS } from '../../data/constants';
import type { DayOfWeek, TimeTargeting } from '../../types';

interface Props {
  value: TimeTargeting;
  onChange: (next: TimeTargeting) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const WEEKDAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKENDS: DayOfWeek[] = ['sat', 'sun'];
const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function formatHour(h: number): string {
  const hr = ((h % 24) + 24) % 24;
  const period = hr >= 12 ? 'pm' : 'am';
  const display = hr % 12 === 0 ? 12 : hr % 12;
  return `${display}${period}`;
}

function summarizeDays(days: DayOfWeek[]): string {
  if (days.length === 0 || days.length === 7) return 'every day';
  if (days.length === 5 && WEEKDAYS.every((d) => days.includes(d))) return 'weekdays';
  if (days.length === 2 && WEEKENDS.every((d) => days.includes(d))) return 'weekends';
  return `${days.length} day${days.length === 1 ? '' : 's'}`;
}

function summarize(value: TimeTargeting): string {
  const dayPart = summarizeDays(value.days);
  if (value.range) {
    return `${formatHour(value.range.startHour)} to ${formatHour(value.range.endHour)}, ${dayPart}`;
  }
  return dayPart === 'every day' ? 'All hours, all week' : `All hours, ${dayPart}`;
}

export function TimeTargetingSection({ value, onChange, isOpen, onToggle }: Props) {
  const range = value.range ?? { startHour: 11, endHour: 21 };
  const enabled = value.range !== null;

  const toggleDay = (day: DayOfWeek) => {
    const has = value.days.includes(day);
    onChange({
      ...value,
      days: has ? value.days.filter((d) => d !== day) : [...value.days, day],
    });
  };

  const setDays = (days: DayOfWeek[]) => onChange({ ...value, days });

  const isWeekdays =
    value.days.length === 5 && WEEKDAYS.every((d) => value.days.includes(d));
  const isWeekends =
    value.days.length === 2 && WEEKENDS.every((d) => value.days.includes(d));
  const isAllWeek = value.days.length === 7;

  const isEmpty = !enabled && value.days.length === 0;

  return (
    <TargetingSection
      icon={<Clock size={14} />}
      eyebrow="When"
      hint="Hours and days this ad can serve."
      summary={summarize(value)}
      isOpen={isOpen}
      onToggle={onToggle}
      isEmpty={isEmpty}
      emptyCta="Set window"
    >
      <div className="uplate-targeting__time-toggle">
        <button
          type="button"
          onClick={() =>
            onChange({
              ...value,
              range: enabled ? null : { startHour: 11, endHour: 21 },
            })
          }
          className="uplate-targeting__time-toggle-btn"
          data-on={enabled}
        >
          {enabled ? 'Time window on' : 'Run all hours'}
        </button>
        {enabled && (
          <span className="uplate-targeting__time-readout">
            {formatHour(range.startHour)} to {formatHour(range.endHour)}
          </span>
        )}
      </div>

      {enabled && (
        <div className="uplate-targeting__time-sliders">
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

      <div className="uplate-targeting__preset-row" role="group" aria-label="Day presets">
        <PresetBtn label="Weekdays" active={isWeekdays} onClick={() => setDays(WEEKDAYS)} />
        <PresetBtn label="Weekends" active={isWeekends} onClick={() => setDays(WEEKENDS)} />
        <PresetBtn label="All week" active={isAllWeek} onClick={() => setDays(ALL_DAYS)} />
        <PresetBtn label="Clear" active={false} onClick={() => setDays([])} muted />
      </div>

      <div className="uplate-targeting__days">
        {DAYS.map((d) => {
          const selected = value.days.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => toggleDay(d.value)}
              title={d.label}
              aria-pressed={selected}
              className="uplate-targeting__day"
              data-selected={selected}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      {value.days.length === 0 && (
        <span className="uplate-targeting__rulehint">
          No day restrictions, runs every day.
        </span>
      )}
    </TargetingSection>
  );
}

function PresetBtn({
  label,
  active,
  onClick,
  muted = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="uplate-targeting__preset"
      data-active={active}
      data-muted={muted}
    >
      {label}
    </button>
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
    <div className="uplate-targeting__range">
      <span className="uplate-targeting__range-label">{label}</span>
      <input
        type="range"
        min={0}
        max={23}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="uplate-targeting__range-input"
      />
      <span className="uplate-targeting__range-value num">{formatHour(value)}</span>
    </div>
  );
}
