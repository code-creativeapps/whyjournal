import { create } from 'zustand';

import { asyncStorageEntriesRepository } from '@/lib/entries/async-storage-repository';
import type { EntriesRepository } from '@/lib/entries/repository';
import type { Entry, NewEntryInput } from '@/lib/entries/types';

type EntriesState = {
  entries: Entry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addEntry: (input: NewEntryInput) => Promise<Entry>;
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
}));
