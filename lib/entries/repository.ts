import type { Entry, NewEntryInput, UpdateEntryInput } from './types';

export interface EntriesRepository {
  list(): Promise<Entry[]>;
  add(input: NewEntryInput): Promise<Entry>;
  update(id: string, patch: UpdateEntryInput): Promise<Entry>;
  remove(id: string): Promise<void>;
}
