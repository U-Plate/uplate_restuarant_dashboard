export type Priority = 'required' | 'high' | 'medium' | 'low';

export type AudienceTag =
  | 'highProtein'
  | 'highCarb'
  | 'postWorkout'
  | 'lowCalorie'
  | 'macroFriendly';

export type DietaryPreference =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'halal'
  | 'kosher';

export type Allergy =
  | 'gluten'
  | 'dairy'
  | 'nuts'
  | 'shellfish'
  | 'soy'
  | 'eggs'
  | 'peanuts'
  | 'wheat'
  | 'fish'
  | 'treeNuts'
  | 'coconut'
  | 'sesame';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type Status = 'active' | 'paused';

export type AdLocation = 'homeScreen' | 'diningHallMenu';

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

export type AdEventType = 'impression' | 'click';

// One row per impression or click. Multi-valued audience signals
// (tags / dietary / foodInterests) snapshot what the viewer matched at the
// moment of the event — same shape the wire contract documents in
// backend.md (`ad_events` + `ad_event_tags` / `ad_event_dietary` /
// `ad_event_food_interests`). All analytics aggregates in the app fall out
// of GROUP BY over these rows.
export interface AdEvent {
  id: string;
  adId: string;
  type: AdEventType;
  occurredAt: string; // ISO timestamp
  userId?: string;
  recurringCustomer: boolean;
  tags: AudienceTag[];
  dietary: DietaryPreference[];
  foodInterests: string[];
}

export interface Ad {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  redirectUrl: string;
  iconUrl?: string;
  status: Status;
  location: AdLocation;
  targeting: Targeting;
  metrics: AdMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface RestaurantNotifications {
  weekly: boolean;
  emailAlerts: boolean;
}

export interface RestaurantProfile {
  name?: string;
  iconUrl?: string;
  contactEmail?: string;
  notifications?: RestaurantNotifications;
}

export interface Campaign {
  id: string;
  /** Campus this campaign's ads serve to. Inherited from the account (set via the
   *  access code at registration); the dashboard never sets or edits it. */
  schoolId: string;
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
  events: AdEvent[];
  campaignOrder: string[];
  restaurant: RestaurantProfile;
}
