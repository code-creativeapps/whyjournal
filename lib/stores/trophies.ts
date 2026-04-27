import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';
import type { Trophy } from '@/lib/trophies/types';

export const useTrophiesStore = createSimpleItemsStore<Trophy>(
  createSupabaseRepository<Trophy>('trophies', { columns: { when: 'when' } })
);
