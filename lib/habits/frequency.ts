import {
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
  subWeeks,
} from 'date-fns';

import type { Habit, HabitCompletion } from './types';

const DAY_FORMAT = 'yyyy-MM-dd';

/**
 * True when the habit is scheduled for today.
 *
 * - daily: every day (kept compatible with legacy rows that stored a subset).
 * - weekly: if `daysOfWeek` lists specific days, scheduled on those; otherwise
 *   "any day this week" (returns true).
 */
export function appliesToday(habit: Habit, now: Date = new Date()): boolean {
  if (habit.frequencyKind === 'daily') {
    if (habit.daysOfWeek.length === 0) return true;
    return habit.daysOfWeek.includes(now.getDay());
  }
  if (habit.daysOfWeek.length === 0 || habit.daysOfWeek.length === 7) return true;
  return habit.daysOfWeek.includes(now.getDay());
}

/**
 * Day-of-week indexes (0=Sun..6=Sat) the habit is scheduled for between
 * tomorrow and the end of this calendar week (Sunday). Empty if the habit is
 * already due today only or doesn't recur on specific days.
 */
export function upcomingDaysThisWeek(habit: Habit, now: Date = new Date()): number[] {
  const today = now.getDay();
  const days: number[] = [];
  // Walk forward through the remaining days of the week (Mon-start week).
  // We care about the next 6 days max.
  for (let offset = 1; offset <= 6; offset++) {
    const next = (today + offset) % 7;
    // Stop once we wrap past Sunday (end of ISO week with Mon-start).
    // We treat "this week" as the next 6 days regardless of week start to
    // keep the section meaningful regardless of weekday today is.
    if (habit.daysOfWeek.includes(next)) days.push(next);
  }
  return days;
}

function isInDay(iso: string, day: Date): boolean {
  return isSameDay(new Date(iso), day);
}

export function completionsToday(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): number {
  const day = startOfDay(now);
  return completions.filter(
    (c) => c.habitId === habit.id && isInDay(c.completedAt, day)
  ).length;
}

export function completionsThisWeek(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): number {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  return completions.filter((c) => {
    if (c.habitId !== habit.id) return false;
    const t = new Date(c.completedAt).getTime();
    return t >= start.getTime() && t <= end.getTime();
  }).length;
}

export type Progress = { done: number; target: number; ratio: number };

export function progressForToday(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): Progress {
  const target = habit.timesPerPeriod;
  const done =
    habit.frequencyKind === 'daily'
      ? completionsToday(habit, completions, now)
      : completionsThisWeek(habit, completions, now);
  return { done, target, ratio: target === 0 ? 0 : Math.min(done / target, 1) };
}

/**
 * Walk back through the periods (days for daily, weeks for weekly) and count
 * the consecutive ones that hit `timesPerPeriod`. The current period is allowed
 * to be incomplete without breaking the streak (grace period).
 */
export function currentStreak(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): number {
  const habitCompletions = completions.filter((c) => c.habitId === habit.id);
  if (habit.frequencyKind === 'daily') {
    return dailyStreak(habit, habitCompletions, now);
  }
  return weeklyStreak(habit, habitCompletions, now);
}

function dailyStreak(habit: Habit, completions: HabitCompletion[], now: Date): number {
  const dayCounts = new Map<string, number>();
  for (const c of completions) {
    const key = format(startOfDay(new Date(c.completedAt)), DAY_FORMAT);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  // Walk back day by day. Skip days that aren't in `daysOfWeek`. A scheduled day
  // that didn't hit the target ends the streak. Today gets a grace pass.
  let streak = 0;
  let cursor = startOfDay(now);
  let isFirstScheduled = true;
  // Hard cap to avoid pathological loops.
  for (let i = 0; i < 365 * 3; i++) {
    const dow = cursor.getDay();
    if (habit.daysOfWeek.includes(dow)) {
      const key = format(cursor, DAY_FORMAT);
      const count = dayCounts.get(key) ?? 0;
      const hit = count >= habit.timesPerPeriod;
      if (hit) {
        streak++;
      } else if (!isFirstScheduled) {
        // A past scheduled day that didn't meet target — streak breaks here.
        break;
      }
      isFirstScheduled = false;
    }
    cursor = subDays(cursor, 1);
  }
  return streak;
}

function weeklyStreak(habit: Habit, completions: HabitCompletion[], now: Date): number {
  const weekCounts = new Map<string, number>();
  for (const c of completions) {
    const key = format(startOfWeek(new Date(c.completedAt), { weekStartsOn: 1 }), DAY_FORMAT);
    weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
  }

  let streak = 0;
  let cursor = startOfWeek(now, { weekStartsOn: 1 });
  for (let i = 0; i < 200; i++) {
    const key = format(cursor, DAY_FORMAT);
    const count = weekCounts.get(key) ?? 0;
    const hit = count >= habit.timesPerPeriod;
    if (hit) {
      streak++;
    } else if (i > 0) {
      // Past week didn't hit target.
      break;
    }
    cursor = subWeeks(cursor, 1);
  }
  return streak;
}

/**
 * Returns the last 7 calendar days as ISO date strings (oldest first), each
 * with a `hit` flag indicating whether the habit's per-day target was met.
 * For weekly habits, the flag means "at least one completion that day" since
 * weekly targets aren't meaningful per-day.
 */
export function last7Days(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): { date: string; hit: boolean; count: number }[] {
  const dayCounts = new Map<string, number>();
  for (const c of completions) {
    if (c.habitId !== habit.id) continue;
    const key = format(startOfDay(new Date(c.completedAt)), DAY_FORMAT);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const days: { date: string; hit: boolean; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(startOfDay(now), i);
    const key = format(d, DAY_FORMAT);
    const count = dayCounts.get(key) ?? 0;
    const target = habit.frequencyKind === 'daily' ? habit.timesPerPeriod : 1;
    days.push({ date: key, count, hit: count >= target });
  }
  return days;
}
