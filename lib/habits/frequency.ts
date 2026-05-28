import {
  addDays,
  addWeeks,
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

/** True when the habit is scheduled today (no fixedDays = any day). */
export function appliesToday(habit: Habit, now: Date = new Date()): boolean {
  if (!habit.fixedDays || habit.fixedDays.length === 0) return true;
  return habit.fixedDays.includes(now.getDay());
}

/**
 * Day-of-week indexes (0=Sun..6=Sat) the habit is scheduled for between
 * tomorrow and 6 days from now. Empty if the habit has no fixed days.
 */
export function upcomingDaysThisWeek(habit: Habit, now: Date = new Date()): number[] {
  if (!habit.fixedDays || habit.fixedDays.length === 0) return [];
  const today = now.getDay();
  const days: number[] = [];
  for (let offset = 1; offset <= 6; offset++) {
    const next = (today + offset) % 7;
    if (habit.fixedDays.includes(next)) days.push(next);
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

/** Distinct days this week (Mon–Sun) on which the habit was completed. */
export function daysDoneThisWeek(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): number {
  const start = startOfWeek(now, { weekStartsOn: 1 });
  const end = endOfWeek(now, { weekStartsOn: 1 });
  const seen = new Set<string>();
  for (const c of completions) {
    if (c.habitId !== habit.id) continue;
    const t = new Date(c.completedAt).getTime();
    if (t < start.getTime() || t > end.getTime()) continue;
    seen.add(format(startOfDay(new Date(c.completedAt)), DAY_FORMAT));
  }
  return seen.size;
}

export type Progress = { done: number; target: number; ratio: number };

/** Progress against `timesPerWeek` for the current ISO week. */
export function progressThisWeek(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): Progress {
  const target = Math.max(1, habit.timesPerWeek);
  const done = daysDoneThisWeek(habit, completions, now);
  return { done, target, ratio: Math.min(done / target, 1) };
}

/** True when the habit has met its weekly target. */
export function isWeekHit(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): boolean {
  return daysDoneThisWeek(habit, completions, now) >= habit.timesPerWeek;
}

/**
 * Current streak.
 *
 * - timesPerWeek === 7: consecutive days completed, walking back from today.
 *   Today is allowed to be incomplete without breaking the streak.
 * - timesPerWeek < 7: consecutive weeks that hit `timesPerWeek`, walking back
 *   from this week. The current week is allowed to be incomplete.
 *
 * If fixedDays is set, only days listed there count for the daily walk; a
 * non-scheduled day is skipped (neither extends nor breaks the streak).
 */
export function currentStreak(
  habit: Habit,
  completions: HabitCompletion[],
  now: Date = new Date()
): number {
  const habitCompletions = completions.filter((c) => c.habitId === habit.id);
  const fixed = habit.fixedDays;

  if (habit.timesPerWeek === 7) {
    const dayDone = new Set<string>();
    for (const c of habitCompletions) {
      dayDone.add(format(startOfDay(new Date(c.completedAt)), DAY_FORMAT));
    }
    let streak = 0;
    let cursor = startOfDay(now);
    let isFirst = true;
    for (let i = 0; i < 365 * 3; i++) {
      const dow = cursor.getDay();
      const scheduled = !fixed || fixed.length === 0 || fixed.includes(dow);
      if (scheduled) {
        const key = format(cursor, DAY_FORMAT);
        if (dayDone.has(key)) {
          streak++;
        } else if (!isFirst) {
          break;
        }
        isFirst = false;
      }
      cursor = subDays(cursor, 1);
    }
    return streak;
  }

  // Weekly streak: count consecutive weeks meeting timesPerWeek.
  const weekHits = new Map<string, number>();
  for (const c of habitCompletions) {
    const wkKey = format(
      startOfWeek(new Date(c.completedAt), { weekStartsOn: 1 }),
      DAY_FORMAT
    );
    const dayKey = `${wkKey}|${format(startOfDay(new Date(c.completedAt)), DAY_FORMAT)}`;
    if (!weekHits.has(dayKey)) {
      weekHits.set(dayKey, 1);
      weekHits.set(wkKey, (weekHits.get(wkKey) ?? 0) + 1);
    }
  }

  let streak = 0;
  let cursor = startOfWeek(now, { weekStartsOn: 1 });
  for (let i = 0; i < 200; i++) {
    const key = format(cursor, DAY_FORMAT);
    const hit = (weekHits.get(key) ?? 0) >= habit.timesPerWeek;
    if (hit) {
      streak++;
    } else if (i > 0) {
      break;
    }
    cursor = subWeeks(cursor, 1);
  }
  return streak;
}

/** Longest streak the habit has ever achieved (same definition as currentStreak). */
export function longestStreak(habit: Habit, completions: HabitCompletion[]): number {
  const habitCompletions = completions.filter((c) => c.habitId === habit.id);
  if (habitCompletions.length === 0) return 0;
  const earliest = habitCompletions.reduce<Date>((min, c) => {
    const d = new Date(c.completedAt);
    return d < min ? d : min;
  }, new Date(habitCompletions[0].completedAt));

  if (habit.timesPerWeek === 7) {
    const dayDone = new Set<string>();
    for (const c of habitCompletions) {
      dayDone.add(format(startOfDay(new Date(c.completedAt)), DAY_FORMAT));
    }
    const fixed = habit.fixedDays;
    let max = 0;
    let current = 0;
    let cursor = startOfDay(earliest);
    const end = startOfDay(new Date());
    while (cursor.getTime() <= end.getTime()) {
      const dow = cursor.getDay();
      const scheduled = !fixed || fixed.length === 0 || fixed.includes(dow);
      if (scheduled) {
        const key = format(cursor, DAY_FORMAT);
        if (dayDone.has(key)) {
          current++;
          if (current > max) max = current;
        } else {
          current = 0;
        }
      }
      cursor = addDays(cursor, 1);
    }
    return max;
  }

  // Weekly: count distinct days per week then check against target.
  const weekDays = new Map<string, Set<string>>();
  for (const c of habitCompletions) {
    const wkKey = format(
      startOfWeek(new Date(c.completedAt), { weekStartsOn: 1 }),
      DAY_FORMAT
    );
    const dayKey = format(startOfDay(new Date(c.completedAt)), DAY_FORMAT);
    let set = weekDays.get(wkKey);
    if (!set) {
      set = new Set<string>();
      weekDays.set(wkKey, set);
    }
    set.add(dayKey);
  }
  let max = 0;
  let current = 0;
  let cursor = startOfWeek(earliest, { weekStartsOn: 1 });
  const end = startOfWeek(new Date(), { weekStartsOn: 1 });
  while (cursor.getTime() <= end.getTime()) {
    const key = format(cursor, DAY_FORMAT);
    const hit = (weekDays.get(key)?.size ?? 0) >= habit.timesPerWeek;
    if (hit) {
      current++;
      if (current > max) max = current;
    } else {
      current = 0;
    }
    cursor = addWeeks(cursor, 1);
  }
  return max;
}

/**
 * Returns the last 7 calendar days (oldest first), each with a `hit` flag
 * indicating whether the habit was completed at least once that day.
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
    days.push({ date: key, count, hit: count >= 1 });
  }
  return days;
}
