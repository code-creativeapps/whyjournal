import type { Affirmation } from '@/lib/affirmations/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

export const useAffirmationsStore = createSimpleItemsStore<Affirmation>(
  createSupabaseRepository<Affirmation>('affirmations')
);
