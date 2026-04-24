import type { Trophy } from '@/lib/trophies/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';

export const useTrophiesStore = createSimpleItemsStore<Trophy>('trophies:v1');
