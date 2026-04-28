import type { Habit } from '@/lib/habits/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

export const useHabitsStore = createSimpleItemsStore<Habit>(
  createSupabaseRepository<Habit>('habits')
);
