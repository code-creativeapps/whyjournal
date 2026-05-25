import { format, isSameDay, startOfDay, startOfWeek, subWeeks } from 'date-fns';
import { router } from 'expo-router';
import { CheckIcon } from 'lucide-react-native';
import * as React from 'react';
import { FlatList, Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_WEEKS = 5;

type Tab = 'week' | 'month';

function plannedKey(habitId: string, day: Date): string {
  return `${habitId}|${format(day, DAY_FORMAT)}`;
}

export default function HabitsScreen() {
  const habits = useHabitsStore((s) => s.items);
  const hydrated = useHabitsStore((s) => s.hydrated);
  const completions = useHabitCompletionsStore((s) => s.items);
  const addCompletion = useHabitCompletionsStore((s) => s.addCompletion);
  const removeLatest = useHabitCompletionsStore((s) => s.removeLatest);
  const removeOnDay = useHabitCompletionsStore((s) => s.removeOnDay);

  const [tab, setTab] = React.useState<Tab>('week');
  const [planned, setPlanned] = React.useState<Set<string>>(new Set());

  const togglePlanned = React.useCallback((habitId: string, day: Date) => {
    setPlanned((prev) => {
      const key = plannedKey(habitId, day);
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearPlanned = React.useCallback((habitId: string, day: Date) => {
    setPlanned((prev) => {
      const key = plannedKey(habitId, day);
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const handleToggleDay = React.useCallback(
    (habitId: string, day: Date, hit: boolean) => {
      clearPlanned(habitId, day);
      (hit
        ? removeOnDay(habitId, day)
        : addCompletion(habitId, isoForNoon(day))
      ).catch(() => {});
    },
    [addCompletion, removeOnDay, clearPlanned]
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
              Add a habit you want to do every day or a few times a week. Tap today&apos;s circle each time you do it.
            </Text>
          </View>
        ) : (
          <FlatList
            key={tab}
            data={habits}
            keyExtractor={(h) => h.id}
            renderItem={({ item }) =>
              tab === 'week' ? (
                <HabitRowWeek
                  habit={item}
                  completions={completions}
                  planned={planned}
                  onIncrement={() => addCompletion(item.id).catch(() => {})}
                  onDecrement={() => removeLatest(item.id).catch(() => {})}
                  onToggleDay={(day, hit) => handleToggleDay(item.id, day, hit)}
                  onLongPressDay={(day) => togglePlanned(item.id, day)}
                />
              ) : (
                <HabitRowMonth
                  habit={item}
                  completions={completions}
                  planned={planned}
                  onToggleDay={(day, hit) => handleToggleDay(item.id, day, hit)}
                  onLongPressDay={(day) => togglePlanned(item.id, day)}
                />
              )
            }
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 96 }}
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
      {(['week', 'month'] as Tab[]).map((t) => {
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

function isoForNoon(day: Date): string {
  const d = new Date(day);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function isMultiPerDay(habit: Habit): boolean {
  return habit.frequencyKind === 'daily' && habit.timesPerPeriod > 1;
}

function frequencyLabel(habit: Habit): string {
  if (habit.frequencyKind === 'daily') {
    if (habit.timesPerPeriod > 1) return `${habit.timesPerPeriod}× day`;
    const days = habit.daysOfWeek;
    if (days.length === 0 || days.length === 7) return 'Daily';
    return `${days.length}× week`;
  }
  return `${habit.timesPerPeriod}× week`;
}

function HabitHeader({ habit }: { habit: Habit }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3">
      <Text className="flex-1 text-base" numberOfLines={1}>
        {habit.title}
      </Text>
      <Text variant="muted" className="text-xs">
        {frequencyLabel(habit)}
      </Text>
    </View>
  );
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

function dayHit(habit: Habit, count: number): boolean {
  const target = habit.frequencyKind === 'daily' ? habit.timesPerPeriod : 1;
  return count >= target;
}

function HabitRowWeek({
  habit,
  completions,
  planned,
  onIncrement,
  onDecrement,
  onToggleDay,
  onLongPressDay,
}: {
  habit: Habit;
  completions: HabitCompletion[];
  planned: Set<string>;
  onIncrement: () => void;
  onDecrement: () => void;
  onToggleDay: (day: Date, hit: boolean) => void;
  onLongPressDay: (day: Date) => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable
        onPress={() => router.push({ pathname: '/habit-detail', params: { id: habit.id } })}
        className="px-4 py-1.5 active:bg-accent">
        <View className="gap-2">
          <HabitHeader habit={habit} />
          {isMultiPerDay(habit) ? (
            <SlotRow
              habit={habit}
              completions={completions}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          ) : (
            <WeekRow
              habit={habit}
              completions={completions}
              planned={planned}
              onToggleDay={onToggleDay}
              onLongPressDay={onLongPressDay}
            />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function HabitRowMonth({
  habit,
  completions,
  planned,
  onToggleDay,
  onLongPressDay,
}: {
  habit: Habit;
  completions: HabitCompletion[];
  planned: Set<string>;
  onToggleDay: (day: Date, hit: boolean) => void;
  onLongPressDay: (day: Date) => void;
}) {
  const now = new Date();
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weeks = React.useMemo(() => {
    // Oldest week on top, current week on the bottom.
    const out: Date[] = [];
    for (let i = MONTH_WEEKS - 1; i >= 0; i--) {
      out.push(subWeeks(currentWeekStart, i));
    }
    return out;
  }, [currentWeekStart]);

  return (
    <Animated.View entering={FadeIn.duration(180)}>
      <Pressable
        onPress={() => router.push({ pathname: '/habit-detail', params: { id: habit.id } })}
        className="px-4 py-1.5 active:bg-accent">
        <View className="gap-1.5">
          <HabitHeader habit={habit} />
          {weeks.map((weekStart) => (
            <WeekRow
              key={format(weekStart, DAY_FORMAT)}
              habit={habit}
              completions={completions}
              planned={planned}
              onToggleDay={onToggleDay}
              onLongPressDay={onLongPressDay}
              weekStart={weekStart}
            />
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function WeekRow({
  habit,
  completions,
  planned,
  onToggleDay,
  onLongPressDay,
  weekStart,
}: {
  habit: Habit;
  completions: HabitCompletion[];
  planned: Set<string>;
  onToggleDay: (day: Date, hit: boolean) => void;
  onLongPressDay: (day: Date) => void;
  weekStart?: Date;
}) {
  const now = new Date();
  const start = weekStart ?? startOfWeek(now, { weekStartsOn: 1 });
  const today = startOfDay(now);
  const dayCounts = useDayCounts(habit, completions);

  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const isCurrentWeek = isSameDay(start, currentWeekStart);
  const weekLabel = isCurrentWeek ? 'This wk' : format(start, 'MMM d');

  return (
    <View className="flex-row items-center gap-2">
      <Text variant="muted" className="w-14 text-xs">
        {weekLabel}
      </Text>
      <View className="flex-1 flex-row items-center gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        const key = format(day, DAY_FORMAT);
        const count = dayCounts.get(key) ?? 0;
        const hit = dayHit(habit, count);
        const isToday = isSameDay(day, today);
        const isFuture = day.getTime() > today.getTime();
        const isPlanned = !hit && planned.has(plannedKey(habit.id, day));

        return (
          <Pressable
            key={i}
            onPress={() => onToggleDay(day, hit)}
            onLongPress={!hit ? () => onLongPressDay(day) : undefined}
            delayLongPress={250}
            hitSlop={6}
            className={cn(
              'size-6 items-center justify-center rounded-full',
              hit
                ? 'bg-green-500/15'
                : isPlanned
                  ? 'bg-violet-500/25'
                  : isToday
                    ? 'bg-violet-500/15'
                    : isFuture
                      ? 'bg-muted/50'
                      : 'bg-muted'
            )}>
            {hit ? (
              <Icon as={CheckIcon} size={14} className="text-green-500" />
            ) : (
              <Text
                className={cn(
                  'text-xs font-semibold',
                  isPlanned || isToday
                    ? 'text-violet-500'
                    : isFuture
                      ? 'text-muted-foreground/50'
                      : 'text-muted-foreground'
                )}>
                {WEEK_LABELS[i]}
              </Text>
            )}
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

function SlotRow({
  habit,
  completions,
  onIncrement,
  onDecrement,
}: {
  habit: Habit;
  completions: HabitCompletion[];
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  const today = startOfDay(new Date());
  const doneToday = completions.filter(
    (c) => c.habitId === habit.id && isSameDay(new Date(c.completedAt), today)
  ).length;
  const target = habit.timesPerPeriod;

  const cells = Math.max(target, 7);

  return (
    <View className="flex-row items-center gap-2">
      <Text variant="muted" className="w-14 text-xs">
        Today
      </Text>
      <View className="flex-1 flex-row items-center gap-1.5">
      {Array.from({ length: cells }).map((_, i) => {
        if (i >= target) return <View key={i} className="size-6" />;
        const filled = i < doneToday;
        const isNextEmpty = i === doneToday;
        const isLastFilled = filled && i === doneToday - 1;
        const onPress = isNextEmpty
          ? onIncrement
          : isLastFilled
            ? onDecrement
            : undefined;

        return (
          <Pressable
            key={i}
            onPress={onPress}
            disabled={!onPress}
            hitSlop={6}
            className={cn(
              'size-6 items-center justify-center rounded-full',
              filled
                ? 'bg-green-500/15'
                : isNextEmpty
                  ? 'bg-violet-500/15'
                  : 'bg-muted'
            )}>
            {filled ? <Icon as={CheckIcon} size={14} className="text-green-500" /> : null}
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}
