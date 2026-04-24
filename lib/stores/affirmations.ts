import type { Affirmation } from '@/lib/affirmations/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';

export const useAffirmationsStore = createSimpleItemsStore<Affirmation>('affirmations:v1');
