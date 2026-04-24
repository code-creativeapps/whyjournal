import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'onboarding:v1';

type State = {
  completed: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  markComplete: () => Promise<void>;
  reset: () => Promise<void>;
};

export const useOnboardingStore = create<State>((set, get) => ({
  completed: false,
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    set({ completed: raw === 'true', hydrated: true });
  },

  async markComplete() {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    set({ completed: true });
  },

  async reset() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ completed: false });
  },
}));
