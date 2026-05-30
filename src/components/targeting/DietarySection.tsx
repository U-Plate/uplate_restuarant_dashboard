import { Leaf } from 'lucide-react';
import { TargetingSection } from './TargetingSection';
import { Chip } from '../ui/Chip';
import { PrioritySelector } from '../ui/PrioritySelector';
import { DIETARY_PREFS } from '../../data/constants';
import type { DietaryRule } from '../../types';

interface Props {
  value: DietaryRule[];
  onChange: (next: DietaryRule[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function DietarySection({ value, onChange, isOpen, onToggle }: Props) {
  const selectedSet = new Set(value.map((v) => v.pref));
  const summary = summarize(value);

  return (
    <TargetingSection
      icon={<Leaf size={14} />}
      eyebrow="Dietary fit"
      hint="Preferences that boost ranking for users with that diet."
      summary={summary}
      isOpen={isOpen}
      onToggle={onToggle}
      isEmpty={value.length === 0}
    >
      <div className="uplate-targeting__chips">
        {DIETARY_PREFS.map((pref) => {
          const selected = selectedSet.has(pref.value);
          return (
            <Chip
              key={pref.value}
              selected={selected}
              onClick={() => {
                if (selected) {
                  onChange(value.filter((v) => v.pref !== pref.value));
                } else {
                  onChange([...value, { pref: pref.value, priority: 'medium' }]);
                }
              }}
            >
              {pref.label}
            </Chip>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="uplate-targeting__rules">
          {value.map((rule) => {
            const meta = DIETARY_PREFS.find((p) => p.value === rule.pref);
            return (
              <div key={rule.pref} className="uplate-targeting__rule">
                <span className="uplate-targeting__rulename">{meta?.label ?? rule.pref}</span>
                <PrioritySelector
                  value={rule.priority}
                  onChange={(next) =>
                    onChange(
                      value.map((v) => (v.pref === rule.pref ? { ...v, priority: next } : v)),
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </TargetingSection>
  );
}

function summarize(value: DietaryRule[]): string {
  if (value.length === 0) return '';
  const labels = value
    .slice(0, 4)
    .map((r) => DIETARY_PREFS.find((p) => p.value === r.pref)?.label ?? r.pref);
  const more = value.length - labels.length;
  return labels.join(', ') + (more > 0 ? `, and ${more} more` : '');
}
