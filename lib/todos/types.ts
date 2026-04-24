import type { BaseItem } from '@/lib/simple-items/factory';

export type Todo = BaseItem & {
  done: boolean;
  completedAt?: string;
  goalId?: string;
};
