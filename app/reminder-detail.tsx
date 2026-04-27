import { Stack, router, useLocalSearchParams } from 'expo-router';
import { PencilIcon, QuoteIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAffirmationsStore } from '@/lib/stores/affirmations';

export default function ReminderDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const item = useAffirmationsStore((state) =>
    id ? state.items.find((a) => a.id === id) : undefined
  );

  React.useEffect(() => {
    if (id && !item && router.canGoBack()) router.back();
  }, [id, item]);

  if (!item) return null;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Reminder',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/simple-item',
                  params: { kind: 'affirmation', id: item.id },
                })
              }
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="gap-6 px-6 pt-12 pb-10">
        <View className="items-center gap-4">
          <View className="size-20 items-center justify-center rounded-full bg-sky-500/15">
            <Icon as={QuoteIcon} size={40} className="text-sky-500" />
          </View>
          <Text variant="h2" className="text-center">
            {item.title}
          </Text>
        </View>

        {item.body ? (
          <Text className="text-center text-base leading-7 text-foreground">{item.body}</Text>
        ) : null}
      </ScrollView>
    </>
  );
}
