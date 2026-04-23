import { format, isSameDay, isSameMonth, startOfDay, startOfMonth, subDays } from 'date-fns';

import type { Entry } from '@/lib/entries/types';

export type EntrySection = {
  key: string;
  title: string;
  data: Entry[];
};

export function groupEntries(entries: Entry[], now: Date = new Date()): EntrySection[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sections = new Map<string, EntrySection>();

  for (const entry of sorted) {
    const created = new Date(entry.createdAt);
    const { key, title } = bucketFor(created, now);
    const existing = sections.get(key);
    if (existing) {
      existing.data.push(entry);
    } else {
      sections.set(key, { key, title, data: [entry] });
    }
  }

  return Array.from(sections.values());
}

function bucketFor(date: Date, now: Date): { key: string; title: string } {
  if (isSameMonth(date, now)) {
    const day = startOfDay(date);
    const key = `day:${format(day, 'yyyy-MM-dd')}`;
    return { key, title: dayLabel(date, now) };
  }

  const month = startOfMonth(date);
  return {
    key: `month:${format(month, 'yyyy-MM')}`,
    title: format(month, 'MMMM yyyy'),
  };
}

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, subDays(now, 1))) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}
