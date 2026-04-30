import type { BaseItem } from '@/lib/simple-items/factory';

export type Todo = BaseItem & {
  done: boolean;
  completedAt?: string;
  /** Local-day ISO string (YYYY-MM-DD) representing when this todo is due. */
  dueAt?: string;
  /**
   * The new model: tasks belong to a project (always). `goalId` /
   * `milestoneId` remain on legacy rows created before projects existed.
   */
  projectId?: string;
  goalId?: string;
  milestoneId?: string;
};
