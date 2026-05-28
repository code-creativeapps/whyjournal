import { isSameDay, startOfDay } from 'date-fns';
import { router } from 'expo-router';
import { CheckIcon, DiamondIcon, RepeatIcon } from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, SectionList, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EntryRow } from '@/components/entry-row';
import { Fab } from '@/components/fab';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { onCelebrate } from '@/lib/celebrate';
import { groupEntries } from '@/lib/grouping';
import { useEntriesStore } from '@/lib/stores/entries';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useTodosStore } from '@/lib/stores/todos';

const SCREEN_WIDTH = Dimensions.get('window').width;

type ActivityItem = {
  key: string;
  kind: 'habit' | 'todo' | 'milestone';
  title: string;
};

function useTodayActivity(): ActivityItem[] {
  const habits = useHabitsStore((s) => s.items);
  const completions = useHabitCompletionsStore((s) => s.items);
  const todos = useTodosStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);

  return React.useMemo(() => {
    const today = startOfDay(new Date());
    const out: ActivityItem[] = [];

    const habitTitle = new Map(habits.map((h) => [h.id, h.title]));
    const seenHabit = new Set<string>();
    for (const c of completions) {
      if (!isSameDay(new Date(c.completedAt), today)) continue;
      if (seenHabit.has(c.habitId)) continue;
      seenHabit.add(c.habitId);
      const title = habitTitle.get(c.habitId);
      if (title) out.push({ key: `habit-${c.habitId}`, kind: 'habit', title });
    }
    for (const t of todos) {
      if (t.done && t.completedAt && isSameDay(new Date(t.completedAt), today)) {
        out.push({ key: `todo-${t.id}`, kind: 'todo', title: t.title });
      }
    }
    for (const m of milestones) {
      if (m.done && m.completedAt && isSameDay(new Date(m.completedAt), today)) {
        out.push({ key: `milestone-${m.id}`, kind: 'milestone', title: m.title });
      }
    }
    return out;
  }, [habits, completions, todos, milestones]);
}

function TodayActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;
  return (
    <View className="mx-4 mb-2 mt-3 gap-2 rounded-2xl border border-border bg-background p-3">
      <Text variant="small" className="text-muted-foreground">
        Done today
      </Text>
      {items.map((it) => (
        <View key={it.key} className="flex-row items-center gap-2">
          <View className="size-5 items-center justify-center rounded-full bg-green-500/15">
            <Icon
              as={it.kind === 'milestone' ? DiamondIcon : it.kind === 'habit' ? RepeatIcon : CheckIcon}
              size={12}
              className="text-green-600"
            />
          </View>
          <Text className="flex-1 text-sm" numberOfLines={1}>
            {it.title}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function JournalScreen() {
  const entries = useEntriesStore((state) => state.entries);
  const hydrated = useEntriesStore((state) => state.hydrated);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);
  const cannon = React.useRef<ConfettiCannon>(null);
  const insets = useSafeAreaInsets();

  const sections = React.useMemo(() => groupEntries(entries), [entries]);
  const todayActivity = useTodayActivity();

  React.useEffect(() => onCelebrate(() => cannon.current?.start()), []);

  return (
    <SwipeableScreen route="index">
      <View className="flex-1">
      {hydrated && entries.length === 0 && todayActivity.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text variant="h3" className="text-center">
            Start with one win today
          </Text>
          <Text variant="muted" className="text-center">
            Capture a small win or something you&apos;re grateful for. It takes less than a minute.
          </Text>
        </View>
      ) : (
        <>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={<TodayActivity items={todayActivity} />}
            renderItem={({ item }) => (
              <SwipeableRow
                onEdit={() => router.push({ pathname: '/new', params: { id: item.id } })}
                onDelete={() => deleteEntry(item.id)}
                deleteConfirmTitle="Delete entry"
              >
                <EntryRow entry={item} />
              </SwipeableRow>
            )}
            renderSectionHeader={({ section }) => (
              <View className="bg-background px-4 pb-1 pt-3">
                <Text variant="small" className="text-muted-foreground">
                  {section.title}
                </Text>
              </View>
            )}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        </>
      )}
      <Fab href="/new" />
      <View pointerEvents="none" className="absolute inset-0">
        <ConfettiCannon
          ref={cannon}
          count={120}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={2800}
        />
      </View>
      </View>
    </SwipeableScreen>
  );
}
