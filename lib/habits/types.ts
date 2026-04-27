import type { BaseItem } from '@/lib/simple-items/factory';

export type FrequencyKind = 'daily' | 'weekly';

/**
 * Habit shape. `body` is the optional description.
 *
 * For daily habits: `daysOfWeek` (0=Sun..6=Sat) lists active days.
 * Length 7 means "every day". For weekly habits, daysOfWeek is ignored
 * (the user just wants to do it `timesPerPeriod` times in a week).
 */
export type Habit = BaseItem & {
  frequencyKind: FrequencyKind;
  timesPerPeriod: number;
  daysOfWeek: number[];
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
