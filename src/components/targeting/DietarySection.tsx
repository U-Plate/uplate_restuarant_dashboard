import { Leaf } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Chip } from '../ui/Chip';
import { PrioritySelector } from '../ui/PrioritySelector';
import { DIETARY_PREFS } from '../../data/constants';
import type { DietaryRule } from '../../types';

interface Props {
  value: DietaryRule[];
  onChange: (next: DietaryRule[]) => void;
}

export function DietarySection({ value, onChange }: Props) {
  const selectedSet = new Set(value.map((v) => v.pref));

  return (
    <SectionShell
      icon={<Leaf size={16} />}
      title="Dietary preferences"
      hint="Higher priority increases ranking influence for users with this preference."
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-2)',
            padding: 'var(--s-3) var(--s-4)',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
          }}
        >
          {value.map((rule) => {
            const meta = DIETARY_PREFS.find((p) => p.value === rule.pref);
            return (
              <div
                key={rule.pref}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--s-3)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {meta?.label ?? rule.pref}
                </span>
                <PrioritySelector
                  value={rule.priority}
                  onChange={(next) =>
                    onChange(
                      value.map((v) => (v.pref === rule.pref ? { ...v, priority: next } : v))
                    )
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}
