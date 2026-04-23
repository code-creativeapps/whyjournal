import { format, startOfDay, subDays } from 'date-fns';

import type { Entry } from '@/lib/entries/types';

const DAY_FORMAT = 'yyyy-MM-dd';

export function currentStreak(entries: Entry[], now: Date = new Date()): number {
  if (entries.length === 0) return 0;

  const days = new Set(
    entries.map((e) => format(startOfDay(new Date(e.createdAt)), DAY_FORMAT))
  );

  let cursor = startOfDay(now);

  // Grace period: if nothing today but yesterday has an entry, start the
  // streak from yesterday so the count doesn't break before the day ends.
  if (!days.has(format(cursor, DAY_FORMAT))) {
    cursor = subDays(cursor, 1);
    if (!days.has(format(cursor, DAY_FORMAT))) return 0;
  }

  let streak = 0;
  while (days.has(format(cursor, DAY_FORMAT))) {
    streak++;
    cursor = subDays(cursor, 1);
  }
  return streak;
}
