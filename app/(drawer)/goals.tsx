import { router } from 'expo-router';
import * as React from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { goalProgress } from '@/lib/goals/progress';
import { useGoalsStore } from '@/lib/stores/goals';
import { useTodosStore } from '@/lib/stores/todos';

export default function GoalsScreen() {
  const items = useGoalsStore((state) => state.items);
  const hydrated = useGoalsStore((state) => state.hydrated);
  const updateItem = useGoalsStore((state) => state.updateItem);
  const todos = useTodosStore((state) => state.items);
  const insets = useSafeAreaInsets();

  const linkedByGoal = React.useMemo(() => {
    const map = new Map<string, typeof todos>();
    for (const t of todos) {
      if (t.goalId) {
        const existing = map.get(t.goalId) ?? [];
        existing.push(t);
        map.set(t.goalId, existing);
      }
    }
    return map;
  }, [todos]);

  return (
    <SwipeableScreen route="goals">
      <View className="flex-1">
        {hydrated && items.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <Text variant="h3" className="text-center">
              Goals
            </Text>
            <Text variant="muted" className="text-center">
              What you&apos;re working on now, big or small.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const linked = linkedByGoal.get(item.id) ?? [];
              const progress = goalProgress(item, linked);
              const subtitleParts: string[] = [];
              if (linked.length > 0) {
                subtitleParts.push(`${progress.done} / ${progress.total} milestones`);
              }
              if (item.targetDate) {
                subtitleParts.push(item.targetDate);
              }
              return (
                <SimpleItemRow
                  kind="checkbox"
                  title={item.title}
                  subtitle={subtitleParts.join(' · ') || undefined}
                  body={item.why}
                  done={item.done}
                  onToggle={() =>
                    updateItem(item.id, {
                      done: !item.done,
                      completedAt: !item.done ? new Date().toISOString() : undefined,
                    })
                  }
                  onPress={() =>
                    router.push({ pathname: '/goal-detail', params: { id: item.id } })
                  }
                />
              );
            }}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        )}
        <Fab href="/goal" />
      </View>
    </SwipeableScreen>
  );
}
