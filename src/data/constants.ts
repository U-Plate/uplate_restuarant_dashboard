import type {
  AudienceTag,
  DietaryPreference,
  Allergy,
  Priority,
  DayOfWeek,
} from '../types';

export const AUDIENCE_TAGS: { value: AudienceTag; label: string; hint: string }[] = [
  { value: 'highProtein', label: 'High Protein', hint: 'Users tracking protein intake' },
  { value: 'highCarb', label: 'High Carb', hint: 'Carb-focused fueling' },
  { value: 'postWorkout', label: 'Post-Workout', hint: 'Within 2h of gym activity' },
  { value: 'lowCalorie', label: 'Low Calorie', hint: 'Calorie-conscious choices' },
  { value: 'macroFriendly', label: 'Macro Friendly', hint: 'Balanced macro splits' },
];

export const DIETARY_PREFS: { value: DietaryPreference; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'glutenFree', label: 'Gluten-Free' },
  { value: 'dairyFree', label: 'Dairy-Free' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'kosher', label: 'Kosher' },
  { value: 'halal', label: 'Halal' },
];

export const ALLERGIES: { value: Allergy; label: string }[] = [
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'treeNuts', label: 'Tree Nuts' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'soy', label: 'Soy' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'wheat', label: 'Wheat' },
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
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  glutenFree: 'Gluten-Free',
  dairyFree: 'Dairy-Free',
  pescatarian: 'Pescatarian',
  kosher: 'Kosher',
  halal: 'Halal',
};

export const ALLERGY_LABEL: Record<Allergy, string> = {
  peanuts: 'Peanuts',
  treeNuts: 'Tree Nuts',
  shellfish: 'Shellfish',
  eggs: 'Eggs',
  soy: 'Soy',
  dairy: 'Dairy',
  wheat: 'Wheat',
};
