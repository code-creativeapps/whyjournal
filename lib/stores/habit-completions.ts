import { create } from 'zustand';

import type { HabitCompletion } from '@/lib/habits/types';
import { supabase } from '@/lib/supabase/client';

type State = {
  items: HabitCompletion[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  /** Logs one completion for the given habit at the current time, or at a specific ISO timestamp. */
  addCompletion: (habitId: string, completedAt?: string) => Promise<HabitCompletion>;
  /** Removes the most recent completion for the given habit (today, server-side). */
  removeLatest: (habitId: string) => Promise<void>;
  /** Removes the most recent completion on a specific calendar day for the given habit. */
  removeOnDay: (habitId: string, day: Date) => Promise<void>;
};

function fromRow(row: Record<string, unknown>): HabitCompletion {
  return {
    id: row.id as string,
    habitId: row.habit_id as string,
    completedAt: row.completed_at as string,
  };
}

let cachedUserId: string | null = null;
async function getUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not signed in');
  cachedUserId = data.user.id;
  return cachedUserId;
}

function tempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useHabitCompletionsStore = create<State>((set, get) => ({
  items: [],
  hydrated: false,

  async hydrate() {
    const { data, error } = await supabase
      .from('habit_completions')
      .select('*')
      .order('completed_at', { ascending: false });
    if (error) throw error;
    const items = (data ?? []).map((row) => fromRow(row as Record<string, unknown>));
    set({ items, hydrated: true });
  },

  reset() {
    cachedUserId = null;
    set({ items: [], hydrated: false });
  },

  async addCompletion(habitId, completedAt) {
    // Optimistic: insert immediately with a temp id, reconcile in background.
    const optimistic: HabitCompletion = {
      id: tempId(),
      habitId,
      completedAt: completedAt ?? new Date().toISOString(),
    };
    set((state) => ({ items: [optimistic, ...state.items] }));

    (async () => {
      try {
        const userId = await getUserId();
        const row: Record<string, unknown> = { habit_id: habitId, user_id: userId };
        if (completedAt) row.completed_at = completedAt;
        const { data, error } = await supabase
          .from('habit_completions')
          .insert(row)
          .select()
          .single();
        if (error) throw error;
        const saved = fromRow(data as Record<string, unknown>);
        set((state) => ({
          items: state.items.map((c) => (c.id === optimistic.id ? saved : c)),
        }));
      } catch {
        // Roll back the optimistic insert.
        set((state) => ({ items: state.items.filter((c) => c.id !== optimistic.id) }));
      }
    })();

    return optimistic;
  },

  async removeLatest(habitId) {
    const latest = get().items.find((c) => c.habitId === habitId);
    if (!latest) return;
    removeOptimistically(set, latest);
  },

  async removeOnDay(habitId, day) {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const match = get().items.find((c) => {
      if (c.habitId !== habitId) return false;
      const t = new Date(c.completedAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    if (!match) return;
    removeOptimistically(set, match);
  },
}));

function removeOptimistically(
  set: (fn: (s: State) => Partial<State>) => void,
  item: HabitCompletion
) {
  // Optimistic: drop from state now, delete on the server in the background.
  set((state) => ({ items: state.items.filter((c) => c.id !== item.id) }));
  // A temp row that never reached the server has nothing to delete.
  if (item.id.startsWith('temp-')) return;
  (async () => {
    const { error } = await supabase.from('habit_completions').delete().eq('id', item.id);
    if (error) {
      // Roll back the optimistic removal.
      set((state) => ({ items: [item, ...state.items] }));
    }
  })();
}
