import type {
  AdLocation,
  AudienceTag,
  DietaryPreference,
  Allergy,
  Priority,
  DayOfWeek,
} from '../types';

// School this dashboard's account is scoped to. Schools are owned by the live
// backend (slugs like 'purdue'); the frontend + mock only reference the id.
// One school per account: campaigns inherit it, the restaurant never picks it.
export const DEMO_SCHOOL_ID = 'purdue';

export const AUDIENCE_TAGS: { value: AudienceTag; label: string; hint: string }[] = [
  { value: 'highProtein', label: 'High Protein', hint: 'Users tracking protein intake' },
  { value: 'highCarb', label: 'High Carb', hint: 'Carb-focused fueling' },
  { value: 'postWorkout', label: 'Post-Workout', hint: 'Within 2h of gym activity' },
  { value: 'lowCalorie', label: 'Low Calorie', hint: 'Calorie-conscious choices' },
  { value: 'macroFriendly', label: 'Macro Friendly', hint: 'Balanced macro splits' },
];

export const DIETARY_PREFS: { value: DietaryPreference; label: string }[] = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

export const ALLERGIES: { value: Allergy; label: string }[] = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'nuts', label: 'Nuts' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'soy', label: 'Soy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'fish', label: 'Fish' },
  { value: 'treeNuts', label: 'Tree Nuts' },
  { value: 'coconut', label: 'Coconut' },
  { value: 'sesame', label: 'Sesame' },
];

export const PRIORITIES: { value: Priority; label: string; weight: number }[] = [
  { value: 'required', label: 'Required', weight: 4 },
  { value: 'high', label: 'High', weight: 3 },
  { value: 'medium', label: 'Medium', weight: 2 },
  { value: 'low', label: 'Low', weight: 1 },
];

export const DAYS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: 'mon', label: 'Monday', short: 'M' },
  { value: 'tue', label: 'Tuesday', short: 'T' },
  { value: 'wed', label: 'Wednesday', short: 'W' },
  { value: 'thu', label: 'Thursday', short: 'T' },
  { value: 'fri', label: 'Friday', short: 'F' },
  { value: 'sat', label: 'Saturday', short: 'S' },
  { value: 'sun', label: 'Sunday', short: 'S' },
];

export const FOOD_INTEREST_SUGGESTIONS: string[] = [
  'Acai Bowl',
  'Avocado Toast',
  'Burrito',
  'Caesar Salad',
  'Chicken Wrap',
  'Cold Brew',
  'Croissant',
  'Falafel',
  'Greek Yogurt',
  'Grilled Salmon',
  'Hummus Bowl',
  'Kale Smoothie',
  'Matcha Latte',
  'Oat Bowl',
  'Pad Thai',
  'Pasta Primavera',
  'Pita Wrap',
  'Poke Bowl',
  'Protein Shake',
  'Quinoa Bowl',
  'Ramen',
  'Rice Bowl',
  'Spinach Salad',
  'Sushi Roll',
  'Sweet Potato',
  'Tacos',
  'Tofu Stir-Fry',
  'Turkey Sandwich',
  'Veggie Burger',
  'Wrap',
];

export const PRIORITY_LABEL: Record<Priority, string> = {
  required: 'Required',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const AUDIENCE_LABEL: Record<AudienceTag, string> = {
  highProtein: 'High Protein',
  highCarb: 'High Carb',
  postWorkout: 'Post-Workout',
  lowCalorie: 'Low Calorie',
  macroFriendly: 'Macro Friendly',
};

export const DIETARY_LABEL: Record<DietaryPreference, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  pescatarian: 'Pescatarian',
  halal: 'Halal',
  kosher: 'Kosher',
};

export const AD_LOCATIONS: { value: AdLocation; label: string; hint: string }[] = [
  {
    value: 'homeScreen',
    label: 'Home Screen',
    hint: 'Full-card ad shown on the app home feed.',
  },
  {
    value: 'diningHallMenu',
    label: 'Dining Hall Menu',
    hint: 'Compact banner shown inside dining hall menus.',
  },
];

export const AD_LOCATION_LABEL: Record<AdLocation, string> = {
  homeScreen: 'Home Screen',
  diningHallMenu: 'Dining Hall Menu',
};

export const ALLERGY_LABEL: Record<Allergy, string> = {
  gluten: 'Gluten',
  dairy: 'Dairy',
  nuts: 'Nuts',
  shellfish: 'Shellfish',
  soy: 'Soy',
  eggs: 'Eggs',
  peanuts: 'Peanuts',
  wheat: 'Wheat',
  fish: 'Fish',
  treeNuts: 'Tree Nuts',
  coconut: 'Coconut',
  sesame: 'Sesame',
};
