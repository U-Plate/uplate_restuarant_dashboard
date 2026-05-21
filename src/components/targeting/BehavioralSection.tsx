import { Repeat } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Toggle } from '../ui/Toggle';
import { PrioritySelector } from '../ui/PrioritySelector';
import type { BehavioralTargeting } from '../../types';

interface Props {
  value: BehavioralTargeting;
  onChange: (next: BehavioralTargeting) => void;
}

export function BehavioralSection({ value, onChange }: Props) {
  return (
    <SectionShell
      icon={<Repeat size={16} />}
      title="Behavioral signals"
      hint="Boost ranking for users who have ordered from you before."
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--s-3) var(--s-4)',
          background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Recurring customers
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
            Prioritize repeat orderers from your restaurant
          </span>
        </div>
        <Toggle
          checked={value.recurringCustomer}
          onChange={(next) => onChange({ ...value, recurringCustomer: next })}
        />
      </div>

      {value.recurringCustomer && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--s-3)',
            padding: 'var(--s-3) var(--s-4)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            Boost priority
          </span>
          <PrioritySelector
            value={value.recurringPriority}
            onChange={(next) => onChange({ ...value, recurringPriority: next })}
          />
        </div>
      )}
    </SectionShell>
  );
}
