import { Star } from 'lucide-react';

// Marks an item that's trending up this week, wherever its name appears —
// stands in for what used to be a standalone "Trending this week" list.
export function TrendStar() {
  return (
    <span
      title="Trending this week"
      aria-label="Trending this week"
      style={{ display: 'inline-flex', verticalAlign: -1, marginLeft: 5 }}
    >
      <Star size={12} strokeWidth={0} fill="var(--accent)" aria-hidden="true" />
    </span>
  );
}
