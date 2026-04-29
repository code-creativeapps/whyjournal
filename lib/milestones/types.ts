import type { BaseItem } from '@/lib/simple-items/factory';

export type Milestone = BaseItem & {
  goalId: string;
  done: boolean;
  completedAt?: string;
  position?: number;
  body?: string;
  targetDate?: string;
  reward?: string;
};
