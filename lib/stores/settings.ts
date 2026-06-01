import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'settings:v1:showActivityInJournal';

type State = {
  /** Show completed habits/todos/milestones inline in the journal feed. */
  showActivityInJournal: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setShowActivityInJournal: (value: boolean) => Promise<void>;
};

export const useSettingsStore = create<State>((set) => ({
  showActivityInJournal: true,
  hydrated: false,

  async hydrate() {
    const raw = await AsyncStorage.getItem(KEY);
    set({ showActivityInJournal: raw === null ? true : raw === 'true', hydrated: true });
  },

  async setShowActivityInJournal(value) {
    set({ showActivityInJournal: value });
    await AsyncStorage.setItem(KEY, String(value));
  },
}));
