import { router } from 'expo-router';
import { TargetIcon } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { goalProgress } from '@/lib/goals/progress';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';

export default function GoalsScreen() {
  const items = useGoalsStore((state) => state.items);
  const hydrated = useGoalsStore((state) => state.hydrated);
  const deleteGoal = useGoalsStore((state) => state.deleteItem);
  const milestones = useMilestonesStore((state) => state.items);
  const insets = useSafeAreaInsets();

  const milestonesByGoal = React.useMemo(() => {
    const map = new Map<string, typeof milestones>();
    for (const m of milestones) {
      const existing = map.get(m.goalId) ?? [];
      existing.push(m);
      map.set(m.goalId, existing);
    }
    return map;
  }, [milestones]);

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
              const linked = milestonesByGoal.get(item.id) ?? [];
              const progress = goalProgress(item, linked);
              const subtitleParts: string[] = [];
              if (linked.length > 0) {
                subtitleParts.push(`${progress.done} / ${progress.total} milestones`);
              }
              if (item.targetDate) {
                subtitleParts.push(item.targetDate);
              }
              return (
                <SwipeableRow
                  onEdit={() => router.push({ pathname: '/goal', params: { id: item.id } })}
                  onDelete={() => deleteGoal(item.id)}
                  deleteConfirmTitle="Delete goal"
                  deleteConfirmBody="Linked milestones will be removed too. This cannot be undone."
                >
                  <SimpleItemRow
                    kind="icon"
                    icon={TargetIcon}
                    iconBgClass="bg-red-500/15"
                    iconColorClass="text-red-500"
                    done={item.done}
                    title={item.title}
                    subtitle={subtitleParts.join(' · ') || undefined}
                    body={item.why}
                    onPress={() =>
                      router.push({ pathname: '/goal-detail', params: { id: item.id } })
                    }
                  />
                </SwipeableRow>
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
