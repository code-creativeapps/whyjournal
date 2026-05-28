import {
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  LayersIcon,
  PencilIcon,
  RepeatIcon,
  TargetIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { currentStreak, longestStreak } from '@/lib/habits/frequency';
import type { Habit, HabitCompletion } from '@/lib/habits/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useRoutinesStore } from '@/lib/stores/routines';
import { cn } from '@/lib/utils';

const DAY_FORMAT = 'yyyy-MM-dd';
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HISTORY_MONTHS = 12;
const HISTORY_DOT_PX = 30;
const HISTORY_GAP_PX = 8;

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const habit = useHabitsStore((s) =>
    id ? (s.items.find((h) => h.id === id) as Habit | undefined) : undefined
  );

  const completions = useHabitCompletionsStore((s) => s.items);
  const addCompletion = useHabitCompletionsStore((s) => s.addCompletion);
  const removeOnDay = useHabitCompletionsStore((s) => s.removeOnDay);

  const routine = useRoutinesStore((s) =>
    habit?.routineId ? s.items.find((r) => r.id === habit.routineId) : undefined
  );
  const goal = useGoalsStore((s) =>
    habit?.goalId ? s.items.find((g) => g.id === habit.goalId) : undefined
  );

  React.useEffect(() => {
    if (id && !habit && router.canGoBack()) router.back();
  }, [id, habit]);

  if (!habit) return null;

  const streak = currentStreak(habit, completions);
  const best = longestStreak(habit, completions);
  const totalCount = completions.filter((c) => c.habitId === habit.id).length;
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(today);
  const habitDaysThisMonth = new Set<string>();
  for (const c of completions) {
    if (c.habitId !== habit.id) continue;
    const d = startOfDay(new Date(c.completedAt));
    if (isSameMonth(d, today)) habitDaysThisMonth.add(format(d, DAY_FORMAT));
  }
  const daysDoneThisMonth = habitDaysThisMonth.size;
  const daysElapsedThisMonth =
    Math.floor((today.getTime() - monthStart.getTime()) / 86400000) + 1;
  const monthRatio =
    daysElapsedThisMonth > 0
      ? Math.min(daysDoneThisMonth / daysElapsedThisMonth, 1)
      : 0;
  const periodLabel = habit.timesPerWeek === 7 ? 'day' : 'wk';
  const frequencyLabel = describeFrequency(habit);

  function handleToggleDay(day: Date, filled: boolean) {
    if (!habit) return;
    if (filled) {
      removeOnDay(habit.id, day).catch(() => {});
    } else {
      const d = new Date(day);
      d.setHours(12, 0, 0, 0);
      addCompletion(habit.id, d.toISOString()).catch(() => {});
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Habit',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/habit', params: { id: habit.id } })
              }
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="gap-5 px-6 pt-6 pb-10">
        <View className="flex-row items-center gap-3">
          <View className="size-12 items-center justify-center rounded-full bg-violet-500/15">
            <Icon as={RepeatIcon} size={22} className="text-violet-500" />
          </View>
          <View className="flex-1">
            <Text variant="h3" numberOfLines={1}>
              {habit.title}
            </Text>
            <View className="mt-1 flex-row flex-wrap items-center gap-x-2 gap-y-1">
              <Text variant="muted" className="text-sm">
                {frequencyLabel}
              </Text>
              {goal ? (
                <Pressable
                  onPress={() =>
                    router.replace({ pathname: '/goal-detail', params: { id: goal.id } })
                  }
                  hitSlop={6}
                  className="flex-row items-center gap-1 active:opacity-60">
                  <Icon as={TargetIcon} size={12} className="text-red-500" />
                  <Text variant="muted" className="text-xs" numberOfLines={1}>
                    {goal.title}
                  </Text>
                </Pressable>
              ) : null}
              {routine ? (
                <View className="flex-row items-center gap-1">
                  <Icon as={LayersIcon} size={12} className="text-muted-foreground" />
                  <Text variant="muted" className="text-xs" numberOfLines={1}>
                    {routine.title}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {habit.body ? (
          <Text className="text-sm leading-6 text-muted-foreground">{habit.body}</Text>
        ) : null}

        <View className="flex-row gap-2">
          <StatCard label="Streak" value={String(streak)} suffix={periodLabel} />
          <StatCard label="Best" value={String(best)} suffix={periodLabel} />
          <StatCard
            label={format(today, 'MMM')}
            value={String(daysDoneThisMonth)}
            suffix={`/ ${daysElapsedThisMonth}`}
          />
          <StatCard label="Total" value={String(totalCount)} />
        </View>

        <View className="gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text variant="muted" className="text-xs">
              {format(today, 'MMMM')} progress
            </Text>
            <Text variant="muted" className="text-xs">
              {Math.round(monthRatio * 100)}%
            </Text>
          </View>
          <View className="h-1.5 overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-green-500"
              style={{ width: `${monthRatio * 100}%` }}
            />
          </View>
        </View>

        <HistoryGrid habit={habit} completions={completions} onToggleDay={handleToggleDay} />
      </ScrollView>
    </>
  );
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function describeFrequency(habit: Habit): string {
  const fixed = habit.fixedDays;
  if (fixed && fixed.length === 1) {
    return `Every ${DAY_NAMES_LONG[fixed[0]]}`;
  }
  if (fixed && fixed.length > 1 && fixed.length < 7) {
    const days = fixed
      .slice()
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES_SHORT[d])
      .join(', ');
    return `${days} · ${fixed.length}× per week`;
  }
  if (habit.timesPerWeek === 7) return 'Every day';
  return `${habit.timesPerWeek}× per week`;
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <View className="flex-1 gap-0.5 rounded-2xl border border-border bg-background px-3 py-2.5">
      <Text variant="muted" className="text-[10px] uppercase tracking-wide">
        {label}
      </Text>
      <View className="flex-row items-baseline gap-1">
        <Text className="text-xl font-semibold">{value}</Text>
        {suffix ? (
          <Text variant="muted" className="text-xs">
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function HistoryGrid({
  habit,
  completions,
  onToggleDay,
}: {
  habit: Habit;
  completions: HabitCompletion[];
  onToggleDay: (day: Date, filled: boolean) => void;
}) {
  const dayCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const c of completions) {
      if (c.habitId !== habit.id) continue;
      const key = format(startOfDay(new Date(c.completedAt)), DAY_FORMAT);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [completions, habit.id]);

  const today = startOfDay(new Date());

  const [showLabels, setShowLabels] = React.useState(false);
  const [monthOffset, setMonthOffset] = React.useState(0);

  const monthStart = React.useMemo(
    () => startOfMonth(subMonths(today, monthOffset)),
    [today, monthOffset]
  );
  const canGoForward = monthOffset > 0;
  const canGoBack = monthOffset < HISTORY_MONTHS - 1;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => canGoBack && setMonthOffset((o) => o + 1)}
          disabled={!canGoBack}
          hitSlop={10}
          className="p-1"
          style={{ opacity: canGoBack ? 1 : 0.3 }}>
          <Icon as={ChevronLeftIcon} size={20} className="text-foreground" />
        </Pressable>
        <Text className="text-base font-semibold">
          {format(monthStart, 'MMMM yyyy')}
        </Text>
        <Pressable
          onPress={() => canGoForward && setMonthOffset((o) => o - 1)}
          disabled={!canGoForward}
          hitSlop={10}
          className="p-1"
          style={{ opacity: canGoForward ? 1 : 0.3 }}>
          <Icon as={ChevronRightIcon} size={20} className="text-foreground" />
        </Pressable>
      </View>

      <View className="flex-row justify-end">
        <Pressable
          onPress={() => setShowLabels((s) => !s)}
          hitSlop={8}
          className="px-2 py-1">
          <Text variant="muted" className="text-xs">
            {showLabels ? 'Hide labels' : 'Show labels'}
          </Text>
        </Pressable>
      </View>

      <MonthGrid
        monthStart={monthStart}
        today={today}
        dayCounts={dayCounts}
        showLabels={showLabels}
        onToggleDay={onToggleDay}
      />
    </View>
  );
}

function MonthGrid({
  monthStart,
  today,
  dayCounts,
  showLabels,
  onToggleDay,
}: {
  monthStart: Date;
  today: Date;
  dayCounts: Map<string, number>;
  showLabels: boolean;
  onToggleDay: (day: Date, filled: boolean) => void;
}) {
  const monthIndex = monthStart.getMonth();
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const weeks = React.useMemo(() => {
    const out: Date[] = [];
    let cursor = gridStart;
    while (cursor.getTime() <= gridEnd.getTime()) {
      out.push(cursor);
      cursor = addWeeks(cursor, 1);
    }
    while (out.length < 6) {
      out.push(addWeeks(out[out.length - 1], 1));
    }
    return out;
  }, [gridStart, gridEnd]);

  const dotStyle = {
    width: HISTORY_DOT_PX,
    height: HISTORY_DOT_PX,
    borderRadius: HISTORY_DOT_PX / 2,
  };

  return (
    <View className="items-center">
      <View style={{ gap: HISTORY_GAP_PX }}>
        {weeks.map((weekStart) => (
          <View
            key={format(weekStart, DAY_FORMAT)}
            className="flex-row"
            style={{ gap: HISTORY_GAP_PX }}>
            {Array.from({ length: 7 }).map((_, i) => {
              const day = new Date(weekStart);
              day.setDate(weekStart.getDate() + i);
              const isInMonth = day.getMonth() === monthIndex;
              const isFuture = day.getTime() > today.getTime();
              const key = format(day, DAY_FORMAT);
              const filled = (dayCounts.get(key) ?? 0) > 0;
              const letter = DAY_LETTERS[i];

              return (
                <View
                  key={i}
                  className="items-center"
                  style={{ width: HISTORY_DOT_PX }}>
                  {showLabels ? (
                    <Text
                      variant="muted"
                      className="mb-1 text-[10px]"
                      style={{ opacity: isInMonth ? 1 : 0.3 }}>
                      {day.getDate()}
                    </Text>
                  ) : null}
                  {isInMonth ? (
                    <Pressable
                      disabled={isFuture}
                      onPress={() => onToggleDay(day, filled)}
                      hitSlop={4}>
                      {filled ? (
                        <Animated.View
                          key={`${key}-on-${showLabels ? 'l' : 'n'}`}
                          entering={ZoomIn.springify().damping(7).stiffness(180).mass(0.6)}
                          style={dotStyle}
                          className="items-center justify-center bg-green-500">
                          {showLabels ? (
                            <Text className="text-[11px] font-semibold text-white">
                              {letter}
                            </Text>
                          ) : null}
                        </Animated.View>
                      ) : (
                        <View
                          key={`${key}-off-${showLabels ? 'l' : 'n'}`}
                          style={dotStyle}
                          className={cn(
                            'items-center justify-center',
                            isFuture ? 'bg-muted/40' : 'bg-muted'
                          )}>
                          {showLabels ? (
                            <Text className="text-[11px] font-semibold text-muted-foreground">
                              {letter}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </Pressable>
                  ) : (
                    <View
                      style={dotStyle}
                      className="items-center justify-center bg-muted/30">
                      {showLabels ? (
                        <Text
                          className="text-[11px] font-semibold text-muted-foreground"
                          style={{ opacity: 0.5 }}>
                          {letter}
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
