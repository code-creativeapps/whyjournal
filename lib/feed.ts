import { format, isSameDay, isSameMonth, startOfDay, startOfMonth, subDays } from 'date-fns';

import type { Entry } from '@/lib/entries/types';

export type FeedItem =
  | { id: string; date: string; kind: 'entry'; entry: Entry }
  | { id: string; date: string; kind: 'habit' | 'todo' | 'milestone'; title: string };

export type FeedSection = {
  key: string;
  title: string;
  data: FeedItem[];
};

export function buildFeed(items: FeedItem[], now: Date = new Date()): FeedSection[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const sections = new Map<string, FeedSection>();
  for (const item of sorted) {
    const { key, title } = bucketFor(new Date(item.date), now);
    const existing = sections.get(key);
    if (existing) existing.data.push(item);
    else sections.set(key, { key, title, data: [item] });
  }
  return Array.from(sections.values());
}

function bucketFor(date: Date, now: Date): { key: string; title: string } {
  if (isSameMonth(date, now)) {
    const day = startOfDay(date);
    return { key: `day:${format(day, 'yyyy-MM-dd')}`, title: dayLabel(date, now) };
  }
  const month = startOfMonth(date);
  return { key: `month:${format(month, 'yyyy-MM')}`, title: format(month, 'MMMM yyyy') };
}

function dayLabel(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, subDays(now, 1))) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}
