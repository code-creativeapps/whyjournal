import { router } from 'expo-router';
import * as React from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { useGoalsStore } from '@/lib/stores/goals';
import { useTodosStore } from '@/lib/stores/todos';

export default function TodosScreen() {
  const items = useTodosStore((state) => state.items);
  const hydrated = useTodosStore((state) => state.hydrated);
  const updateItem = useTodosStore((state) => state.updateItem);
  const goals = useGoalsStore((state) => state.items);
  const insets = useSafeAreaInsets();

  const goalTitleById = React.useMemo(
    () => new Map(goals.map((g) => [g.id, g.title] as const)),
    [goals]
  );

  return (
    <SwipeableScreen route="todos">
      <View className="flex-1">
        {hydrated && items.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <Text variant="h3" className="text-center">
              Nothing to do
            </Text>
            <Text variant="muted" className="text-center">
              A lightweight master list of what&apos;s on your plate.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const linkedTitle = item.goalId ? goalTitleById.get(item.goalId) : undefined;
              return (
                <SimpleItemRow
                  kind="checkbox"
                  title={item.title}
                  body={item.body}
                  subtitle={linkedTitle ? `Goal · ${linkedTitle}` : undefined}
                  done={item.done}
                  onToggle={() =>
                    updateItem(item.id, {
                      done: !item.done,
                      completedAt: !item.done ? new Date().toISOString() : undefined,
                    })
                  }
                  onPress={() =>
                    router.push({ pathname: '/simple-item', params: { kind: 'todo', id: item.id } })
                  }
                />
              );
            }}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        )}
        <Fab href={{ pathname: '/simple-item', params: { kind: 'todo' } }} />
      </View>
    </SwipeableScreen>
  );
}
