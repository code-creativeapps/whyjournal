import type { BaseItem } from '@/lib/simple-items/factory';

/**
 * A project always belongs to a goal and may optionally link to one of that
 * goal's milestones to declare "this workstream contributes to that marker."
 * Tasks (`todos.project_id`) belong to the project — never directly to the
 * goal or milestone in the new model.
 */
export type Project = BaseItem & {
  goalId: string;
  milestoneId?: string;
  done: boolean;
  completedAt?: string;
  position?: number;
};
