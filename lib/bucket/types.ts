import type { BaseItem } from '@/lib/simple-items/factory';

export type BucketItem = BaseItem & {
  done: boolean;
  completedAt?: string;
};
