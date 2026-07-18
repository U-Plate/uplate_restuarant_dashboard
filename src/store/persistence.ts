import type { AppState } from '../types';

const KEY = 'uplate-dashboard-v2';

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    // Backfill `location` for ads persisted before the field existed.
    for (const ad of Object.values(parsed.ads ?? {})) {
      if (!ad.location) ad.location = 'homeScreen';
      if (!ad.targeting.cuisineInterests) ad.targeting.cuisineInterests = [];
    }
    // Pre-events snapshots have no per-event audience signals. Fall back
    // to the fresh seed so the click-signals breakdown stays real instead
    // of fabricating events on the fly.
    if (!Array.isArray(parsed.events) || parsed.events.length === 0) {
      return null;
    }
    for (const ev of parsed.events) {
      if (!ev.cuisineInterests) ev.cuisineInterests = [];
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota exceeded or storage unavailable — fail silently
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
