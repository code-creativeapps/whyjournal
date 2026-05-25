import { format, isSameDay, startOfDay, startOfWeek, subDays } from 'date-fns';
import { router } from 'expo-router';
import { CheckIcon } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Habit, HabitCompletion } from '@/lib/habits/types';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { cn } from '@/lib/utils';

const DAY_FORMAT = 'yyyy-MM-dd';

type Tab = 'daily' | 'weekly';

export default function HabitsScreen() {
  const habits = useHabitsStore((s) => s.items);
  const hydrated = useHabitsStore((s) => s.hydrated);
  const completions = useHabitCompletionsStore((s) => s.items);
  const addCompletion = useHabitCompletionsStore((s) => s.addCompletion);
  const removeLatest = useHabitCompletionsStore((s) => s.removeLatest);
  const removeOnDay = useHabitCompletionsStore((s) => s.removeOnDay);

  const [tab, setTab] = React.useState<Tab>('daily');

  const filtered = React.useMemo(
    () =>
      habits.filter((h) =>
        tab === 'daily' ? h.frequencyKind === 'daily' : h.frequencyKind === 'weekly'
      ),
    [habits, tab]
  );

  const handleTap = React.useCallback(
    (habit: Habit) => {
      if (habit.frequencyKind === 'daily') {
        const today = startOfDay(new Date());
        const doneToday = completions.some(
          (c) => c.habitId === habit.id && isSameDay(new Date(c.completedAt), today)
        );
        if (doneToday) {
          removeOnDay(habit.id, today).catch(() => {});
        } else {
          addCompletion(habit.id, isoForNoon(today)).catch(() => {});
        }
        return;
      }
      const count = countCompletionsThisWeek(habit, completions);
      if (count >= habit.timesPerPeriod) {
        removeLatest(habit.id).catch(() => {});
        return;
      }
      addCompletion(habit.id).catch(() => {});
    },
    [addCompletion, completions, removeLatest, removeOnDay]
  );

  const handleUndo = React.useCallback(
    (habit: Habit) => {
      if (habit.frequencyKind === 'daily') {
        removeOnDay(habit.id, startOfDay(new Date())).catch(() => {});
      } else {
        removeLatest(habit.id).catch(() => {});
      }
    },
    [removeLatest, removeOnDay]
  );

  const insets = useSafeAreaInsets();

  return (
    <SwipeableScreen route="habits">
      <View className="flex-1">
        <SegmentedTab value={tab} onChange={setTab} />
        {hydrated && habits.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <Text variant="h3" className="text-center">
              Build a habit
            </Text>
            <Text variant="muted" className="text-center">
              Add a habit you want to do every day or a few times a week. Tap the circle to
              mark it done.
            </Text>
          </View>
        ) : (
          <FlatList
            key={tab}
            data={filtered}
            keyExtractor={(h) => h.id}
            renderItem={({ item, index }) => (
              <HabitRow
                habit={item}
                completions={completions}
                onTap={() => handleTap(item)}
                onLongPress={() => handleUndo(item)}
                showTodayLabel={index === 0}
              />
            )}
            ListEmptyComponent={
              <View className="px-8 py-16">
                <Text variant="muted" className="text-center">
                  {tab === 'daily'
                    ? 'No daily habits yet.'
                    : 'No weekly habits yet.'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 96 }}
          />
        )}
        <Fab href="/habit" />
      </View>
    </SwipeableScreen>
  );
}

function SegmentedTab({ value, onChange }: { value: Tab; onChange: (v: Tab) => void }) {
  return (
    <View className="mx-4 mt-3 flex-row rounded-full bg-muted p-1">
      {(
        [
          { key: 'daily', label: 'Daily' },
          { key: 'weekly', label: 'Weekly' },
        ] as { key: Tab; label: string }[]
      ).map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            className={cn(
              'flex-1 items-center rounded-full py-1.5',
              active && 'bg-background shadow-sm'
            )}>
            <Text
              className={cn(
                'text-sm font-medium',
                active ? 'text-foreground' : 'text-muted-foreground'
              )}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function isoForNoon(day: Date): string {
  const d = new Date(day);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function useDayCounts(habit: Habit, completions: HabitCompletion[]) {
  return React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of completions) {
      if (c.habitId !== habit.id) continue;
      const key = format(startOfDay(new Date(c.completedAt)), DAY_FORMAT);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [completions, habit.id]);
}

function targetThisWeek(habit: Habit): number {
  if (habit.frequencyKind === 'daily') {
    const len = habit.daysOfWeek.length;
    return len === 0 ? 7 : len;
  }
  return habit.timesPerPeriod;
}

function daysDoneThisWeek(habit: Habit, completions: HabitCompletion[]): number {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = new Set<string>();
  for (const c of completions) {
    if (c.habitId !== habit.id) continue;
    const d = new Date(c.completedAt);
    if (d < weekStart) continue;
    days.add(format(startOfDay(d), DAY_FORMAT));
  }
  return days.size;
}

function countCompletionsThisWeek(habit: Habit, completions: HabitCompletion[]): number {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  let n = 0;
  for (const c of completions) {
    if (c.habitId !== habit.id) continue;
    if (new Date(c.completedAt) < weekStart) continue;
    n++;
  }
  return n;
}

function isDoneToday(habit: Habit, completions: HabitCompletion[]): boolean {
  const today = startOfDay(new Date());
  return completions.some(
    (c) => c.habitId === habit.id && isSameDay(new Date(c.completedAt), today)
  );
}

function HabitRow({
  habit,
  completions,
  onTap,
  onLongPress,
  showTodayLabel,
}: {
  habit: Habit;
  completions: HabitCompletion[];
  onTap: () => void;
  onLongPress: () => void;
  showTodayLabel?: boolean;
}) {
  const target = targetThisWeek(habit);
  const count =
    habit.frequencyKind === 'daily'
      ? daysDoneThisWeek(habit, completions)
      : countCompletionsThisWeek(habit, completions);
  const checked =
    habit.frequencyKind === 'daily' ? isDoneToday(habit, completions) : count >= target;

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable
        onPress={() => router.push({ pathname: '/habit-detail', params: { id: habit.id } })}
        className="px-4 py-3 pr-5 active:opacity-70">
        <View className="flex-row items-center gap-3">
          <Text className="flex-1 text-base" numberOfLines={1}>
            {habit.title}
          </Text>
          {showTodayLabel ? (
            <Text variant="muted" className="text-xs">
              Today
            </Text>
          ) : null}
        </View>
        <View className="mt-2 flex-row items-center gap-4">
          <View className="flex-1">
            <DotStack habit={habit} completions={completions} />
          </View>
          <HabitCheckbox checked={checked} onTap={onTap} onLongPress={onLongPress} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const DOT_PX = 12;
const INTRA_GAP_PX = 4;
const INTER_WEEK_GAP_PX = 10;

function DotStack({ habit, completions }: { habit: Habit; completions: HabitCompletion[] }) {
  const [width, setWidth] = React.useState(0);
  const dayCounts = useDayCounts(habit, completions);

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  }, []);

  const groups = React.useMemo(() => {
    if (width <= 0) return [];
    const today = startOfDay(new Date());
    // Walk backward from today, day by day, until we'd exceed the available width.
    // Going from a Monday back to the prior Sunday crosses a week boundary, so add
    // the larger inter-week gap instead of the intra-week gap.
    const days: Date[] = [today];
    let used = DOT_PX;
    let cursor = today;
    for (let i = 0; i < 365; i++) {
      const wasMonday = cursor.getDay() === 1; // Mon = 1 with weekStartsOn=1
      const addWidth = (wasMonday ? INTER_WEEK_GAP_PX : INTRA_GAP_PX) + DOT_PX;
      if (used + addWidth > width) break;
      used += addWidth;
      cursor = subDays(cursor, 1);
      days.unshift(cursor);
    }
    // Group consecutive days by ISO week (Mon..Sun).
    const out: { weekStart: Date; days: Date[] }[] = [];
    let lastKey: string | null = null;
    for (const d of days) {
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(ws, DAY_FORMAT);
      if (key !== lastKey) {
        out.push({ weekStart: ws, days: [] });
        lastKey = key;
      }
      out[out.length - 1].days.push(d);
    }
    return out;
  }, [width]);

  return (
    <View
      onLayout={onLayout}
      className="flex-row items-center justify-end"
      style={{ gap: INTER_WEEK_GAP_PX }}>
      {groups.map((g) => (
        <View
          key={format(g.weekStart, DAY_FORMAT)}
          className="flex-row items-center"
          style={{ gap: INTRA_GAP_PX }}>
          {g.days.map((day) => {
            const key = format(day, DAY_FORMAT);
            const filled = (dayCounts.get(key) ?? 0) > 0;
            return (
              <Animated.View
                key={`${key}-${filled ? 'on' : 'off'}`}
                entering={
                  filled ? ZoomIn.springify().damping(7).stiffness(180).mass(0.6) : undefined
                }
                style={{ width: DOT_PX, height: DOT_PX, borderRadius: DOT_PX / 2 }}
                className={filled ? 'bg-green-500' : 'bg-muted'}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

function HabitCheckbox({
  checked,
  onTap,
  onLongPress,
}: {
  checked: boolean;
  onTap: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable onPress={onTap} onLongPress={onLongPress} delayLongPress={350} hitSlop={12}>
      <View
        className={cn(
          'size-6 items-center justify-center rounded-full border-2',
          checked ? 'border-green-500 bg-green-500' : 'border-muted-foreground/40 bg-transparent'
        )}>
        {checked ? <Icon as={CheckIcon} size={14} className="text-white" /> : null}
      </View>
    </Pressable>
  );
}
