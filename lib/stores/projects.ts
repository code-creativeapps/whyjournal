import type { Project } from '@/lib/projects/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

export const useProjectsStore = createSimpleItemsStore<Project>(
  createSupabaseRepository<Project>('projects')
);
