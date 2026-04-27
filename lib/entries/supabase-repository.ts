import { supabase } from '@/lib/supabase/client';

import type { EntriesRepository } from './repository';
import type { Entry, NewEntryInput, UpdateEntryInput } from './types';

function fromRow(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    type: row.type as Entry['type'],
    title: row.title as string,
    body: (row.body as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Not signed in');
  return data.user.id;
}

export const supabaseEntriesRepository: EntriesRepository = {
  async list() {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => fromRow(row as Record<string, unknown>));
  },

  async add(input: NewEntryInput) {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        type: input.type,
        title: input.title,
        body: input.body,
      })
      .select()
      .single();
    if (error) throw error;
    return fromRow(data as Record<string, unknown>);
  },

  async update(id: string, patch: UpdateEntryInput) {
    const row: Record<string, unknown> = {};
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.body !== undefined) row.body = patch.body;
    const { data, error } = await supabase
      .from('entries')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return fromRow(data as Record<string, unknown>);
  },

  async remove(id: string) {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
  },
};
