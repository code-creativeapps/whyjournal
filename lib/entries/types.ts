export type EntryType = 'win' | 'gratitude';

export type Entry = {
  id: string;
  type: EntryType;
  title: string;
  body?: string;
  createdAt: string;
};

export type NewEntryInput = {
  type: EntryType;
  title: string;
  body?: string;
};
