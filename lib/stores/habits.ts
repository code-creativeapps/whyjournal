import type { Habit } from '@/lib/habits/types';
import {
  createSimpleItemsStore,
  type AddInput,
  type BaseItem,
  type SimpleItemsRepository,
} from '@/lib/simple-items/factory';
import { createSupabaseRepository } from '@/lib/simple-items/supabase-repo';

// The DB still has the old columns: frequency_kind, times_per_period,
// days_of_week. The app uses the simpler model: timesPerWeek + optional
// fixedDays. We translate at the repo boundary so the rest of the app
// never sees the legacy fields, and old rows keep working without a
// schema migration.
type LegacyHabitRow = BaseItem & {
  frequencyKind?: 'daily' | 'weekly';
  timesPerPeriod?: number;
  daysOfWeek?: number[];
  routineId?: string;
  goalId?: string;
};

function rowToHabit(row: LegacyHabitRow): Habit {
  const kind = row.frequencyKind ?? 'daily';
  const tpp = row.timesPerPeriod ?? 1;
  const days = row.daysOfWeek ?? [];
  let timesPerWeek: number;
  let fixedDays: number[] | undefined;
  if (kind === 'daily') {
    // "daily" historically meant "scheduled on these weekdays". Length 0 or 7
    // = every day. A subset (e.g. M/W/F) means fixed days.
    if (days.length === 0 || days.length === 7) {
      timesPerWeek = 7;
      fixedDays = undefined;
    } else {
      timesPerWeek = days.length;
      fixedDays = [...days].sort((a, b) => a - b);
    }
  } else {
    // weekly: timesPerPeriod is the count; daysOfWeek (if any) is a hint.
    timesPerWeek = clamp(tpp, 1, 7);
    if (days.length > 0 && days.length < 7) {
      fixedDays = [...days].sort((a, b) => a - b);
    }
  }
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt,
    routineId: row.routineId,
    goalId: row.goalId,
    timesPerWeek,
    fixedDays,
  };
}

function habitToRow(input: Partial<Habit>): Partial<LegacyHabitRow> {
  const out: Partial<LegacyHabitRow> = {};
  if (input.title !== undefined) out.title = input.title;
  if (input.body !== undefined) out.body = input.body;
  if (input.routineId !== undefined) out.routineId = input.routineId;
  if (input.goalId !== undefined) out.goalId = input.goalId;
  if (input.timesPerWeek !== undefined) {
    const tpw = clamp(input.timesPerWeek, 1, 7);
    const fixed = input.fixedDays;
    if (fixed && fixed.length > 0 && fixed.length < 7) {
      out.frequencyKind = 'daily';
      out.timesPerPeriod = 1;
      out.daysOfWeek = [...fixed].sort((a, b) => a - b);
    } else if (tpw === 7) {
      out.frequencyKind = 'daily';
      out.timesPerPeriod = 1;
      out.daysOfWeek = [0, 1, 2, 3, 4, 5, 6];
    } else {
      out.frequencyKind = 'weekly';
      out.timesPerPeriod = tpw;
      out.daysOfWeek = [];
    }
  }
  return out;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

const baseRepo = createSupabaseRepository<LegacyHabitRow>('habits');

const habitRepo: SimpleItemsRepository<Habit> = {
  async list() {
    const rows = await baseRepo.list();
    return rows.map(rowToHabit);
  },
  async add(input: AddInput<Habit>) {
    const row = habitToRow(input as Partial<Habit>);
    const created = await baseRepo.add(row as AddInput<LegacyHabitRow>);
    return rowToHabit(created);
  },
  async update(id, patch) {
    const row = habitToRow(patch);
    const updated = await baseRepo.update(id, row);
    return rowToHabit(updated);
  },
  async remove(id) {
    await baseRepo.remove(id);
  },
};

export const useHabitsStore = createSimpleItemsStore<Habit>(habitRepo);
