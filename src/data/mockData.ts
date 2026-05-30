import type {
  Ad,
  AdEvent,
  AdLocation,
  AnalyticsPoint,
  AppState,
  AudienceTag,
  Campaign,
  DayOfWeek,
  DietaryPreference,
  Targeting,
} from '../types';

function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

const ALL_AUDIENCE_TAGS: AudienceTag[] = [
  'highProtein',
  'highCarb',
  'postWorkout',
  'lowCalorie',
  'macroFriendly',
];

const ALL_DIETARY: DietaryPreference[] = [
  'vegan',
  'vegetarian',
  'pescatarian',
  'halal',
  'kosher',
];

const OFF_TARGET_FOODS: string[] = [
  'Power Smoothie',
  'Salad Bowl',
  'Cold Brew',
  'Burrito Bowl',
  'Energy Bar',
  'Açaí Bowl',
];

const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function pickWeighted<T>(items: readonly T[], probability: number, rand: () => number): T[] {
  const out: T[] = [];
  for (const item of items) {
    if (rand() < probability) out.push(item);
  }
  return out;
}

// Bucket an offset-from-today (0..29) into a real timestamp, snapped to a
// random hour/minute that respects the ad's time targeting window when one
// exists. Most signal endpoints care about hour-of-day, so the bias has to
// be in the timestamp itself.
function pickOccurredAt(
  dayOffset: number,
  targeting: Targeting,
  rand: () => number,
): Date {
  const d = new Date();
  d.setDate(d.getDate() - dayOffset);
  const range = targeting.time.range;
  let hour: number;
  if (range && rand() < 0.78) {
    const { startHour, endHour } = range;
    if (endHour > startHour) {
      hour = startHour + Math.floor(rand() * Math.max(1, endHour - startHour));
    } else {
      // Wrap-around window (e.g. 21..2 → 21,22,23,0,1).
      const span = 24 - startHour + endHour;
      const offset = Math.floor(rand() * Math.max(1, span));
      hour = (startHour + offset) % 24;
    }
  } else {
    // Lunch + dinner double peak shows up by default even without targeting.
    hour = rand() < 0.55 ? 11 + Math.floor(rand() * 4) : 17 + Math.floor(rand() * 5);
  }
  d.setHours(hour, Math.floor(rand() * 60), Math.floor(rand() * 60), 0);
  return d;
}

function generateEventsForAd(
  ad: Ad,
  seed: number,
  totalEvents = 50,
  clickShare = 0.3,
): AdEvent[] {
  const rand = seeded(seed);
  const targeting = ad.targeting;

  const targetedTagSet = new Set(targeting.audienceTags.map((r) => r.tag));
  const targetedDietSet = new Set(targeting.dietary.map((r) => r.pref));
  const targetedFoods = targeting.foodInterests.map((r) => r.name);
  const targetedDays = new Set<DayOfWeek>(
    targeting.time.days.length > 0 ? targeting.time.days : ALL_DAYS,
  );
  const wantsRecurring = targeting.behavioral.recurringCustomer;

  const events: AdEvent[] = [];
  const numClicks = Math.round(totalEvents * clickShare);
  const numImpressions = totalEvents - numClicks;

  for (let i = 0; i < totalEvents; i++) {
    const isClick = i < numClicks;

    // Spread events over the last 30 days, with a tiny bias toward more
    // recent dates so the daily series feels "fresh".
    const dayOffset = Math.floor(Math.pow(rand(), 1.4) * 30);
    let occurredAt = pickOccurredAt(dayOffset, targeting, rand);

    // If the ad targets specific days, retry up to 3x to land on one of them.
    const jsToMon = (jsDay: number) => ALL_DAYS[(jsDay + 6) % 7];
    if (targeting.time.days.length > 0) {
      for (let tries = 0; tries < 3; tries++) {
        if (targetedDays.has(jsToMon(occurredAt.getDay()))) break;
        occurredAt = pickOccurredAt(dayOffset, targeting, rand);
      }
    }

    // Audience tags: clickers match the ad's tags far more often than they
    // match unrelated tags. Impressions also lean targeted (the ad served
    // because something matched) but with more noise so the comparison
    // shows up nicely on the dashboard.
    const targetHit = isClick ? 0.72 : 0.55;
    const offTarget = isClick ? 0.1 : 0.18;
    const tags: AudienceTag[] = [];
    for (const t of ALL_AUDIENCE_TAGS) {
      const targeted = targetedTagSet.has(t);
      if (rand() < (targeted ? targetHit : offTarget)) tags.push(t);
    }

    const dietary: DietaryPreference[] = [];
    for (const p of ALL_DIETARY) {
      const targeted = targetedDietSet.has(p);
      if (rand() < (targeted ? (isClick ? 0.7 : 0.5) : isClick ? 0.06 : 0.1)) {
        dietary.push(p);
      }
    }

    const foodInterests: string[] = [];
    for (const name of targetedFoods) {
      if (rand() < (isClick ? 0.66 : 0.48)) foodInterests.push(name);
    }
    for (const name of pickWeighted(OFF_TARGET_FOODS, isClick ? 0.08 : 0.14, rand)) {
      if (!foodInterests.includes(name)) foodInterests.push(name);
    }

    const recurringProb = wantsRecurring
      ? isClick
        ? 0.72
        : 0.55
      : isClick
        ? 0.36
        : 0.3;

    events.push({
      id: `ev-${ad.id}-${i}`,
      adId: ad.id,
      type: isClick ? 'click' : 'impression',
      occurredAt: occurredAt.toISOString(),
      recurringCustomer: rand() < recurringProb,
      tags,
      dietary,
      foodInterests,
    });
  }

  void numImpressions;
  return events;
}

function metricsFromEvents(events: AdEvent[]): {
  impressions: number;
  clicks: number;
  series: AnalyticsPoint[];
} {
  const byDate = new Map<string, AnalyticsPoint>();
  let impressions = 0;
  let clicks = 0;
  for (const ev of events) {
    const date = ev.occurredAt.slice(0, 10);
    const point = byDate.get(date) ?? { date, impressions: 0, clicks: 0 };
    if (ev.type === 'impression') {
      point.impressions += 1;
      impressions += 1;
    } else {
      point.clicks += 1;
      clicks += 1;
    }
    byDate.set(date, point);
  }
  const series = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { impressions, clicks, series };
}

function emptyTargeting(): Targeting {
  return {
    audienceTags: [],
    dietary: [],
    foodInterests: [],
    exclusions: [],
    behavioral: { recurringCustomer: false, recurringPriority: 'medium' },
    time: { range: null, days: [] },
  };
}

function makeAd(
  id: string,
  campaignId: string,
  title: string,
  description: string,
  redirectUrl: string,
  targeting: Targeting,
  seed: number,
  status: 'active' | 'paused' = 'active',
  totalEvents = 50,
  location: AdLocation = 'homeScreen',
): { ad: Ad; events: AdEvent[] } {
  const now = new Date().toISOString();
  const skeleton: Ad = {
    id,
    campaignId,
    title,
    description,
    redirectUrl,
    status,
    location,
    targeting,
    metrics: { impressions: 0, clicks: 0, series: [] },
    createdAt: now,
    updatedAt: now,
  };
  const events = generateEventsForAd(skeleton, seed, totalEvents);
  const ad: Ad = { ...skeleton, metrics: metricsFromEvents(events) };
  return { ad, events };
}

export function buildSeedState(): AppState {
  const ads: Record<string, Ad> = {};
  const campaigns: Record<string, Campaign> = {};
  const campaignOrder: string[] = [];
  const events: AdEvent[] = [];

  const now = new Date().toISOString();

  function add(result: { ad: Ad; events: AdEvent[] }) {
    ads[result.ad.id] = result.ad;
    events.push(...result.events);
  }

  // Campaign 1: Post-Workout Protein Bowls
  const c1: Campaign = {
    id: 'c1',
    name: 'Post-Workout Protein Bowls',
    status: 'active',
    startDate: daysAgo(28),
    endDate: daysAgo(-30),
    adIds: ['a1', 'a2', 'a3'],
    createdAt: now,
    updatedAt: now,
  };
  campaigns[c1.id] = c1;
  campaignOrder.push(c1.id);

  add(
    makeAd(
      'a1',
      'c1',
      'Chicken Quinoa Power Bowl',
      'Hit your macros with 42g of grilled chicken protein over warm quinoa.',
      'https://uplate.app/order/chicken-quinoa-bowl',
      {
        ...emptyTargeting(),
        audienceTags: [
          { tag: 'highProtein', priority: 'required' },
          { tag: 'postWorkout', priority: 'high' },
        ],
        foodInterests: [
          { name: 'Quinoa Bowl', priority: 'high' },
          { name: 'Protein Shake', priority: 'medium' },
        ],
        time: { range: { startHour: 11, endHour: 21 }, days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      },
      101,
      'active',
      60,
    ),
  );
  add(
    makeAd(
      'a2',
      'c1',
      'Salmon Macro Plate',
      'Wild-caught salmon, sweet potato, kale. Balanced 40/30/30 split.',
      'https://uplate.app/order/salmon-macro-plate',
      {
        ...emptyTargeting(),
        audienceTags: [
          { tag: 'highProtein', priority: 'high' },
          { tag: 'macroFriendly', priority: 'required' },
        ],
        dietary: [{ pref: 'pescatarian', priority: 'medium' }],
        foodInterests: [{ name: 'Grilled Salmon', priority: 'high' }],
      },
      102,
      'active',
      55,
    ),
  );
  add(
    makeAd(
      'a3',
      'c1',
      'Greek Yogurt Recovery Cup',
      'Quick post-lift refuel. 22g protein, honey, and granola crunch.',
      'https://uplate.app/order/greek-yogurt-cup',
      {
        ...emptyTargeting(),
        audienceTags: [{ tag: 'postWorkout', priority: 'required' }],
        foodInterests: [{ name: 'Greek Yogurt', priority: 'required' }],
        exclusions: ['dairy'],
      },
      103,
      'paused',
      40,
      'diningHallMenu',
    ),
  );

  // Campaign 2: Vegan Lunch Boost
  const c2: Campaign = {
    id: 'c2',
    name: 'Vegan Lunch Boost',
    status: 'active',
    startDate: daysAgo(20),
    endDate: daysAgo(-40),
    adIds: ['a4', 'a5'],
    createdAt: now,
    updatedAt: now,
  };
  campaigns[c2.id] = c2;
  campaignOrder.push(c2.id);

  add(
    makeAd(
      'a4',
      'c2',
      'Smoky Tofu Buddha Bowl',
      'Marinated tofu, brown rice, roasted veg, tahini drizzle.',
      'https://uplate.app/order/tofu-buddha-bowl',
      {
        ...emptyTargeting(),
        audienceTags: [
          { tag: 'macroFriendly', priority: 'medium' },
          { tag: 'lowCalorie', priority: 'low' },
        ],
        dietary: [
          { pref: 'vegan', priority: 'required' },
          { pref: 'vegetarian', priority: 'medium' },
        ],
        foodInterests: [
          { name: 'Tofu Stir-Fry', priority: 'high' },
          { name: 'Rice Bowl', priority: 'medium' },
        ],
        time: { range: { startHour: 11, endHour: 14 }, days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      },
      201,
      'active',
      55,
    ),
  );
  add(
    makeAd(
      'a5',
      'c2',
      'Falafel Power Wrap',
      'Crispy falafel, hummus, pickled veg in a spinach wrap.',
      'https://uplate.app/order/falafel-wrap',
      {
        ...emptyTargeting(),
        audienceTags: [{ tag: 'highProtein', priority: 'medium' }],
        dietary: [{ pref: 'vegetarian', priority: 'high' }, { pref: 'vegan', priority: 'medium' }],
        foodInterests: [{ name: 'Falafel', priority: 'required' }],
      },
      202,
      'active',
      45,
      'diningHallMenu',
    ),
  );

  // Campaign 3: Late-Night Study Fuel
  const c3: Campaign = {
    id: 'c3',
    name: 'Late-Night Study Fuel',
    status: 'paused',
    startDate: daysAgo(45),
    endDate: daysAgo(-15),
    adIds: ['a6', 'a7'],
    createdAt: now,
    updatedAt: now,
  };
  campaigns[c3.id] = c3;
  campaignOrder.push(c3.id);

  add(
    makeAd(
      'a6',
      'c3',
      'Midnight Ramen Bowl',
      'Slow-simmered broth, chashu pork, soft egg. Open till 2am.',
      'https://uplate.app/order/midnight-ramen',
      {
        ...emptyTargeting(),
        audienceTags: [{ tag: 'highCarb', priority: 'high' }],
        foodInterests: [{ name: 'Ramen', priority: 'required' }],
        behavioral: { recurringCustomer: true, recurringPriority: 'high' },
        time: { range: { startHour: 21, endHour: 2 }, days: ['thu', 'fri', 'sat'] },
      },
      301,
      'paused',
      50,
    ),
  );
  add(
    makeAd(
      'a7',
      'c3',
      'Iced Matcha + Croissant',
      'Caffeine without the jitters. Pair with a buttery croissant.',
      'https://uplate.app/order/matcha-croissant',
      {
        ...emptyTargeting(),
        foodInterests: [
          { name: 'Matcha Latte', priority: 'high' },
          { name: 'Croissant', priority: 'high' },
        ],
        behavioral: { recurringCustomer: true, recurringPriority: 'medium' },
      },
      302,
      'active',
      40,
    ),
  );

  // Campaign 4: Macro-Friendly Breakfast
  const c4: Campaign = {
    id: 'c4',
    name: 'Macro-Friendly Breakfast',
    status: 'active',
    startDate: daysAgo(10),
    endDate: daysAgo(-50),
    adIds: ['a8', 'a9'],
    createdAt: now,
    updatedAt: now,
  };
  campaigns[c4.id] = c4;
  campaignOrder.push(c4.id);

  add(
    makeAd(
      'a8',
      'c4',
      'Steel-Cut Oat Builder',
      'Pick your protein and 3 toppings. Hot, balanced, under 480 cal.',
      'https://uplate.app/order/oat-builder',
      {
        ...emptyTargeting(),
        audienceTags: [
          { tag: 'macroFriendly', priority: 'required' },
          { tag: 'lowCalorie', priority: 'high' },
        ],
        foodInterests: [{ name: 'Oat Bowl', priority: 'high' }],
        time: { range: { startHour: 7, endHour: 11 }, days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
      },
      401,
      'active',
      50,
    ),
  );
  add(
    makeAd(
      'a9',
      'c4',
      'Avocado Toast + Egg',
      'Sourdough, smashed avocado, soft-poached egg, chili crisp.',
      'https://uplate.app/order/avocado-toast',
      {
        ...emptyTargeting(),
        audienceTags: [{ tag: 'highProtein', priority: 'medium' }],
        dietary: [{ pref: 'vegetarian', priority: 'medium' }],
        foodInterests: [
          { name: 'Avocado Toast', priority: 'required' },
          { name: 'Cold Brew', priority: 'medium' },
        ],
        time: { range: { startHour: 7, endHour: 12 }, days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
      },
      402,
      'active',
      55,
    ),
  );

  return {
    campaigns,
    ads,
    events,
    campaignOrder,
    restaurant: { name: 'Boiler Bowl Co.' },
  };
}

export { metricsFromEvents };
