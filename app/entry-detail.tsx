import { format } from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CheckIcon, HeartIcon, PencilIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useEntriesStore } from '@/lib/stores/entries';
import { cn } from '@/lib/utils';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entry = useEntriesStore((state) =>
    id ? state.entries.find((e) => e.id === id) : undefined
  );

  React.useEffect(() => {
    if (id && !entry && router.canGoBack()) router.back();
  }, [id, entry]);

  if (!entry) return null;

  const isWin = entry.type === 'win';
  const screenTitle = isWin ? 'Win' : 'Gratitude';

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/new', params: { id: entry.id } })}
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="px-6 pt-12 pb-10 gap-8">
        <View className="items-center gap-4">
          <View
            className={cn(
              'size-20 items-center justify-center rounded-full',
              isWin ? 'bg-green-500/15' : 'bg-pink-500/15'
            )}>
            <Icon
              as={isWin ? CheckIcon : HeartIcon}
              size={40}
              className={isWin ? 'text-green-600' : 'text-pink-600'}
            />
          </View>
          <Text variant="h2" className="text-center">
            {entry.title}
          </Text>
        </View>

        {entry.body ? (
          <Text className="text-center text-base leading-7 text-foreground">{entry.body}</Text>
        ) : null}

        <Text variant="muted" className="text-center text-xs">
          {format(new Date(entry.createdAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
        </Text>
      </ScrollView>
    </>
  );
}
