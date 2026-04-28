import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

import type { EntriesRepository } from './repository';
import type { Entry, NewEntryInput, UpdateEntryInput } from './types';

const STORAGE_KEY = 'entries:v1';

async function readAll(): Promise<Entry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(entries: Entry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export const asyncStorageEntriesRepository: EntriesRepository = {
  async list() {
    return readAll();
  },

  async add(input: NewEntryInput) {
    const entry: Entry = {
      id: String(uuid.v4()),
      type: input.type,
      title: input.title,
      body: input.body,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    const existing = await readAll();
    await writeAll([entry, ...existing]);
    return entry;
  },

  async update(id: string, patch: UpdateEntryInput) {
    const entries = await readAll();
    const index = entries.findIndex((e) => e.id === id);
    if (index < 0) throw new Error(`Entry ${id} not found`);
    const updated: Entry = {
      ...entries[index],
      ...patch,
    };
    entries[index] = updated;
    await writeAll(entries);
    return updated;
  },

  async remove(id: string) {
    const entries = await readAll();
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) return;
    await writeAll(next);
  },
};
