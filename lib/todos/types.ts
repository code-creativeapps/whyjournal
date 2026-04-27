import type { BaseItem } from '@/lib/simple-items/factory';

export type Todo = BaseItem & {
  done: boolean;
  completedAt?: string;
  /** Local-day ISO string (YYYY-MM-DD) representing when this todo is due. */
  dueAt?: string;
};
