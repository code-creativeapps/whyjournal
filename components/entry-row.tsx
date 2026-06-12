import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Entry } from '@/lib/entries/types';
import { ENTRY_VISUALS } from '@/lib/entries/visuals';
import { cn } from '@/lib/utils';

export function EntryRow({ entry }: { entry: Entry }) {
  const visual = ENTRY_VISUALS[entry.type];
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Link href={{ pathname: '/entry-detail', params: { id: entry.id } }} asChild>
        <Pressable className="active:bg-accent">
          <View className="flex-row items-center gap-3.5 px-4 py-2">
            <View
              className={cn(
                'size-7 items-center justify-center rounded-full',
                visual.badgeBgClass
              )}>
              <Icon as={visual.icon} size={17} className={visual.iconColorClass} />
            </View>
            <View className="flex-1">
              <Text className="text-lg" numberOfLines={1}>
                {entry.title}
              </Text>
              {entry.body ? (
                <Text variant="muted" numberOfLines={1}>
                  {entry.body}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
}
