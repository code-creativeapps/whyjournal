import type { BaseItem } from '@/lib/simple-items/factory';

export type Milestone = BaseItem & {
  goalId: string;
  done: boolean;
  completedAt?: string;
};
