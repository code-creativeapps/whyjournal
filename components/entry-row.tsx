import { Link } from 'expo-router';
import { CheckIcon, HeartIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Entry } from '@/lib/entries/types';

export function EntryRow({ entry }: { entry: Entry }) {
  const isWin = entry.type === 'win';
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Link href={{ pathname: '/new', params: { id: entry.id } }} asChild>
        <Pressable className="active:bg-accent">
          <View className="flex-row items-center gap-3 px-4 py-1.5">
            <View
              className={
                isWin
                  ? 'size-6 items-center justify-center rounded-full bg-green-500/15'
                  : 'size-6 items-center justify-center rounded-full bg-pink-500/15'
              }>
              <Icon
                as={isWin ? CheckIcon : HeartIcon}
                size={14}
                className={isWin ? 'text-green-600' : 'text-pink-600'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-base" numberOfLines={1}>
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
