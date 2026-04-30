import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const RAINBOW = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#eab308', // yellow-500
  '#22c55e', // green-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
  '#ef4444', // back to red — close the loop
] as const;

type Props = {
  children: React.ReactNode;
  /** Border thickness in pt. */
  thickness?: number;
  /** Full rotation period in ms. */
  durationMs?: number;
  /** Optional gradient colors. Must include at least 2 stops; loop the first color at the end for a seamless loop. */
  colors?: readonly string[];
};

export function AnimatedBorder({
  children,
  thickness = 3,
  durationMs = 4000,
  colors = RAINBOW,
}: Props) {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: durationMs, easing: Easing.linear }),
      -1,
      false
    );
  }, [durationMs, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={{
        borderRadius: 9999,
        padding: thickness,
        overflow: 'hidden',
        position: 'relative',
      }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: -200,
            left: -200,
            right: -200,
            bottom: -200,
          },
          animatedStyle,
        ]}>
        <LinearGradient
          colors={colors as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      {children}
    </View>
  );
}
