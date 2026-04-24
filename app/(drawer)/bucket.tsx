import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { useBucketStore } from '@/lib/stores/bucket';

export default function BucketScreen() {
  const items = useBucketStore((state) => state.items);
  const hydrated = useBucketStore((state) => state.hydrated);
  const updateItem = useBucketStore((state) => state.updateItem);
  const insets = useSafeAreaInsets();

  return (
    <SwipeableScreen route="bucket">
      <View className="flex-1">
      {hydrated && items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text variant="h3" className="text-center">
            Bucket list
          </Text>
          <Text variant="muted" className="text-center">
            Things you want to do someday. Big or small.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SimpleItemRow
              kind="checkbox"
              title={item.title}
              body={item.body}
              done={item.done}
              onToggle={() =>
                updateItem(item.id, {
                  done: !item.done,
                  completedAt: !item.done ? new Date().toISOString() : undefined,
                })
              }
              onPress={() =>
                router.push({ pathname: '/simple-item', params: { kind: 'bucket', id: item.id } })
              }
            />
          )}
          ItemSeparatorComponent={() => <View className="h-px bg-border" />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
        />
      )}
      <Fab href={{ pathname: '/simple-item', params: { kind: 'bucket' } }} />
      </View>
    </SwipeableScreen>
  );
}
