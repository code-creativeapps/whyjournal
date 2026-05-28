import type { BaseItem } from '@/lib/simple-items/factory';

/**
 * Habit shape. `body` is the optional description.
 *
 * `timesPerWeek` (1..7) is the only frequency dial. If `fixedDays` is set,
 * the habit is scheduled on those specific weekdays (0=Sun..6=Sat); when
 * `fixedDays` is omitted the habit can be done on any day of the week.
 *
 * Examples:
 *   timesPerWeek=7                          → every day
 *   timesPerWeek=3, fixedDays=[1,3,5]       → Mon/Wed/Fri
 *   timesPerWeek=6                          → 6× per week, any day
 *   timesPerWeek=1                          → once a week
 *   timesPerWeek=1, fixedDays=[6]           → once a week, prefer Saturday
 */
export type Habit = BaseItem & {
  timesPerWeek: number;
  fixedDays?: number[];
  routineId?: string;
  goalId?: string;
};

export type Routine = BaseItem & {
  // `name` lives in BaseItem.title; we keep the SimpleItem shape for the factory.
};

export type HabitCompletion = {
  id: string;
  habitId: string;
  completedAt: string;
};
