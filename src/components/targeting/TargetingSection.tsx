import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface TargetingSectionProps {
  icon: ReactNode;
  eyebrow: string;
  summary: string;
  hint?: string;
  isOpen: boolean;
  onToggle: () => void;
  isEmpty: boolean;
  emptyCta?: string;
  children: ReactNode;
}

/**
 * One row of the TargetingBuilder. Header row is always visible (shows the
 * eyebrow + closed-state summary or "Add" CTA). Children render below the
 * header when isOpen is true. The hairline divider above sits in the parent
 * grid so the first row doesn't get an unwanted top border.
 */
export function TargetingSection({
  icon,
  eyebrow,
  summary,
  hint,
  isOpen,
  onToggle,
  isEmpty,
  emptyCta = 'Add',
  children,
}: TargetingSectionProps) {
  return (
    <section className="uplate-targeting__section">
      <button
        type="button"
        className="uplate-targeting__sectionhead"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="uplate-targeting__sectionicon" aria-hidden>
          {icon}
        </span>
        <span className="uplate-targeting__sectionmeta">
          <span className="uplate-targeting__eyebrow">{eyebrow}</span>
          <span
            className="uplate-targeting__summary"
            data-empty={isEmpty}
          >
            {isEmpty ? emptyCta : summary}
          </span>
        </span>
        <ChevronDown
          size={16}
          className="uplate-targeting__chev"
          data-open={isOpen}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div className="uplate-targeting__sectionbody">
          {hint && <p className="uplate-targeting__hint">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
}
