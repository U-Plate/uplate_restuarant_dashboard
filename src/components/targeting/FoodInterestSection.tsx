import { useMemo, useState } from 'react';
import { Plus, Search, Utensils, X } from 'lucide-react';
import { SectionShell } from './SectionShell';
import { Chip } from '../ui/Chip';
import { PrioritySelector } from '../ui/PrioritySelector';
import { FOOD_INTEREST_SUGGESTIONS } from '../../data/constants';
import type { FoodInterestRule } from '../../types';

interface Props {
  value: FoodInterestRule[];
  onChange: (next: FoodInterestRule[]) => void;
}

export function FoodInterestSection({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(value.map((v) => v.name.toLowerCase())), [value]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return FOOD_INTEREST_SUGGESTIONS.filter(
      (s) => s.toLowerCase().includes(q) && !selectedSet.has(s.toLowerCase())
    ).slice(0, 6);
  }, [query, selectedSet]);

  const addCustom = () => {
    const name = query.trim();
    if (!name || selectedSet.has(name.toLowerCase())) return;
    onChange([...value, { name, priority: 'medium' }]);
    setQuery('');
  };

  return (
    <SectionShell
      icon={<Utensils size={16} />}
      title="Food interests"
      hint="Match users who like specific foods or items. Set priority per interest."
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--surface-2)',
          borderRadius: 'var(--r-md)',
          padding: '10px 12px',
        }}
      >
        <Search size={16} color="var(--text-soft)" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Search foods or add your own…"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: 'var(--text)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={addCustom}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              background: 'var(--accent)',
              color: 'var(--surface)',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 'var(--r-pill)',
              border: 'none',
            }}
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
          {value.map((rule) => (
            <div
              key={rule.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--s-3)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  {rule.name}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v.name !== rule.name))}
                  aria-label={`Remove ${rule.name}`}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 'var(--r-pill)',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-soft)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
              <PrioritySelector
                value={rule.priority}
                onChange={(next) =>
                  onChange(
                    value.map((v) => (v.name === rule.name ? { ...v, priority: next } : v))
                  )
                }
              />
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}
