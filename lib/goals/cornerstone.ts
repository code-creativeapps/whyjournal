import { useGoalsStore } from '@/lib/stores/goals';

/**
 * Mark `id` as the user's cornerstone goal. Clears the flag on any other
 * goal first, since the DB partial-unique index allows only one row per
 * user with `is_cornerstone = true`.
 */
export async function setCornerstone(id: string): Promise<void> {
  const { items, updateItem } = useGoalsStore.getState();
  for (const g of items) {
    if (g.id !== id && g.isCornerstone) {
      await updateItem(g.id, { isCornerstone: false });
    }
  }
  await updateItem(id, { isCornerstone: true });
}

export async function clearCornerstone(id: string): Promise<void> {
  await useGoalsStore.getState().updateItem(id, { isCornerstone: false });
}
