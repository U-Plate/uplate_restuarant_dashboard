// Shared vocabulary for the Restaurant Insights tab — label maps and the
// domain types that don't belong in `src/types` because nothing outside this
// feature (ads/campaigns/targeting) references them. Mirrors how
// `data/constants.ts` holds AUDIENCE_LABEL / DIETARY_LABEL for the ads side.

export type HealthGoal = 'cut' | 'bulk' | 'maintain';

export const HEALTH_GOAL_LABEL: Record<HealthGoal, string> = {
  cut: 'Cutting',
  bulk: 'Bulking',
  maintain: 'Maintaining',
};

export type AgeBucket = '18–19' | '20–21' | '22–23' | '24+';

export function ageBucket(age: number): AgeBucket {
  if (age <= 19) return '18–19';
  if (age <= 21) return '20–21';
  if (age <= 23) return '22–23';
  return '24+';
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}
