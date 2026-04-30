import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CheckIcon, PencilIcon, StarIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (id && !item && router.canGoBack()) router.back();
  }, [id, item]);

  if (!item) return null;

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
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
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
      <View className="flex-1">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerClassName="gap-6 px-6 pt-12 pb-6">
          <View className="items-center gap-4">
            <View className="size-20 items-center justify-center rounded-full bg-yellow-500/15">
              <Icon as={StarIcon} size={40} className="text-yellow-500" />
            </View>
            <Text
              variant="h2"
              className={cn(
                'border-b-0 pb-0 text-center',
                item.done && 'text-muted-foreground line-through'
              )}>
              {item.title}
            </Text>
          </View>

          {item.body ? (
            <Text className="text-center text-base leading-7 text-foreground">{item.body}</Text>
          ) : null}
        </ScrollView>

        <View
          className="bg-background px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {item.done ? (
            <View className="flex-row items-center justify-center gap-2 rounded-full bg-green-500/15 px-3 py-2">
              <Icon as={CheckIcon} size={14} className="text-green-600" />
              <Text className="text-sm font-semibold text-green-700">Completed</Text>
            </View>
          ) : (
            <AnimatedBorder>
              <HoldToConfirmButton
                label="Hold to mark as completed"
                icon={CheckIcon}
                onConfirm={handleMarkCompleted}
              />
            </AnimatedBorder>
          )}
        </View>
      </View>
    </>
  );
}
