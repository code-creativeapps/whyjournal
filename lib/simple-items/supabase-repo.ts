import { supabase } from '@/lib/supabase/client';

import type { AddInput, BaseItem, SimpleItemsRepository } from './factory';

/**
 * A generic Supabase repository for tables whose rows extend BaseItem.
 *
 * Column mapping:
 *  - DB columns are snake_case; the in-memory shape (T extends BaseItem) is camelCase.
 *  - `columns` is the explicit map from camelCase keys (in T) to snake_case column names
 *    in the table. Anything not listed is sent as-is (i.e. assumed identical names).
 *  - `id`, `createdAt` ↔ `created_at` are handled implicitly.
 *  - `user_id` is injected from the current Supabase auth session on insert.
 */
export type ColumnMap = Record<string, string>;

const DEFAULT_MAP: ColumnMap = {
  createdAt: 'created_at',
  completedAt: 'completed_at',
  targetDate: 'target_date',
  goalId: 'goal_id',
  milestoneId: 'milestone_id',
  dueAt: 'due_at',
  routineId: 'routine_id',
  habitId: 'habit_id',
  frequencyKind: 'frequency_kind',
  timesPerPeriod: 'times_per_period',
  daysOfWeek: 'days_of_week',
};

export function createSupabaseRepository<T extends BaseItem>(
  table: string,
  options: { columns?: ColumnMap } = {}
): SimpleItemsRepository<T> {
  const camelToSnake = { ...DEFAULT_MAP, ...(options.columns ?? {}) };
  const snakeToCamel: ColumnMap = Object.fromEntries(
    Object.entries(camelToSnake).map(([camel, snake]) => [snake, camel])
  );

  function toRow(input: Record<string, unknown>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value === undefined) continue;
      row[camelToSnake[key] ?? key] = value;
    }
    return row;
  }

  function fromRow(row: Record<string, unknown>): T {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null) continue;
      out[snakeToCamel[key] ?? key] = value;
    }
    return out as T;
  }

  async function getUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Not signed in');
    return data.user.id;
  }

  return {
    async list() {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => fromRow(row as Record<string, unknown>));
    },

    async add(input: AddInput<T>) {
      const userId = await getUserId();
      const row = toRow({ ...input, user_id: userId });
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return fromRow(data as Record<string, unknown>);
    },

    async update(id, patch) {
      const row = toRow(patch as Record<string, unknown>);
      const { data, error } = await supabase
        .from(table)
        .update(row)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return fromRow(data as Record<string, unknown>);
    },

    async remove(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}
