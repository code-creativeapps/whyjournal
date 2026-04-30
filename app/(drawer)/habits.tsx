import { router } from 'expo-router';
import { CheckIcon, FlameIcon, PlusIcon, RepeatIcon } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, SectionList, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FabRow } from '@/components/fab-row';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  appliesToday,
  currentStreak,
  last7Days,
  progressForToday,
  upcomingDaysThisWeek,
} from '@/lib/habits/frequency';
import type { Habit, HabitCompletion } from '@/lib/habits/types';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useRoutinesStore } from '@/lib/stores/routines';
import { cn } from '@/lib/utils';

type Tab = 'today' | 'trends';

export default function HabitsScreen() {
  const habits = useHabitsStore((s) => s.items);
  const hydrated = useHabitsStore((s) => s.hydrated);
  const deleteHabit = useHabitsStore((s) => s.deleteItem);
  const routines = useRoutinesStore((s) => s.items);
  const completions = useHabitCompletionsStore((s) => s.items);
  const addCompletion = useHabitCompletionsStore((s) => s.addCompletion);

  const [tab, setTab] = React.useState<Tab>('today');
  const insets = useSafeAreaInsets();

  return (
    <SwipeableScreen route="habits">
      <View className="flex-1">
        <SegmentedTab value={tab} onChange={setTab} />
        <View key={tab} className="flex-1">
          {tab === 'today' ? (
            <TodayList
              habits={habits}
              routines={routines}
              completions={completions}
              onIncrement={(h) => addCompletion(h.id).catch(() => {})}
              onDelete={(h) => deleteHabit(h.id).catch(() => {})}
              hydrated={hydrated}
              paddingBottom={insets.bottom + 96}
            />
          ) : (
            <MockTrendsList paddingBottom={insets.bottom + 96} />
          )}
        </View>
        <FabRow href="/habit" />
      </View>
    </SwipeableScreen>
  );
}

function SegmentedTab({ value, onChange }: { value: Tab; onChange: (v: Tab) => void }) {
  return (
    <View className="mx-4 mt-3 flex-row rounded-full bg-muted p-1">
      {(['today', 'trends'] as Tab[]).map((t) => {
        const active = value === t;
        return (
          <Pressable
            key={t}
            onPress={() => onChange(t)}
            className={cn(
              'flex-1 items-center rounded-full py-1.5',
              active && 'bg-background shadow-sm'
            )}>
            <Text
              className={cn(
                'text-sm font-medium capitalize',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {t}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type Section = { title: string; data: Habit[] };

function TodayList({
  habits,
  routines,
  completions,
  onIncrement,
  onDelete,
  hydrated,
  paddingBottom,
}: {
  habits: Habit[];
  routines: { id: string; title: string }[];
  completions: HabitCompletion[];
  onIncrement: (h: Habit) => void;
  onDelete: (h: Habit) => void;
  hydrated: boolean;
  paddingBottom: number;
}) {
  const sections = React.useMemo<Section[]>(() => {
    const today: Habit[] = [];
    const later: Habit[] = [];
    for (const h of habits) {
      if (appliesToday(h)) today.push(h);
      else if (upcomingDaysThisWeek(h).length > 0) later.push(h);
    }
    const byRoutine = new Map<string | null, Habit[]>();
    for (const h of today) {
      const key = h.routineId ?? null;
      const list = byRoutine.get(key) ?? [];
      list.push(h);
      byRoutine.set(key, list);
    }
    const out: Section[] = [];
    for (const r of routines) {
      const items = byRoutine.get(r.id);
      if (items?.length) out.push({ title: r.title, data: items });
    }
    const other = byRoutine.get(null);
    if (other?.length) {
      out.push({ title: routines.length > 0 ? 'Other' : '', data: other });
    }
    if (later.length > 0) out.push({ title: 'Later this week', data: later });
    return out;
  }, [habits, routines]);

  if (hydrated && sections.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text variant="h3" className="text-center">
          Build a habit
        </Text>
        <Text variant="muted" className="text-center">
          Add a habit you want to do every day or a few times a week. Tap + each time you do it.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) =>
        section.title ? (
          <View className="bg-background px-4 pb-1 pt-4">
            <Text variant="small" className="text-muted-foreground">
              {section.title}
            </Text>
          </View>
        ) : (
          <View className="h-3" />
        )
      }
      renderItem={({ item }) => (
        <SwipeableRow
          onEdit={() => router.push({ pathname: '/habit', params: { id: item.id } })}
          onDelete={() => onDelete(item)}
          deleteConfirmTitle="Delete habit"
          deleteConfirmBody="Its completions will be removed too."
        >
          <HabitTodayRow habit={item} completions={completions} onIncrement={onIncrement} />
        </SwipeableRow>
      )}
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      contentContainerStyle={{ paddingBottom }}
    />
  );
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function HabitTodayRow({
  habit,
  completions,
  onIncrement,
}: {
  habit: Habit;
  completions: HabitCompletion[];
  onIncrement: (h: Habit) => void;
}) {
  const today = appliesToday(habit);
  const { done, target, ratio } = progressForToday(habit, completions);
  const isDone = done >= target;
  const upcoming = today ? [] : upcomingDaysThisWeek(habit);

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable
        onPress={() => router.push({ pathname: '/habit-detail', params: { id: habit.id } })}
        className="active:bg-accent">
        <View className="flex-row items-center gap-3 px-4 py-2">
          <View className="size-6 items-center justify-center rounded-full bg-violet-500/15">
            <Icon as={RepeatIcon} size={14} className="text-violet-500" />
          </View>
          <View className="flex-1">
            <Text
              className={cn(
                'text-base',
                isDone && today && 'text-muted-foreground line-through',
                !today && 'text-muted-foreground'
              )}
              numberOfLines={1}>
              {habit.title}
            </Text>
            <Text variant="muted" className="text-xs">
              {today
                ? `${done} / ${target} ${habit.frequencyKind === 'weekly' ? 'this week' : 'today'}`
                : `Next: ${upcoming.map((d) => DAY_SHORT[d]).join(', ')}`}
            </Text>
          </View>
          {today ? (
            isDone ? (
              <View className="size-9 items-center justify-center rounded-full bg-green-500/20">
                <Icon as={CheckIcon} size={18} className="text-green-600" />
              </View>
            ) : (
              <Pressable
                onPress={() => onIncrement(habit)}
                hitSlop={8}
                className="size-9 items-center justify-center rounded-full bg-violet-500">
                <Icon as={PlusIcon} size={18} className="text-white" />
              </Pressable>
            )
          ) : null}
        </View>
        {today && target > 1 ? (
          <View className="mx-4 mb-2 h-1 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-violet-500"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

// Real trends list — temporarily replaced by MockTrendsList to preview the
// "after a few weeks of tracking" UX without needing real completion data.
// Restore by swapping <MockTrendsList /> back to <TrendsList ... />.
/*
function TrendsList({
  habits,
  completions,
  paddingBottom,
}: {
  habits: Habit[];
  completions: HabitCompletion[];
  paddingBottom: number;
}) {
  if (habits.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text variant="muted" className="text-center">
          Add a habit to start tracking trends.
        </Text>
      </View>
    );
  }
  return (
    <FlatList
      data={habits}
      keyExtractor={(h) => h.id}
      renderItem={({ item }) => (
        <TrendCard habit={item} completions={completions} />
      )}
      contentContainerStyle={{ paddingTop: 8, paddingBottom }}
    />
  );
}

function TrendCard({
  habit,
  completions,
}: {
  habit: Habit;
  completions: HabitCompletion[];
}) {
  const days = last7Days(habit, completions);
  const streak = currentStreak(habit, completions);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/habit-detail', params: { id: habit.id } })}
      className="mx-3 my-1.5 rounded-2xl border border-border bg-background p-4 active:opacity-80">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
          {habit.title}
        </Text>
        {streak > 0 ? (
          <View className="flex-row items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5">
            <Icon as={FlameIcon} size={12} className="text-orange-500" />
            <Text variant="small" className="text-xs font-semibold text-orange-600">
              {streak}
              {habit.frequencyKind === 'weekly' ? 'w' : 'd'}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="mt-3 flex-row gap-1">
        {days.map((d) => (
          <View
            key={d.date}
            className={cn(
              'h-7 flex-1 rounded',
              d.hit ? 'bg-violet-500' : 'bg-muted'
            )}
          />
        ))}
      </View>
    </Pressable>
  );
}
*/

type MockHabit = {
  id: string;
  title: string;
  frequencyKind: 'daily' | 'weekly';
  streak: number;
  /** Last 7 days, oldest to newest. true = target hit that day. */
  days: boolean[];
  total: number;
};

const MOCK_HABITS: MockHabit[] = [
  {
    id: 'm1',
    title: 'Drink 8 glasses of water',
    frequencyKind: 'daily',
    streak: 23,
    days: [true, true, true, true, true, true, true],
    total: 67,
  },
  {
    id: 'm2',
    title: 'Read 20 minutes',
    frequencyKind: 'daily',
    streak: 12,
    days: [true, true, false, true, true, true, true],
    total: 45,
  },
  {
    id: 'm3',
    title: 'Exercise',
    frequencyKind: 'weekly',
    streak: 5,
    days: [true, false, true, false, true, false, true],
    total: 22,
  },
  {
    id: 'm4',
    title: 'Meditate',
    frequencyKind: 'daily',
    streak: 7,
    days: [false, true, true, true, true, true, true],
    total: 31,
  },
  {
    id: 'm5',
    title: 'Journal',
    frequencyKind: 'daily',
    streak: 4,
    days: [true, false, true, true, true, true, true],
    total: 18,
  },
  {
    id: 'm6',
    title: 'Run 5k',
    frequencyKind: 'weekly',
    streak: 3,
    days: [false, false, true, false, false, true, false],
    total: 8,
  },
];

function MockTrendsList({ paddingBottom }: { paddingBottom: number }) {
  return (
    <FlatList
      data={MOCK_HABITS}
      keyExtractor={(h) => h.id}
      renderItem={({ item }) => <MockTrendCard habit={item} />}
      ListHeaderComponent={
        <Pressable
          onPress={() => router.push('/habits-trends-lab')}
          className="mx-3 mb-1 mt-1 flex-row items-center justify-center rounded-full border border-dashed border-border px-3 py-2 active:bg-accent">
          <Text variant="muted" className="text-xs">
            Try alternative views →
          </Text>
        </Pressable>
      }
      contentContainerStyle={{ paddingTop: 8, paddingBottom }}
    />
  );
}

function MockTrendCard({ habit }: { habit: MockHabit }) {
  return (
    <View className="mx-3 my-1.5 rounded-2xl border border-border bg-background p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base font-semibold" numberOfLines={1}>
          {habit.title}
        </Text>
        {habit.streak > 0 ? (
          <View className="flex-row items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5">
            <Icon as={FlameIcon} size={12} className="text-orange-500" />
            <Text variant="small" className="text-xs font-semibold text-orange-600">
              {habit.streak}
              {habit.frequencyKind === 'weekly' ? 'w' : 'd'}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="mt-3 flex-row gap-1">
        {habit.days.map((hit, i) => (
          <View
            key={i}
            className={cn(
              'h-7 flex-1 rounded',
              hit ? 'bg-violet-500' : 'bg-muted'
            )}
          />
        ))}
      </View>
      <Text variant="muted" className="mt-2 text-xs">
        {habit.total} total · {habit.frequencyKind === 'weekly' ? 'this week' : 'past 7 days'}
      </Text>
    </View>
  );
}
