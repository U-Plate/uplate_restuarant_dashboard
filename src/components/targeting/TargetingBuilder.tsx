import type { Targeting } from '../../types';
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

export function TargetingBuilder({ value, onChange }: TargetingBuilderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
      <AudienceTagSection
        value={value.audienceTags}
        onChange={(audienceTags) => onChange({ ...value, audienceTags })}
      />
      <DietarySection
        value={value.dietary}
        onChange={(dietary) => onChange({ ...value, dietary })}
      />
      <FoodInterestSection
        value={value.foodInterests}
        onChange={(foodInterests) => onChange({ ...value, foodInterests })}
      />
      <ExclusionsSection
        value={value.exclusions}
        onChange={(exclusions) => onChange({ ...value, exclusions })}
      />
      <BehavioralSection
        value={value.behavioral}
        onChange={(behavioral) => onChange({ ...value, behavioral })}
      />
      <TimeTargetingSection
        value={value.time}
        onChange={(time) => onChange({ ...value, time })}
      />
    </div>
  );
}
