import { Ban } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Chip } from '../ui/Chip';
import { ALLERGIES } from '../../data/constants';
import type { Allergy } from '../../types';

interface Props {
  value: Allergy[];
  onChange: (next: Allergy[]) => void;
}

export function ExclusionsSection({ value, onChange }: Props) {
  const selectedSet = new Set(value);

  return (
    <SectionShell
      icon={<Ban size={16} />}
      title="Allergen exclusions"
      hint="Strict filters — users with these allergies will never see this ad. No weights apply."
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ALLERGIES.map((a) => {
          const selected = selectedSet.has(a.value);
          return (
            <Chip
              key={a.value}
              selected={selected}
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
        <p
          style={{
            fontSize: 12,
            color: 'var(--text-soft)',
            padding: '10px 14px',
            background: 'var(--surface-2)',
            borderRadius: 'var(--r-md)',
          }}
        >
          {value.length} strict exclusion{value.length === 1 ? '' : 's'} active. These narrow reach but
          protect users with allergies.
        </p>
      )}
    </SectionShell>
  );
}
