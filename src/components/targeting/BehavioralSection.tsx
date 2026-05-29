import { Users } from 'lucide-react';
import { TargetingSection } from './TargetingSection';
import { Toggle } from '../ui/Toggle';
import { PrioritySelector } from '../ui/PrioritySelector';
import type { BehavioralTargeting } from '../../types';

interface Props {
  value: BehavioralTargeting;
  onChange: (next: BehavioralTargeting) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function BehavioralSection({ value, onChange, isOpen, onToggle }: Props) {
  const summary = value.recurringCustomer ? 'Recurring customers' : 'Anyone';
  const isEmpty = !value.recurringCustomer;

  return (
    <TargetingSection
      icon={<Users size={14} />}
      eyebrow="Who"
      hint="Target users who have ordered with you before."
      summary={summary}
      isOpen={isOpen}
      onToggle={onToggle}
      isEmpty={isEmpty}
      emptyCta="Choose audience"
    >
      <div className="uplate-targeting__toggle-row">
        <div className="uplate-targeting__toggle-meta">
          <span className="uplate-targeting__rulename">Recurring customers</span>
          <span className="uplate-targeting__rulehint">
            Prioritize repeat orderers from your restaurant.
          </span>
        </div>
        <Toggle
          checked={value.recurringCustomer}
          onChange={(next) => onChange({ ...value, recurringCustomer: next })}
        />
      </div>

      {value.recurringCustomer && (
        <div className="uplate-targeting__rule">
          <span className="uplate-targeting__rulename">Boost priority</span>
          <PrioritySelector
            value={value.recurringPriority}
            onChange={(next) => onChange({ ...value, recurringPriority: next })}
          />
        </div>
      )}
    </TargetingSection>
  );
}
