import { create } from 'zustand';

import type { GoalImage, NewGoalImageInput } from '@/lib/goal-images/types';
import { supabase } from '@/lib/supabase/client';

type GoalImageRow = {
  id: string;
  goal_id: string;
  url: string;
  source: 'upload' | 'pexels';
  attribution: string | null;
  position: number;
  created_at: string;
};

function fromRow(row: GoalImageRow): GoalImage {
  return {
    id: row.id,
    goalId: row.goal_id,
    url: row.url,
    source: row.source,
    attribution: row.attribution ?? undefined,
    position: row.position,
    createdAt: row.created_at,
  };
}

type State = {
  items: GoalImage[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  addItem: (input: NewGoalImageInput) => Promise<GoalImage>;
  updateItem: (id: string, patch: Partial<NewGoalImageInput>) => Promise<GoalImage>;
  deleteItem: (id: string) => Promise<void>;
};

export const useGoalImagesStore = create<State>((set) => ({
  items: [],
  hydrated: false,

  async hydrate() {
    const { data, error } = await supabase
      .from('goal_images')
      .select('*')
      .order('position', { ascending: true });
    if (error) throw error;
    set({ items: (data ?? []).map((r) => fromRow(r as GoalImageRow)), hydrated: true });
  },

  reset() {
    set({ items: [], hydrated: false });
  },

  async addItem(input) {
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw userErr;
    if (!userData.user) throw new Error('Not signed in');
    const { data, error } = await supabase
      .from('goal_images')
      .insert({
        user_id: userData.user.id,
        goal_id: input.goalId,
        url: input.url,
        source: input.source,
        attribution: input.attribution ?? null,
        position: input.position,
      })
      .select()
      .single();
    if (error) throw error;
    const item = fromRow(data as GoalImageRow);
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },

  async updateItem(id, patch) {
    const row: Record<string, unknown> = {};
    if (patch.url !== undefined) row.url = patch.url;
    if (patch.source !== undefined) row.source = patch.source;
    if (patch.attribution !== undefined) row.attribution = patch.attribution;
    if (patch.position !== undefined) row.position = patch.position;
    if (patch.goalId !== undefined) row.goal_id = patch.goalId;
    const { data, error } = await supabase
      .from('goal_images')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    const item = fromRow(data as GoalImageRow);
    set((state) => ({ items: state.items.map((i) => (i.id === id ? item : i)) }));
    return item;
  },

  async deleteItem(id) {
    const { error } = await supabase.from('goal_images').delete().eq('id', id);
    if (error) throw error;
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },
}));
