import type { BaseItem } from '@/lib/simple-items/factory';

export type Goal = BaseItem & {
  done: boolean;
  targetDate?: string;
  completedAt?: string;
  why?: string;
  reward?: string;
};

// Internal editor-only type used by the milestones UI inside the goal form.
// Persisted as rows in the `milestones` table on save.
export type MilestoneDraft = {
  id: string;
  title: string;
  done: boolean;
  position?: number;
  body?: string;
  targetDate?: string;
};
