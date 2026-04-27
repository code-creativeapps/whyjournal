import type { Milestone } from '@/lib/milestones/types';

import type { Goal } from './types';

export function goalProgress(
  goal: Goal,
  milestones: Milestone[]
): { done: number; total: number; ratio: number } {
  const total = milestones.length;
  if (total === 0) {
    return { done: goal.done ? 1 : 0, total: 1, ratio: goal.done ? 1 : 0 };
  }
  const done = milestones.filter((m) => m.done).length;
  return { done, total, ratio: done / total };
}
