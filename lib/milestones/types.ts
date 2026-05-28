import type { BaseItem } from '@/lib/simple-items/factory';

export type Milestone = BaseItem & {
  goalId: string;
  done: boolean;
  completedAt?: string;
  position?: number;
  body?: string;
  targetDate?: string;
  reward?: string;
  /** Recurring monthly target. */
  monthly?: boolean;
  /** YYYY-MM this instance represents (monthly only). */
  periodMonth?: string;
  /** Groups the monthly instances of the same recurring target. */
  seriesId?: string;
};
