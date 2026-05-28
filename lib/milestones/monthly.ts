import { format, parse } from 'date-fns';

import type { Milestone } from './types';

/** "2026-05" → "May". */
export function monthLabel(periodMonth: string): string {
  const d = parse(periodMonth, 'yyyy-MM', new Date());
  return format(d, 'MMMM');
}

/**
 * For each monthly milestone series in `milestones`, make sure an instance
 * exists for the current month — spawning a fresh one (copied from the most
 * recent instance) if the latest is for a past month. Past instances are left
 * untouched so their own done state / linked work is preserved.
 */
export function ensureMonthlyMilestones(
  milestones: Milestone[],
  addItem: (input: Omit<Milestone, 'id' | 'createdAt'>) => Promise<Milestone>
): void {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const bySeries = new Map<string, Milestone[]>();
  for (const m of milestones) {
    if (!m.monthly) continue;
    const sid = m.seriesId ?? m.id;
    const arr = bySeries.get(sid) ?? [];
    arr.push(m);
    bySeries.set(sid, arr);
  }
  for (const [sid, arr] of bySeries) {
    if (arr.some((m) => (m.periodMonth ?? '') === currentMonth)) continue;
    const template = arr
      .slice()
      .sort((a, b) => (b.periodMonth ?? '').localeCompare(a.periodMonth ?? ''))[0];
    addItem({
      goalId: template.goalId,
      title: template.title,
      body: template.body,
      reward: template.reward,
      monthly: true,
      periodMonth: currentMonth,
      seriesId: sid,
      done: false,
    } as Omit<Milestone, 'id' | 'createdAt'>).catch(() => {});
  }
}
