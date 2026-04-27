import * as Haptics from 'expo-haptics';
import * as React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { startCompletionSound, stopCompletionSound } from '@/lib/celebrate';
import type { LucideIcon } from 'lucide-react-native';

type Props = {
  label: string;
  icon?: LucideIcon;
  onConfirm: () => void;
  /** How long the user must hold for the action to fire. */
  durationMs?: number;
};

export function HoldToConfirmButton({ label, icon, onConfirm, durationMs = 3000 }: Props) {
  const progress = useSharedValue(0);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  function fire() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirm();
  }

  function startPress() {
    Haptics.selectionAsync().catch(() => {});
    startCompletionSound();
    progress.value = withTiming(
      1,
      { duration: durationMs, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(fire)();
      }
    );
  }

  function cancelPress() {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 200 });
    stopCompletionSound();
  }

  return (
    <Pressable
      onPressIn={startPress}
      onPressOut={cancelPress}
      className="h-11 w-full flex-row items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-6">
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.28)',
          },
          fillStyle,
        ]}
      />
      {icon ? <Icon as={icon} className="text-primary-foreground" /> : null}
      <Text className="font-semibold text-primary-foreground">{label}</Text>
    </Pressable>
  );
}
