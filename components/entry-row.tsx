import { CheckIcon, HeartIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Entry } from '@/lib/entries/types';

export function EntryRow({ entry }: { entry: Entry }) {
  const isWin = entry.type === 'win';
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View
        className={
          isWin
            ? 'size-7 items-center justify-center rounded-full bg-green-500/15'
            : 'size-7 items-center justify-center rounded-full bg-pink-500/15'
        }>
        <Icon
          as={isWin ? CheckIcon : HeartIcon}
          size={16}
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
  );
}
