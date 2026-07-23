// Seeded, deterministic raw events for the Restaurant Insights tab — the
// consumer-app event stream documented in /restaurant-insights.md §2.2
// (RestaurantViewed, MenuViewed, MenuItemViewed, MealLogged, Rating).
//
// This stream doesn't exist on a real backend yet, so `analytics.local.ts`
// aggregates these events the same way it aggregates `ad_events` today: real
// GROUP BY-style math over seeded demo data, not synthetic display numbers.
// When a real event-ingestion backend ships, this file and the aggregation
// in local.ts are what get replaced by the SQL in backend.md.
//
// No Search events and no `source` on RestaurantViewed: most restaurant-page
// traffic is a student logging a meal they already ate, not discovering a
// new place to eat, so a discovery-source/search-demand model would be
// simulating behavior the product doesn't have yet.

import type { DietaryPreference } from '../types';
import type { HealthGoal } from '../lib/insights';
import { CUISINE_INTEREST_SUGGESTIONS } from './constants';
import { seeded } from './mockData';

export interface MenuItemSeed {
  id: string;
  name: string;
}

export interface VisitorProfile {
  id: string;
  age: number;
  dietary: DietaryPreference | null;
  healthGoal: HealthGoal;
  cuisines: string[];
}

export interface RestaurantViewEvent {
  id: string;
  userId: string;
  occurredAt: string;
}

export interface MenuViewEvent {
  id: string;
  userId: string;
  occurredAt: string;
}

export interface MenuItemViewEvent {
  id: string;
  userId: string;
  menuItemId: string;
  occurredAt: string;
}

export interface MealLoggedEvent {
  id: string;
  userId: string;
  menuItemId: string;
  occurredAt: string;
}

export interface RatingEvent {
  id: string;
  userId: string;
  menuItemId: string;
  rating: number;
  occurredAt: string;
}

export interface RestaurantInsightSeed {
  menuItems: MenuItemSeed[];
  visitors: Map<string, VisitorProfile>;
  views: RestaurantViewEvent[];
  menuViews: MenuViewEvent[];
  itemViews: MenuItemViewEvent[];
  mealLogs: MealLoggedEvent[];
  ratings: RatingEvent[];
}

interface MenuItemTuning {
  id: string;
  name: string;
  /** Relative share of item-view traffic. */
  popularity: number;
  /** Multiplier on the base view→log-meal conversion rate. <1 = "people look, don't commit". */
  commitBias: number;
  /** Mean of the 1–5 rating distribution for this item. */
  quality: number;
}

const MENU_ITEM_TUNING: MenuItemTuning[] = [
  { id: 'mi1', name: 'Chicken Quinoa Power Bowl', popularity: 1.4, commitBias: 1.1, quality: 4.4 },
  { id: 'mi2', name: 'Salmon Macro Plate', popularity: 1.1, commitBias: 1.15, quality: 4.6 },
  { id: 'mi3', name: 'Greek Yogurt Recovery Cup', popularity: 0.7, commitBias: 1.2, quality: 4.2 },
  { id: 'mi4', name: 'Smoky Tofu Buddha Bowl', popularity: 0.9, commitBias: 1.0, quality: 4.3 },
  { id: 'mi5', name: 'Falafel Power Wrap', popularity: 1.0, commitBias: 1.1, quality: 4.5 },
  { id: 'mi6', name: 'Midnight Ramen Bowl', popularity: 1.3, commitBias: 1.05, quality: 3.3 },
  { id: 'mi7', name: 'Iced Matcha + Croissant', popularity: 1.2, commitBias: 0.35, quality: 4.0 },
  { id: 'mi8', name: 'Steel-Cut Oat Builder', popularity: 0.6, commitBias: 1.3, quality: 4.5 },
  { id: 'mi9', name: 'Avocado Toast + Egg', popularity: 1.0, commitBias: 0.85, quality: 3.6 },
];

const RESTAURANT_CUISINES = ['Mediterranean', 'American', 'Japanese', 'Thai', 'Middle Eastern', 'Greek', 'French'];

// Which visitor segments gravitate toward which item — drives the "who's
// ordering what" audience breakdown on the insights tab. Without this, item
// choice would be pure popularity, uncorrelated with diner profile, and the
// per-item audience mix would just mirror the restaurant-wide baseline with
// no signal for an owner to act on.
const ITEM_DIETARY_AFFINITY: Partial<Record<string, Partial<Record<DietaryPreference, number>>>> = {
  mi1: { halal: 1.6 }, // Chicken Quinoa Power Bowl
  mi2: { pescatarian: 2.8, kosher: 2.8 }, // Salmon Macro Plate
  mi3: { vegetarian: 1.6, kosher: 1.4 }, // Greek Yogurt Recovery Cup
  mi4: { vegan: 2.6, vegetarian: 1.8 }, // Smoky Tofu Buddha Bowl
  mi5: { vegan: 2.0, vegetarian: 1.6, halal: 2.6 }, // Falafel Power Wrap
  mi7: { vegetarian: 1.5 }, // Iced Matcha + Croissant
  mi8: { vegan: 1.6, kosher: 1.3 }, // Steel-Cut Oat Builder
  mi9: { vegetarian: 1.7 }, // Avocado Toast + Egg
};

const ITEM_HEALTHGOAL_AFFINITY: Partial<Record<string, Partial<Record<HealthGoal, number>>>> = {
  mi1: { bulk: 1.6, maintain: 1.4 }, // Chicken Quinoa Power Bowl
  mi2: { bulk: 1.5, maintain: 1.3 }, // Salmon Macro Plate
  mi3: { cut: 1.8 }, // Greek Yogurt Recovery Cup
  mi4: { cut: 1.3, maintain: 1.2 }, // Smoky Tofu Buddha Bowl
  mi5: { maintain: 1.2 }, // Falafel Power Wrap
  mi6: { bulk: 1.6 }, // Midnight Ramen Bowl
  mi7: { maintain: 1.3 }, // Iced Matcha + Croissant
  mi8: { bulk: 1.5, cut: 1.2 }, // Steel-Cut Oat Builder
  mi9: { cut: 1.4, maintain: 1.2 }, // Avocado Toast + Egg
};

function itemWeightsForVisitor(profile: VisitorProfile): number[] {
  return MENU_ITEM_TUNING.map((m) => {
    let w = m.popularity;
    if (profile.dietary) w *= ITEM_DIETARY_AFFINITY[m.id]?.[profile.dietary] ?? 1;
    w *= ITEM_HEALTHGOAL_AFFINITY[m.id]?.[profile.healthGoal] ?? 1;
    return w;
  });
}

function pickIndexWeighted(weights: number[], rand: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let target = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i];
    if (target <= 0) return i;
  }
  return weights.length - 1;
}

function pickInsightHour(rand: () => number): number {
  const r = rand();
  if (r < 0.1) return 7 + Math.floor(rand() * 3); // breakfast
  if (r < 0.62) return 11 + Math.floor(rand() * 4); // lunch
  return 17 + Math.floor(rand() * 5); // dinner
}

function timestampFromOffset(dayOffset: number, rand: () => number): Date {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  d.setHours(pickInsightHour(rand), Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
  return d;
}

function later(base: Date, minMinutes: number, maxMinutes: number, rand: () => number): Date {
  const minutes = minMinutes + rand() * (maxMinutes - minMinutes);
  return new Date(base.getTime() + minutes * 60_000);
}

function pickDietary(rand: () => number): DietaryPreference | null {
  const r = rand();
  if (r < 0.14) return 'vegan';
  if (r < 0.34) return 'vegetarian';
  if (r < 0.44) return 'pescatarian';
  if (r < 0.52) return 'halal';
  if (r < 0.63) return 'kosher';
  return null;
}

function pickHealthGoal(rand: () => number): HealthGoal {
  const r = rand();
  if (r < 0.35) return 'cut';
  if (r < 0.65) return 'bulk';
  return 'maintain';
}

function pickCuisines(rand: () => number): string[] {
  const count = rand() < 0.6 ? 1 : 2;
  const chosen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const fromMenu = rand() < 0.65;
    const pool = fromMenu ? RESTAURANT_CUISINES : CUISINE_INTEREST_SUGGESTIONS;
    chosen.add(pool[Math.floor(rand() * pool.length)]);
  }
  return [...chosen];
}

function clampRating(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function buildRestaurantInsightSeed(): RestaurantInsightSeed {
  const rand = seeded(90210);
  const menuItems = MENU_ITEM_TUNING.map(({ id, name }) => ({ id, name }));

  const visitors = new Map<string, VisitorProfile>();
  const views: RestaurantViewEvent[] = [];
  const menuViews: MenuViewEvent[] = [];
  const itemViews: MenuItemViewEvent[] = [];
  const mealLogs: MealLoggedEvent[] = [];
  const ratings: RatingEvent[] = [];

  let eventSeq = 0;
  const nextId = (prefix: string) => `${prefix}${++eventSeq}`;

  const VISITOR_POOL = 820;
  for (let v = 0; v < VISITOR_POOL; v++) {
    if (rand() >= 0.62) continue; // this potential visitor never found the restaurant

    const userId = `viz-${v}`;
    const age = rand() < 0.05 ? 24 + Math.floor(rand() * 3) : 18 + Math.floor(rand() * 6);
    const profile: VisitorProfile = {
      id: userId,
      age,
      dietary: pickDietary(rand),
      healthGoal: pickHealthGoal(rand),
      cuisines: pickCuisines(rand),
    };
    visitors.set(userId, profile);
    const itemWeights = itemWeightsForVisitor(profile);

    const numViews = 1 + Math.floor(Math.pow(rand(), 1.6) * 4);
    for (let i = 0; i < numViews; i++) {
      const dayOffset = Math.floor(Math.pow(rand(), 1.3) * 30);
      const viewedAt = timestampFromOffset(dayOffset, rand);

      views.push({ id: nextId('rv-'), userId, occurredAt: viewedAt.toISOString() });

      if (rand() >= 0.58) continue;
      const menuViewedAt = later(viewedAt, 0.3, 4, rand);
      menuViews.push({ id: nextId('mv-'), userId, occurredAt: menuViewedAt.toISOString() });

      if (rand() >= 0.52) continue;
      const numItems = rand() < 0.7 ? 1 : 2;
      for (let k = 0; k < numItems; k++) {
        const itemIdx = pickIndexWeighted(itemWeights, rand);
        const item = MENU_ITEM_TUNING[itemIdx];
        const itemViewedAt = later(menuViewedAt, 0.2, 3, rand);
        itemViews.push({
          id: nextId('iv-'),
          userId,
          menuItemId: item.id,
          occurredAt: itemViewedAt.toISOString(),
        });

        const logProb = Math.min(0.92, 0.46 * item.commitBias);
        if (rand() >= logProb) continue;
        const loggedAt = later(itemViewedAt, 20, 8 * 60, rand);
        mealLogs.push({
          id: nextId('ml-'),
          userId,
          menuItemId: item.id,
          occurredAt: loggedAt.toISOString(),
        });

        if (rand() >= 0.58) continue;
        const jitter = (rand() - 0.5) * 1.6;
        ratings.push({
          id: nextId('rt-'),
          userId,
          menuItemId: item.id,
          rating: clampRating(item.quality + jitter),
          occurredAt: later(loggedAt, 5, 240, rand).toISOString(),
        });
      }
    }
  }

  return { menuItems, visitors, views, menuViews, itemViews, mealLogs, ratings };
}
