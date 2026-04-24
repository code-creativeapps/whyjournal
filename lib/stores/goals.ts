import type { Goal } from '@/lib/goals/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';

export const useGoalsStore = createSimpleItemsStore<Goal>('goals:v1');
