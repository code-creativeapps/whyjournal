import { Link } from 'expo-router';
import { SparklesIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AnimatedBorder } from '@/components/animated-border';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.25,
  shadowRadius: 12,
  elevation: 10,
  borderRadius: 9999,
};

const COACH_GRADIENT = [
  '#a855f7',
  '#ec4899',
  '#f59e0b',
  '#22d3ee',
  '#a855f7',
] as const;

export function CoachLauncher() {
  return (
    <View style={SHADOW}>
      <AnimatedBorder thickness={3} durationMs={2600} colors={COACH_GRADIENT}>
        <Link href="/coach" asChild>
          <Button size="icon" className="size-14 rounded-full bg-background">
            <Icon as={SparklesIcon} className="size-6 text-primary" />
          </Button>
        </Link>
      </AnimatedBorder>
    </View>
  );
}
