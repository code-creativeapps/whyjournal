import type { Entry, NewEntryInput } from './types';

export interface EntriesRepository {
  list(): Promise<Entry[]>;
  add(input: NewEntryInput): Promise<Entry>;
}
