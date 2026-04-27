import type { BucketItem } from '@/lib/bucket/types';
import { createSimpleItemsStore } from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

export const useBucketStore = createSimpleItemsStore<BucketItem>(
  createSupabaseRepository<BucketItem>('bucket_items')
);
