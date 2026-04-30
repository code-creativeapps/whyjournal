import '@/global.css';
import 'react-native-gesture-handler';

import { setAudioModeAsync } from 'expo-audio';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/lib/stores/auth';
import { useEntriesStore } from '@/lib/stores/entries';
import { useAffirmationsStore } from '@/lib/stores/affirmations';
import { useBucketStore } from '@/lib/stores/bucket';
import { useGoalImagesStore } from '@/lib/stores/goal-images';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useOnboardingStore } from '@/lib/stores/onboarding';
import { useProjectsStore } from '@/lib/stores/projects';
import { useRoutinesStore } from '@/lib/stores/routines';
import { useTodosStore } from '@/lib/stores/todos';
import { useTrophiesStore } from '@/lib/stores/trophies';
import { NAV_THEME } from '@/lib/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);

  React.useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers',
    }).catch(() => {});
    useAuthStore.getState().init();
  }, []);

  React.useEffect(() => {
    if (!userId) {
      // Sign-out: drop everything in-memory.
      useEntriesStore.getState().reset();
      useAffirmationsStore.getState().reset();
      useBucketStore.getState().reset();
      useGoalsStore.getState().reset();
      useGoalImagesStore.getState().reset();
      useMilestonesStore.getState().reset();
      useProjectsStore.getState().reset();
      useRoutinesStore.getState().reset();
      useHabitsStore.getState().reset();
      useHabitCompletionsStore.getState().reset();
      useTodosStore.getState().reset();
      useTrophiesStore.getState().reset();
      useOnboardingStore.getState().reset();
      return;
    }
    useOnboardingStore.getState().hydrate(userId).catch(() => {});
    useEntriesStore.getState().hydrate().catch(() => {});
    useAffirmationsStore.getState().hydrate().catch(() => {});
    useBucketStore.getState().hydrate().catch(() => {});
    useGoalsStore.getState().hydrate().catch(() => {});
    useGoalImagesStore.getState().hydrate().catch(() => {});
    useMilestonesStore.getState().hydrate().catch(() => {});
    useProjectsStore.getState().hydrate().catch(() => {});
    useRoutinesStore.getState().hydrate().catch(() => {});
    useHabitsStore.getState().hydrate().catch(() => {});
    useHabitCompletionsStore.getState().hydrate().catch(() => {});
    useTodosStore.getState().hydrate().catch(() => {});
    useTrophiesStore.getState().hydrate().catch(() => {});
  }, [userId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack>
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="new" options={{ presentation: 'modal' }} />
            <Stack.Screen name="simple-item" options={{ presentation: 'modal' }} />
            <Stack.Screen name="goal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="milestone" options={{ presentation: 'modal' }} />
            <Stack.Screen name="habit" options={{ presentation: 'modal' }} />
            <Stack.Screen name="project" options={{ presentation: 'modal' }} />
            <Stack.Screen name="search" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="project-detail"
              options={{
                headerShown: true,
                title: 'Project',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen
              name="goal-detail"
              options={{
                headerShown: true,
                title: 'Goal',
                headerBackTitle: 'Goals',
              }}
            />
            <Stack.Screen
              name="milestone-detail"
              options={{
                headerShown: true,
                title: 'Milestone',
                presentation: 'formSheet',
                contentStyle: { flex: 1 },
                sheetAllowedDetents: 'fitToContents',
              }}
            />
            <Stack.Screen
              name="bucket-detail"
              options={{
                headerShown: true,
                title: 'Bucket item',
                presentation: 'formSheet',
                contentStyle: { flex: 1 },
                sheetAllowedDetents: 'fitToContents',
              }}
            />
            <Stack.Screen
              name="entry-detail"
              options={{ headerShown: true, title: 'Entry', presentation: 'formSheet' }}
            />
            <Stack.Screen
              name="reminder-detail"
              options={{ headerShown: true, title: 'Reminder', presentation: 'formSheet' }}
            />
            <Stack.Screen
              name="trophy-detail"
              options={{
                headerShown: true,
                title: 'Trophy',
                presentation: 'formSheet',
                contentStyle: { flex: 1 },
                sheetAllowedDetents: 'fitToContents',
              }}
            />
            <Stack.Screen
              name="habit-detail"
              options={{ headerShown: true, title: 'Habit', presentation: 'formSheet' }}
            />
            <Stack.Screen
              name="habits-trends-lab"
              options={{ headerShown: true, title: 'Trend ideas' }}
            />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="sign-in" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="sign-up" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
          <PortalHost />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
