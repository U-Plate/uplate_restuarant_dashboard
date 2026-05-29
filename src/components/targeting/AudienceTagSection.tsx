import { Target } from 'lucide-react';
import { TargetingSection } from './TargetingSection';
import { Chip } from '../ui/Chip';
import { PrioritySelector } from '../ui/PrioritySelector';
import { AUDIENCE_TAGS } from '../../data/constants';
import type { AudienceTagRule, Targeting } from '../../types';

interface Props {
  value: AudienceTagRule[];
  onChange: (next: Targeting['audienceTags']) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AudienceTagSection({ value, onChange, isOpen, onToggle }: Props) {
  const selectedSet = new Set(value.map((v) => v.tag));
  const summary = summarize(value);

  return (
    <TargetingSection
      icon={<Target size={14} />}
      eyebrow="Nutrition signals"
      hint="Behavioral nutrition tags the matching engine ranks against."
      summary={summary}
      isOpen={isOpen}
      onToggle={onToggle}
      isEmpty={value.length === 0}
    >
      <div className="uplate-targeting__chips">
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
        <div className="uplate-targeting__rules">
          {value.map((rule) => {
            const meta = AUDIENCE_TAGS.find((t) => t.value === rule.tag);
            return (
              <div key={rule.tag} className="uplate-targeting__rule">
                <div className="uplate-targeting__rulemeta">
                  <span className="uplate-targeting__rulename">{meta?.label ?? rule.tag}</span>
                  {meta?.hint && (
                    <span className="uplate-targeting__rulehint">{meta.hint}</span>
                  )}
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
    </TargetingSection>
  );
}

function summarize(value: AudienceTagRule[]): string {
  if (value.length === 0) return '';
  const labels = value
    .slice(0, 4)
    .map((r) => AUDIENCE_TAGS.find((t) => t.value === r.tag)?.label ?? r.tag);
  const more = value.length - labels.length;
  return labels.join(', ') + (more > 0 ? `, and ${more} more` : '');
}
