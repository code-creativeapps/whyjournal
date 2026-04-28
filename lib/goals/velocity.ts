import { format, startOfDay, subDays } from 'date-fns';

import type { Habit, HabitCompletion } from '@/lib/habits/types';
import type { Milestone } from '@/lib/milestones/types';
import type { Todo } from '@/lib/todos/types';

const DAY_FORMAT = 'yyyy-MM-dd';

export type VelocityDay = { date: string; count: number };

/**
 * Counts of "actions taken toward this goal" per day, oldest-to-newest, for
 * the last `days` calendar days (default 14). An action is any of:
 *   - milestone marked done (milestones.completedAt) attached to this goal
 *   - todo marked done (todos.completedAt) attached to this goal
 *   - habit completion for any habit whose habit.goalId === goal.id
 */
export function goalVelocity(opts: {
  goalId: string;
  milestones: Milestone[];
  todos: Todo[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  days?: number;
  now?: Date;
}): VelocityDay[] {
  const days = opts.days ?? 14;
  const now = opts.now ?? new Date();
  const habitsForGoal = new Set(
    opts.habits.filter((h) => h.goalId === opts.goalId).map((h) => h.id)
  );

  const counts = new Map<string, number>();
  const bump = (iso?: string) => {
    if (!iso) return;
    const key = format(startOfDay(new Date(iso)), DAY_FORMAT);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  for (const m of opts.milestones) {
    if (m.goalId === opts.goalId && m.done) bump(m.completedAt);
  }
  for (const t of opts.todos) {
    if (t.goalId === opts.goalId && t.done) bump(t.completedAt);
  }
  for (const c of opts.habitCompletions) {
    if (habitsForGoal.has(c.habitId)) bump(c.completedAt);
  }

  const out: VelocityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = subDays(startOfDay(now), i);
    const key = format(d, DAY_FORMAT);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}
