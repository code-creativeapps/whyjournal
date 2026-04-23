import { create } from 'zustand';

import { asyncStorageEntriesRepository } from '@/lib/entries/async-storage-repository';
import type { EntriesRepository } from '@/lib/entries/repository';
import type { Entry, NewEntryInput, UpdateEntryInput } from '@/lib/entries/types';

type EntriesState = {
  entries: Entry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addEntry: (input: NewEntryInput) => Promise<Entry>;
  updateEntry: (id: string, patch: UpdateEntryInput) => Promise<Entry>;
  deleteEntry: (id: string) => Promise<void>;
};

const repository: EntriesRepository = asyncStorageEntriesRepository;

export const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    const entries = await repository.list();
    set({ entries, hydrated: true });
  },

  async addEntry(input) {
    const entry = await repository.add(input);
    set((state) => ({ entries: [entry, ...state.entries] }));
    return entry;
  },

  async updateEntry(id, patch) {
    const updated = await repository.update(id, patch);
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? updated : e)),
    }));
    return updated;
  },

  async deleteEntry(id) {
    await repository.remove(id);
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) }));
  },
}));
