import { CheckIcon } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const STEPS = [
  'Listening to your dream',
  'Mapping the goal',
  'Sketching milestones',
  'Choosing the main path',
  'Breaking into projects',
  'Picking today’s tasks',
  'Sketching habits',
] as const;

const STEP_INTERVAL_MS = 950;

export function CoachThinking() {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <View className="self-start gap-2 rounded-2xl bg-muted px-4 py-3">
      {STEPS.slice(0, step + 1).map((label, i) => {
        const isCurrent = i === step;
        return (
          <Animated.View
            key={label}
            entering={FadeInDown.duration(220)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isCurrent ? (
              <ActivityIndicator size="small" />
            ) : (
              <View className="size-4 items-center justify-center rounded-full bg-green-500/20">
                <Icon as={CheckIcon} size={11} className="text-green-600" />
              </View>
            )}
            <Text
              className={
                isCurrent ? 'text-sm text-foreground' : 'text-sm text-muted-foreground'
              }>
              {label}…
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
