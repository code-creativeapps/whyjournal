import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';
import type { Todo } from '@/lib/todos/types';

export const useTodosStore = createSimpleItemsStore<Todo>(
  createSupabaseRepository<Todo>('todos')
);
