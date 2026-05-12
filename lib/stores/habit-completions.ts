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

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
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
    set({ items: [], hydrated: false });
  },

  async addCompletion(habitId, completedAt) {
    const userId = await getUserId();
    const row: Record<string, unknown> = { habit_id: habitId, user_id: userId };
    if (completedAt) row.completed_at = completedAt;
    const { data, error } = await supabase
      .from('habit_completions')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    const completion = fromRow(data as Record<string, unknown>);
    set((state) => ({ items: [completion, ...state.items] }));
    return completion;
  },

  async removeLatest(habitId) {
    // Find latest in local state for this habit.
    const items = get().items;
    const latest = items.find((c) => c.habitId === habitId);
    if (!latest) return;
    const { error } = await supabase.from('habit_completions').delete().eq('id', latest.id);
    if (error) throw error;
    set((state) => ({ items: state.items.filter((c) => c.id !== latest.id) }));
  },

  async removeOnDay(habitId, day) {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const items = get().items;
    const match = items.find((c) => {
      if (c.habitId !== habitId) return false;
      const t = new Date(c.completedAt).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    if (!match) return;
    const { error } = await supabase.from('habit_completions').delete().eq('id', match.id);
    if (error) throw error;
    set((state) => ({ items: state.items.filter((c) => c.id !== match.id) }));
  },
}));
