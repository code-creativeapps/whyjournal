import type { BaseItem } from '@/lib/simple-items/factory';

export type Todo = BaseItem & {
  done: boolean;
  completedAt?: string;
  /** Local-day ISO string (YYYY-MM-DD) representing when this todo is due. */
  dueAt?: string;
  /** At most one of these is set — see todos_one_parent CHECK in the schema. */
  goalId?: string;
  milestoneId?: string;
};
