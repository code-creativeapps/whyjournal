import type { Milestone } from '@/lib/milestones/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

export const useMilestonesStore = createSimpleItemsStore<Milestone>(
  createSupabaseRepository<Milestone>('milestones')
);
