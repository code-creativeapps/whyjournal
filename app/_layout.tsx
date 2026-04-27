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
import { useGoalsStore } from '@/lib/stores/goals';
import { useOnboardingStore } from '@/lib/stores/onboarding';
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
            <Stack.Screen
              name="goal-detail"
              options={{ headerShown: true, title: 'Goal', headerBackTitle: 'Back' }}
            />
            <Stack.Screen
              name="bucket-detail"
              options={{ headerShown: true, title: 'Bucket item', headerBackTitle: 'Back' }}
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
