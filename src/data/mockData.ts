import type {
  Ad,
  AnalyticsPoint,
  AppState,
  Campaign,
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

function generateSeries(seed: number, days = 30, baseImpressions = 1200): AnalyticsPoint[] {
  const rand = seeded(seed);
  const out: AnalyticsPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const wave = Math.sin((days - i) / 3) * 0.18 + 0.9;
    const impressions = Math.round(baseImpressions * wave * (0.8 + rand() * 0.5));
    const ctr = 0.025 + rand() * 0.04;
    const clicks = Math.max(1, Math.round(impressions * ctr));
    out.push({ date: daysAgo(i), impressions, clicks });
  }
  return out;
}

function totals(series: AnalyticsPoint[]) {
  return series.reduce(
    (acc, p) => ({
      impressions: acc.impressions + p.impressions,
      clicks: acc.clicks + p.clicks,
    }),
    { impressions: 0, clicks: 0 }
  );
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
  base = 1200
): Ad {
  const series = generateSeries(seed, 30, base);
  const t = totals(series);
  const now = new Date().toISOString();
  return {
    id,
    campaignId,
    title,
    description,
    redirectUrl,
    status,
    targeting,
    metrics: { impressions: t.impressions, clicks: t.clicks, series },
    createdAt: now,
    updatedAt: now,
  };
}

export function buildSeedState(): AppState {
  const ads: Record<string, Ad> = {};
  const campaigns: Record<string, Campaign> = {};
  const campaignOrder: string[] = [];

  const now = new Date().toISOString();

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

  ads['a1'] = makeAd(
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
    1800
  );
  ads['a2'] = makeAd(
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
    1400
  );
  ads['a3'] = makeAd(
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
    950
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

  ads['a4'] = makeAd(
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
        { pref: 'glutenFree', priority: 'medium' },
      ],
      foodInterests: [
        { name: 'Tofu Stir-Fry', priority: 'high' },
        { name: 'Rice Bowl', priority: 'medium' },
      ],
      time: { range: { startHour: 11, endHour: 14 }, days: ['mon', 'tue', 'wed', 'thu', 'fri'] },
    },
    201,
    'active',
    1600
  );
  ads['a5'] = makeAd(
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
    1100
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

  ads['a6'] = makeAd(
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
    1300
  );
  ads['a7'] = makeAd(
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
    900
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

  ads['a8'] = makeAd(
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
    1500
  );
  ads['a9'] = makeAd(
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
    1700
  );

  return {
    campaigns,
    ads,
    campaignOrder,
    restaurant: { name: 'Boiler Bowl Co.' },
  };
}
