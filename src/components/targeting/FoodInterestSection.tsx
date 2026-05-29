import { useMemo, useState } from 'react';
import { Plus, Search, Soup, X } from 'lucide-react';
import { TargetingSection } from './TargetingSection';
import { Chip } from '../ui/Chip';
import { PrioritySelector } from '../ui/PrioritySelector';
import { FOOD_INTEREST_SUGGESTIONS } from '../../data/constants';
import type { FoodInterestRule } from '../../types';

interface Props {
  value: FoodInterestRule[];
  onChange: (next: FoodInterestRule[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function FoodInterestSection({ value, onChange, isOpen, onToggle }: Props) {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(
    () => new Set(value.map((v) => v.name.toLowerCase())),
    [value],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return FOOD_INTEREST_SUGGESTIONS.filter(
      (s) => s.toLowerCase().includes(q) && !selectedSet.has(s.toLowerCase()),
    ).slice(0, 6);
  }, [query, selectedSet]);

  const addCustom = () => {
    const name = query.trim();
    if (!name || selectedSet.has(name.toLowerCase())) return;
    onChange([...value, { name, priority: 'medium' }]);
    setQuery('');
  };

  const summary = summarize(value);

  return (
    <TargetingSection
      icon={<Soup size={14} />}
      eyebrow="Food interests"
      hint="Free-text foods, dishes, or ingredients you serve."
      summary={summary}
      isOpen={isOpen}
      onToggle={onToggle}
      isEmpty={value.length === 0}
      emptyCta="Add interests"
    >
      <div className="uplate-targeting__search">
        <Search size={14} color="var(--ink-3)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Search foods, or type your own"
          className="uplate-targeting__searchinput"
        />
        {query && (
          <button
            type="button"
            onClick={addCustom}
            className="uplate-targeting__searchadd"
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="uplate-targeting__chips">
          {suggestions.map((s) => (
            <Chip
              key={s}
              onClick={() => {
                onChange([...value, { name: s, priority: 'medium' }]);
                setQuery('');
              }}
              size="sm"
            >
              + {s}
            </Chip>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <div className="uplate-targeting__rules">
          {value.map((rule) => (
            <div key={rule.name} className="uplate-targeting__rule">
              <div className="uplate-targeting__rulemeta">
                <span className="uplate-targeting__rulename">{rule.name}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v.name !== rule.name))}
                  aria-label={`Remove ${rule.name}`}
                  className="uplate-targeting__ruleremove"
                >
                  <X size={12} />
                </button>
              </div>
              <PrioritySelector
                value={rule.priority}
                onChange={(next) =>
                  onChange(
                    value.map((v) => (v.name === rule.name ? { ...v, priority: next } : v)),
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
    </TargetingSection>
  );
}

function summarize(value: FoodInterestRule[]): string {
  if (value.length === 0) return '';
  const labels = value.slice(0, 4).map((r) => r.name);
  const more = value.length - labels.length;
  return labels.join(', ') + (more > 0 ? `, and ${more} more` : '');
}
