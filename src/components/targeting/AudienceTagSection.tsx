import { Target } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Chip } from '../ui/Chip';
import { PrioritySelector } from '../ui/PrioritySelector';
import { AUDIENCE_TAGS } from '../../data/constants';
import type { AudienceTagRule, Targeting } from '../../types';

interface Props {
  value: AudienceTagRule[];
  onChange: (next: Targeting['audienceTags']) => void;
}

export function AudienceTagSection({ value, onChange }: Props) {
  const selectedSet = new Set(value.map((v) => v.tag));

  return (
    <SectionShell
      icon={<Target size={16} />}
      title="Audience tags"
      hint="Behavioral nutrition signals. Higher priority increases ranking influence."
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {AUDIENCE_TAGS.map((tag) => {
          const selected = selectedSet.has(tag.value);
          return (
            <Chip
              key={tag.value}
              selected={selected}
              onClick={() => {
                if (selected) {
                  onChange(value.filter((v) => v.tag !== tag.value));
                } else {
                  onChange([...value, { tag: tag.value, priority: 'medium' }]);
                }
              }}
            >
              {tag.label}
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
            const meta = AUDIENCE_TAGS.find((t) => t.value === rule.tag);
            return (
              <div
                key={rule.tag}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--s-3)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {meta?.label ?? rule.tag}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{meta?.hint}</span>
                </div>
                <PrioritySelector
                  value={rule.priority}
                  onChange={(next) =>
                    onChange(value.map((v) => (v.tag === rule.tag ? { ...v, priority: next } : v)))
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
