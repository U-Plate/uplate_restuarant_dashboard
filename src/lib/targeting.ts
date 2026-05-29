/*
 * Targeting summary helpers used by the ads table and other compact views.
 */

import type { Targeting } from '../types';
import {
  AUDIENCE_LABEL,
  DIETARY_LABEL,
  ALLERGY_LABEL,
} from '../data/constants';

/**
 * Plain-English summary of a Targeting object, suitable for a single line.
 * Returns "Untargeted" when nothing is set.
 *
 * Examples:
 *   "3 tags, 2 dietary, weekdays"
 *   "post-workout, no peanuts"
 *   "Untargeted"
 */
export function describeTargeting(t: Targeting): string {
  const parts: string[] = [];

  if (t.audienceTags.length > 0) {
    parts.push(`${t.audienceTags.length} tag${t.audienceTags.length === 1 ? '' : 's'}`);
  }
  if (t.dietary.length > 0) {
    parts.push(`${t.dietary.length} dietary`);
  }
  if (t.foodInterests.length > 0) {
    parts.push(`${t.foodInterests.length} food${t.foodInterests.length === 1 ? '' : 's'}`);
  }
  if (t.exclusions.length > 0) {
    parts.push(`no ${t.exclusions.length === 1 ? t.exclusions[0] : `${t.exclusions.length} allergens`}`);
  }

  const dayPart = describeDays(t.time.days);
  if (dayPart) parts.push(dayPart);

  if (t.time.range) {
    parts.push(`${formatHour(t.time.range.startHour)} to ${formatHour(t.time.range.endHour)}`);
  }

  if (t.behavioral.recurringCustomer) {
    parts.push('repeat customers');
  }

  if (parts.length === 0) return 'Untargeted';
  return parts.join(', ');
}

function describeDays(days: Targeting['time']['days']): string | null {
  if (days.length === 0 || days.length === 7) return null;
  const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'] as const;
  const weekend = ['sat', 'sun'] as const;
  const isWeekdays =
    days.length === weekdays.length && weekdays.every((d) => days.includes(d));
  const isWeekend = days.length === weekend.length && weekend.every((d) => days.includes(d));
  if (isWeekdays) return 'weekdays';
  if (isWeekend) return 'weekends';
  return `${days.length} day${days.length === 1 ? '' : 's'}`;
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

/**
 * Richer plain-English summary for the TargetingBuilder verdict line.
 * Returns a full sentence describing the audience and timing.
 *
 * Examples:
 *   "Reaches every UPlate user during open hours."
 *   "Targets high-protein, post-workout signals on a vegetarian audience,
 *    11am to 9pm weekdays."
 */
export function summarizeTargeting(t: Targeting): string {
  const subjects: string[] = [];

  if (t.audienceTags.length > 0) {
    const tags = t.audienceTags
      .map((r) => AUDIENCE_LABEL[r.tag]?.toLowerCase() ?? r.tag)
      .slice(0, 3);
    const more = t.audienceTags.length - tags.length;
    subjects.push(joinList(tags) + (more > 0 ? `, and ${more} more` : '') + ' signals');
  }

  if (t.dietary.length > 0) {
    const diets = t.dietary
      .map((r) => DIETARY_LABEL[r.pref]?.toLowerCase() ?? r.pref)
      .slice(0, 2);
    const more = t.dietary.length - diets.length;
    const suffix = more > 0 ? `, and ${more} more` : '';
    subjects.push(`a ${joinList(diets)}${suffix} audience`);
  }

  if (t.foodInterests.length > 0) {
    const items = t.foodInterests.map((r) => r.name).slice(0, 3);
    const more = t.foodInterests.length - items.length;
    subjects.push(
      `people who like ${joinList(items)}${more > 0 ? `, and ${more} more` : ''}`,
    );
  }

  if (t.behavioral.recurringCustomer) {
    subjects.push('recurring customers');
  }

  const exclusions =
    t.exclusions.length > 0
      ? `excludes ${joinList(t.exclusions.map((a) => ALLERGY_LABEL[a]?.toLowerCase() ?? a))}`
      : null;

  const timeClause = describeTimeClause(t);

  if (subjects.length === 0 && !exclusions && !timeClause) {
    return 'Reaches every UPlate user during open hours.';
  }

  let sentence = '';
  if (subjects.length > 0) {
    sentence = `Targets ${joinList(subjects, ' on ')}`;
  } else if (exclusions) {
    sentence = `Reaches everyone, ${exclusions}`;
  } else {
    sentence = 'Reaches every UPlate user';
  }

  if (timeClause) {
    sentence += `, ${timeClause}`;
  }

  if (exclusions && subjects.length > 0) {
    sentence += `, ${exclusions}`;
  }

  return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

function describeTimeClause(t: Targeting): string | null {
  const dayPart = describeDays(t.time.days);
  if (!t.time.range && !dayPart) return null;
  const range = t.time.range
    ? `${formatHour(t.time.range.startHour)} to ${formatHour(t.time.range.endHour)}`
    : null;
  if (range && dayPart) return `${range} ${dayPart}`;
  if (range) return range;
  return dayPart;
}

function joinList(items: string[], glue: string = ', '): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(glue === ' on ' ? ' on ' : ' and ');
  return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
}
