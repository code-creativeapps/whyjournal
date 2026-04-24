import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { create } from 'zustand';

export type BaseItem = {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
};

type AddInput<T extends BaseItem> = Omit<T, 'id' | 'createdAt'>;

async function readAll<T>(storageKey: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

async function writeAll<T>(storageKey: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(items));
}

export type SimpleItemsState<T extends BaseItem> = {
  items: T[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addItem: (input: AddInput<T>) => Promise<T>;
  updateItem: (id: string, patch: Partial<T>) => Promise<T>;
  deleteItem: (id: string) => Promise<void>;
};

export function createSimpleItemsStore<T extends BaseItem>(storageKey: string) {
  return create<SimpleItemsState<T>>((set, get) => ({
    items: [],
    hydrated: false,

    async hydrate() {
      if (get().hydrated) return;
      const items = await readAll<T>(storageKey);
      set({ items, hydrated: true });
    },

    async addItem(input) {
      const item = {
        ...input,
        id: String(uuid.v4()),
        createdAt: new Date().toISOString(),
      } as T;
      const existing = await readAll<T>(storageKey);
      const next = [item, ...existing];
      await writeAll(storageKey, next);
      set({ items: next });
      return item;
    },

    async updateItem(id, patch) {
      const existing = await readAll<T>(storageKey);
      const index = existing.findIndex((e) => e.id === id);
      if (index < 0) throw new Error(`${storageKey}: ${id} not found`);
      const updated = { ...existing[index], ...patch } as T;
      existing[index] = updated;
      await writeAll(storageKey, existing);
      set({ items: existing.slice() });
      return updated;
    },

    async deleteItem(id) {
      const existing = await readAll<T>(storageKey);
      const next = existing.filter((e) => e.id !== id);
      if (next.length === existing.length) return;
      await writeAll(storageKey, next);
      set({ items: next });
    },
  }));
}
