import type { Goal } from '@/lib/goals/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

export const useGoalsStore = createSimpleItemsStore<Goal>(
  createSupabaseRepository<Goal>('goals')
);
