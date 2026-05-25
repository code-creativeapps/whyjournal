import {
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlameIcon,
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
import { currentStreak } from '@/lib/habits/frequency';
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
      <ScrollView contentContainerClassName="gap-6 px-6 pt-12 pb-10">
        <View className="items-center gap-4">
          <View className="size-20 items-center justify-center rounded-full bg-violet-500/15">
            <Icon as={RepeatIcon} size={40} className="text-violet-500" />
          </View>
          <Text variant="h2" className="text-center">
            {habit.title}
          </Text>
          <Text variant="muted" className="text-center text-sm">
            {habit.frequencyKind === 'daily'
              ? `${habit.timesPerPeriod}× per day`
              : `${habit.timesPerPeriod}× per week`}
          </Text>
          {routine || goal ? (
            <View className="flex-row flex-wrap justify-center gap-2">
              {routine ? (
                <View className="flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                  <Icon as={LayersIcon} size={13} className="text-muted-foreground" />
                  <Text variant="small" className="text-sm text-muted-foreground">
                    {routine.title}
                  </Text>
                </View>
              ) : null}
              {goal ? (
                <View className="flex-row items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1">
                  <Icon as={TargetIcon} size={13} className="text-red-500" />
                  <Text variant="small" className="text-sm text-red-600">
                    {goal.title}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {habit.body ? (
          <Text className="text-center text-base leading-7 text-foreground">
            {habit.body}
          </Text>
        ) : null}

        {streak > 0 ? (
          <View className="flex-row justify-center">
            <View className="flex-row items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1">
              <Icon as={FlameIcon} size={13} className="text-orange-500" />
              <Text variant="small" className="text-xs font-semibold text-orange-600">
                {streak}
                {habit.frequencyKind === 'weekly' ? ' week' : ' day'}
                {streak === 1 ? '' : 's'}
              </Text>
            </View>
          </View>
        ) : null}

        <HistoryGrid habit={habit} completions={completions} onToggleDay={handleToggleDay} />
      </ScrollView>
    </>
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
