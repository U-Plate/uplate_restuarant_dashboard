export type Priority = 'required' | 'high' | 'medium' | 'low';

export type AudienceTag =
  | 'highProtein'
  | 'highCarb'
  | 'postWorkout'
  | 'lowCalorie'
  | 'macroFriendly';

export type DietaryPreference =
  | 'vegetarian'
  | 'vegan'
  | 'glutenFree'
  | 'dairyFree'
  | 'kosher'
  | 'halal'
  | 'pescatarian';

export type Allergy =
  | 'peanuts'
  | 'treeNuts'
  | 'shellfish'
  | 'eggs'
  | 'soy'
  | 'dairy'
  | 'wheat';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type Status = 'active' | 'paused';

export interface AudienceTagRule {
  tag: AudienceTag;
  priority: Priority;
}

export interface DietaryRule {
  pref: DietaryPreference;
  priority: Priority;
}

export interface FoodInterestRule {
  name: string;
  priority: Priority;
}

export interface TimeRange {
  startHour: number;
  endHour: number;
}

export interface BehavioralTargeting {
  recurringCustomer: boolean;
  recurringPriority: Priority;
}

export interface TimeTargeting {
  range: TimeRange | null;
  days: DayOfWeek[];
}

export interface Targeting {
  audienceTags: AudienceTagRule[];
  dietary: DietaryRule[];
  foodInterests: FoodInterestRule[];
  exclusions: Allergy[];
  behavioral: BehavioralTargeting;
  time: TimeTargeting;
}

export interface AnalyticsPoint {
  date: string;
  impressions: number;
  clicks: number;
}

export interface AdMetrics {
  impressions: number;
  clicks: number;
  series: AnalyticsPoint[];
}

export interface Ad {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  redirectUrl: string;
  creativeUrl?: string;
  iconUrl?: string;
  status: Status;
  targeting: Targeting;
  metrics: AdMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantProfile {
  name?: string;
  iconUrl?: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: Status;
  startDate: string;
  endDate: string;
  adIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  campaigns: Record<string, Campaign>;
  ads: Record<string, Ad>;
  campaignOrder: string[];
  restaurant: RestaurantProfile;
}
