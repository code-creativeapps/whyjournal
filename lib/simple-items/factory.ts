import { create } from 'zustand';

export type BaseItem = {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
};

export type AddInput<T extends BaseItem> = Omit<T, 'id' | 'createdAt'>;

export type SimpleItemsRepository<T extends BaseItem> = {
  list(): Promise<T[]>;
  add(input: AddInput<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
};

export type SimpleItemsState<T extends BaseItem> = {
  items: T[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  reset: () => void;
  addItem: (input: AddInput<T>) => Promise<T>;
  updateItem: (id: string, patch: Partial<T>) => Promise<T>;
  deleteItem: (id: string) => Promise<void>;
};

export function createSimpleItemsStore<T extends BaseItem>(repo: SimpleItemsRepository<T>) {
  return create<SimpleItemsState<T>>((set) => ({
    items: [],
    hydrated: false,

    async hydrate() {
      const items = await repo.list();
      set({ items, hydrated: true });
    },

    reset() {
      set({ items: [], hydrated: false });
    },

    async addItem(input) {
      const item = await repo.add(input);
      set((state) => ({ items: [item, ...state.items] }));
      return item;
    },

    async updateItem(id, patch) {
      const updated = await repo.update(id, patch);
      set((state) => ({
        items: state.items.map((e) => (e.id === id ? updated : e)),
      }));
      return updated;
    },

    async deleteItem(id) {
      await repo.remove(id);
      set((state) => ({ items: state.items.filter((e) => e.id !== id) }));
    },
  }));
}
