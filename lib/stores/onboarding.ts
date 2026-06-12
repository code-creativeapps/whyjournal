import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY_PREFIX = 'onboarding:v1:';
const FOCUS_PREFIX = 'onboarding:focus:v2:';
const COACHMARK_PREFIX = 'onboarding:journalCoachmark:v2:';

export type OnboardingFocus = 'journal' | 'habits' | 'goals' | 'all';

type State = {
  completed: boolean;
  hydrated: boolean;
  userId: string | null;
  focus: OnboardingFocus | null;
  journalCoachmarkDismissed: boolean;
  hydrate: (userId: string) => Promise<void>;
  markComplete: (focus?: OnboardingFocus) => Promise<void>;
  dismissJournalCoachmark: () => Promise<void>;
  reset: () => void;
  resetForUser: (userId?: string) => Promise<void>;
};

export const useOnboardingStore = create<State>((set, get) => ({
  completed: false,
  hydrated: false,
  userId: null,
  focus: null,
  journalCoachmarkDismissed: false,

  async hydrate(userId: string) {
    if (get().userId === userId && get().hydrated) return;
    const [raw, focusRaw, coachRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_PREFIX + userId),
      AsyncStorage.getItem(FOCUS_PREFIX + userId),
      AsyncStorage.getItem(COACHMARK_PREFIX + userId),
    ]);
    set({
      completed: raw === 'true',
      hydrated: true,
      userId,
      focus: (focusRaw as OnboardingFocus | null) ?? null,
      // Default to dismissed for users who already finished v1 onboarding —
      // they shouldn't see a coachmark on a journal full of entries.
      journalCoachmarkDismissed: coachRaw === 'true' || raw === 'true',
    });
  },

  async markComplete(focus) {
    const userId = get().userId;
    if (!userId) return;
    await AsyncStorage.setItem(KEY_PREFIX + userId, 'true');
    if (focus) await AsyncStorage.setItem(FOCUS_PREFIX + userId, focus);
    set({ completed: true, focus: focus ?? get().focus });
  },

  async dismissJournalCoachmark() {
    const userId = get().userId;
    if (!userId) return;
    await AsyncStorage.setItem(COACHMARK_PREFIX + userId, 'true');
    set({ journalCoachmarkDismissed: true });
  },

  reset() {
    set({
      completed: false,
      hydrated: false,
      userId: null,
      focus: null,
      journalCoachmarkDismissed: false,
    });
  },

  async resetForUser(userId?: string) {
    const target = userId ?? get().userId;
    if (target) {
      await Promise.all([
        AsyncStorage.removeItem(KEY_PREFIX + target),
        AsyncStorage.removeItem(FOCUS_PREFIX + target),
        AsyncStorage.removeItem(COACHMARK_PREFIX + target),
      ]);
    }
    set({
      completed: false,
      hydrated: false,
      userId: null,
      focus: null,
      journalCoachmarkDismissed: false,
    });
  },
}));
