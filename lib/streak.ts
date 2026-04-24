import { format, startOfDay, subDays } from 'date-fns';

import type { Entry } from '@/lib/entries/types';

const DAY_FORMAT = 'yyyy-MM-dd';

function dayKeys(entries: Entry[]): Set<string> {
  return new Set(
    entries.map((e) => format(startOfDay(new Date(e.createdAt)), DAY_FORMAT))
  );
}

export function currentStreak(entries: Entry[], now: Date = new Date()): number {
  if (entries.length === 0) return 0;
  const days = dayKeys(entries);
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

export function bestStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0;
  const sortedDays = Array.from(dayKeys(entries)).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
    if (diff === 1) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

export function totalDaysLogged(entries: Entry[]): number {
  return dayKeys(entries).size;
}
