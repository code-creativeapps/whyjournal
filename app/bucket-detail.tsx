import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CheckIcon, PencilIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AnimatedBorder } from '@/components/animated-border';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useBucketStore } from '@/lib/stores/bucket';
import { cn } from '@/lib/utils';

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const item = useBucketStore((state) =>
    id ? state.items.find((b) => b.id === id) : undefined
  );
  const updateItem = useBucketStore((state) => state.updateItem);

  if (!item) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text variant="muted">Item not found</Text>
      </View>
    );
  }

  function handleMarkCompleted() {
    if (!item) return;
    updateItem(item.id, {
      done: true,
      completedAt: new Date().toISOString(),
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bucket item',
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/simple-item', params: { kind: 'bucket', id: item.id } })
              }
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="gap-5 px-4 pt-4 pb-10">
        <Text
          variant="h2"
          className={cn(item.done && 'text-muted-foreground line-through')}>
          {item.title}
        </Text>

        {item.body ? (
          <View className="gap-1">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Notes
            </Text>
            <Text className="text-base leading-6">{item.body}</Text>
          </View>
        ) : null}

        {item.done ? (
          <View className="flex-row items-center gap-2 self-start rounded-full bg-green-500/15 px-3 py-1.5">
            <Icon as={CheckIcon} size={14} className="text-green-600" />
            <Text className="text-sm font-semibold text-green-700">Completed</Text>
          </View>
        ) : (
          <View className="mt-4">
            <AnimatedBorder>
              <HoldToConfirmButton
                label="Hold to mark as completed"
                icon={CheckIcon}
                onConfirm={handleMarkCompleted}
              />
            </AnimatedBorder>
          </View>
        )}
      </ScrollView>
    </>
  );
}
