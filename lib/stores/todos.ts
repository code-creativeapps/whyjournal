import type { Todo } from '@/lib/todos/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';

export const useTodosStore = createSimpleItemsStore<Todo>('todos:v1');
