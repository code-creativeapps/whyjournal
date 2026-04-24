import type { BaseItem } from '@/lib/simple-items/factory';

export type Goal = BaseItem & {
  done: boolean;
  targetDate?: string;
  completedAt?: string;
  why?: string;
};

// Internal editor-only type used by the milestones UI inside the goal form.
// These are surfaced in the Todos section (each milestone is a linked Todo).
export type MilestoneDraft = {
  id: string;
  title: string;
  done: boolean;
};
