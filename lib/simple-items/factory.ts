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
  return create<SimpleItemsState<T>>((set, get) => ({
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
      // Optimistic: show the row immediately with a temp id, reconcile after save.
      const optimistic = {
        ...(input as object),
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        createdAt: new Date().toISOString(),
      } as T;
      set((state) => ({ items: [optimistic, ...state.items] }));
      try {
        const item = await repo.add(input);
        set((state) => ({
          items: state.items.map((e) => (e.id === optimistic.id ? item : e)),
        }));
        return item;
      } catch (err) {
        set((state) => ({ items: state.items.filter((e) => e.id !== optimistic.id) }));
        throw err;
      }
    },

    async updateItem(id, patch) {
      // Optimistic: apply the patch locally, roll back on failure.
      const prev = get().items.find((e) => e.id === id);
      set((state) => ({
        items: state.items.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
      try {
        const updated = await repo.update(id, patch);
        set((state) => ({
          items: state.items.map((e) => (e.id === id ? updated : e)),
        }));
        return updated;
      } catch (err) {
        if (prev) {
          set((state) => ({
            items: state.items.map((e) => (e.id === id ? prev : e)),
          }));
        }
        throw err;
      }
    },

    async deleteItem(id) {
      // Optimistic: remove now, restore on failure.
      const prev = get().items.find((e) => e.id === id);
      set((state) => ({ items: state.items.filter((e) => e.id !== id) }));
      try {
        await repo.remove(id);
      } catch (err) {
        if (prev) set((state) => ({ items: [prev, ...state.items] }));
        throw err;
      }
    },
  }));
}
