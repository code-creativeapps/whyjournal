import type { Routine } from '@/lib/habits/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

// Routines reuse the SimpleItem shape — `title` holds the routine name,
// the `name` column in DB is mapped via the column override below.
export const useRoutinesStore = createSimpleItemsStore<Routine>(
  createSupabaseRepository<Routine>('routines', { columns: { title: 'name' } })
);
