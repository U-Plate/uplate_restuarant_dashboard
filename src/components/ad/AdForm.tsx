import { Card } from '../ui/Card';
import { TextField, TextArea, SelectField } from '../ui/Field';
import type { Ad, AdLocation } from '../../types';
import { AD_LOCATIONS } from '../../data/constants';

interface AdFormProps {
  value: Pick<Ad, 'title' | 'description' | 'redirectUrl' | 'iconUrl' | 'ctaText' | 'location'>;
  onChange: (
    patch: Partial<
      Pick<Ad, 'title' | 'description' | 'redirectUrl' | 'iconUrl' | 'ctaText' | 'location'>
    >,
  ) => void;
}

export function AdForm({ value, onChange }: AdFormProps) {
  return (
    <Card padding="var(--s-5)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <SectionTitle title="Ad Design" />
        <SelectField
          label="Ad location"
          hint="Where this ad will appear. An ad can only be in one location."
          value={value.location}
          onChange={(e) => onChange({ location: e.target.value as AdLocation })}
          options={AD_LOCATIONS.map((l) => ({ value: l.value, label: l.label }))}
        />
        <TextField
          label="Title"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Chicken Quinoa Power Bowl"
        />
        <TextArea
          label="Description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Short, appetizing copy under 140 chars."
          rows={3}
        />
        <TextField
          label="Redirect URL"
          value={value.redirectUrl}
          onChange={(e) => onChange({ redirectUrl: e.target.value })}
          placeholder="https://uplate.app/order/your-item"
        />
        {value.location === 'homeScreen' && (
          <TextField
            label="Call to action"
            hint='The button label shoppers tap. Leave empty to use "Order Now".'
            value={value.ctaText ?? ''}
            onChange={(e) => onChange({ ctaText: e.target.value || undefined })}
            placeholder="Order Now"
            maxLength={24}
          />
        )}
        <TextField
          label="Custom icon URL"
          hint="Leave empty to use the restaurant's default icon."
          value={value.iconUrl ?? ''}
          onChange={(e) => onChange({ iconUrl: e.target.value || undefined })}
          placeholder="https://…"
        />
      </div>
    </Card>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
      {subtitle && (
        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{subtitle}</span>
      )}
    </div>
  );
}
