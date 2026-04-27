import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

import type { AddInput, BaseItem, SimpleItemsRepository } from './factory';

export function createAsyncStorageRepository<T extends BaseItem>(
  storageKey: string
): SimpleItemsRepository<T> {
  async function readAll(): Promise<T[]> {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  async function writeAll(items: T[]): Promise<void> {
    await AsyncStorage.setItem(storageKey, JSON.stringify(items));
  }

  return {
    async list() {
      return readAll();
    },

    async add(input: AddInput<T>) {
      const item = {
        ...input,
        id: String(uuid.v4()),
        createdAt: new Date().toISOString(),
      } as T;
      const existing = await readAll();
      const next = [item, ...existing];
      await writeAll(next);
      return item;
    },

    async update(id, patch) {
      const existing = await readAll();
      const idx = existing.findIndex((e) => e.id === id);
      if (idx < 0) throw new Error(`${storageKey}: ${id} not found`);
      const updated = { ...existing[idx], ...patch } as T;
      existing[idx] = updated;
      await writeAll(existing);
      return updated;
    },

    async remove(id) {
      const existing = await readAll();
      const next = existing.filter((e) => e.id !== id);
      if (next.length === existing.length) return;
      await writeAll(next);
    },
  };
}
