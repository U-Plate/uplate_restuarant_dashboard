import { ShieldAlert } from 'lucide-react';
import { TargetingSection } from './TargetingSection';
import { Chip } from '../ui/Chip';
import { ALLERGIES } from '../../data/constants';
import type { Allergy } from '../../types';

interface Props {
  value: Allergy[];
  onChange: (next: Allergy[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function ExclusionsSection({ value, onChange, isOpen, onToggle }: Props) {
  const selectedSet = new Set(value);
  const summary = summarize(value);

  return (
    <TargetingSection
      icon={<ShieldAlert size={14} />}
      eyebrow="Allergies to skip"
      hint="Strict filter. Users with these allergies never see this ad. No priority applies."
      summary={summary}
      isOpen={isOpen}
      onToggle={onToggle}
      isEmpty={value.length === 0}
      emptyCta="Add allergies"
    >
      <div className="uplate-targeting__chips">
        {ALLERGIES.map((a) => {
          const selected = selectedSet.has(a.value);
          return (
            <Chip
              key={a.value}
              selected={selected}
              variant="negative"
              onClick={() => {
                if (selected) {
                  onChange(value.filter((v) => v !== a.value));
                } else {
                  onChange([...value, a.value]);
                }
              }}
            >
              {a.label}
            </Chip>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="uplate-targeting__exclusion-note">
          {value.length === 1 ? '1 strict exclusion' : `${value.length} strict exclusions`} active.
          These narrow reach but protect users with allergies.
        </p>
      )}
    </TargetingSection>
  );
}

function summarize(value: Allergy[]): string {
  if (value.length === 0) return '';
  const labels = value.slice(0, 4);
  const more = value.length - labels.length;
  return labels.join(', ') + (more > 0 ? `, and ${more} more` : '');
}
