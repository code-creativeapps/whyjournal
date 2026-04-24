import type { BucketItem } from '@/lib/bucket/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';

export const useBucketStore = createSimpleItemsStore<BucketItem>('bucket:v1');
