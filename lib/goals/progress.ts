import type { Goal } from './types';
import type { Todo } from '@/lib/todos/types';

export function goalProgress(
  goal: Goal,
  linkedTodos: Todo[]
): { done: number; total: number; ratio: number } {
  const total = linkedTodos.length;
  if (total === 0) {
    return { done: goal.done ? 1 : 0, total: 1, ratio: goal.done ? 1 : 0 };
  }
  const done = linkedTodos.filter((t) => t.done).length;
  return { done, total, ratio: done / total };
}
