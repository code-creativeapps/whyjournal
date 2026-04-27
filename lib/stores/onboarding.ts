import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY_PREFIX = 'onboarding:v1:';

type State = {
  completed: boolean;
  hydrated: boolean;
  userId: string | null;
  hydrate: (userId: string) => Promise<void>;
  markComplete: () => Promise<void>;
  reset: () => void;
  resetForUser: (userId?: string) => Promise<void>;
};

export const useOnboardingStore = create<State>((set, get) => ({
  completed: false,
  hydrated: false,
  userId: null,

  async hydrate(userId: string) {
    if (get().userId === userId && get().hydrated) return;
    const raw = await AsyncStorage.getItem(KEY_PREFIX + userId);
    set({ completed: raw === 'true', hydrated: true, userId });
  },

  async markComplete() {
    const userId = get().userId;
    if (!userId) return;
    await AsyncStorage.setItem(KEY_PREFIX + userId, 'true');
    set({ completed: true });
  },

  reset() {
    set({ completed: false, hydrated: false, userId: null });
  },

  async resetForUser(userId?: string) {
    const target = userId ?? get().userId;
    if (target) {
      await AsyncStorage.removeItem(KEY_PREFIX + target);
    }
    set({ completed: false, hydrated: false, userId: null });
  },
}));
