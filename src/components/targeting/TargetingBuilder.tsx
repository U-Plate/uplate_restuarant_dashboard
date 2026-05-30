import { useState } from 'react';
import type { Targeting } from '../../types';
import { summarizeTargeting } from '../../lib/targeting';
import { AudienceTagSection } from './AudienceTagSection';
import { DietarySection } from './DietarySection';
import { FoodInterestSection } from './FoodInterestSection';
import { ExclusionsSection } from './ExclusionsSection';
import { BehavioralSection } from './BehavioralSection';
import { TimeTargetingSection } from './TimeTargetingSection';

interface TargetingBuilderProps {
  value: Targeting;
  onChange: (next: Targeting) => void;
}

type SectionKey =
  | 'audienceTags'
  | 'dietary'
  | 'foodInterests'
  | 'exclusions'
  | 'time'
  | 'behavioral';

function initialOpenMap(t: Targeting): Record<SectionKey, boolean> {
  return {
    audienceTags: t.audienceTags.length > 0,
    dietary: t.dietary.length > 0,
    foodInterests: t.foodInterests.length > 0,
    exclusions: t.exclusions.length > 0,
    time: t.time.range !== null || t.time.days.length > 0,
    behavioral: t.behavioral.recurringCustomer,
  };
}

export function TargetingBuilder({ value, onChange }: TargetingBuilderProps) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>(() => initialOpenMap(value));
  const toggle = (key: SectionKey) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const summary = summarizeTargeting(value);

  return (
    <div className="uplate-targeting">
      <p className="uplate-targeting__verdict">{summary}</p>

      <div className="uplate-targeting__list">
        <AudienceTagSection
          value={value.audienceTags}
          onChange={(audienceTags) => onChange({ ...value, audienceTags })}
          isOpen={open.audienceTags}
          onToggle={() => toggle('audienceTags')}
        />
        <DietarySection
          value={value.dietary}
          onChange={(dietary) => onChange({ ...value, dietary })}
          isOpen={open.dietary}
          onToggle={() => toggle('dietary')}
        />
        <FoodInterestSection
          value={value.foodInterests}
          onChange={(foodInterests) => onChange({ ...value, foodInterests })}
          isOpen={open.foodInterests}
          onToggle={() => toggle('foodInterests')}
        />
        <ExclusionsSection
          value={value.exclusions}
          onChange={(exclusions) => onChange({ ...value, exclusions })}
          isOpen={open.exclusions}
          onToggle={() => toggle('exclusions')}
        />
        <TimeTargetingSection
          value={value.time}
          onChange={(time) => onChange({ ...value, time })}
          isOpen={open.time}
          onToggle={() => toggle('time')}
        />
        <BehavioralSection
          value={value.behavioral}
          onChange={(behavioral) => onChange({ ...value, behavioral })}
          isOpen={open.behavioral}
          onToggle={() => toggle('behavioral')}
        />
      </div>
    </div>
  );
}
