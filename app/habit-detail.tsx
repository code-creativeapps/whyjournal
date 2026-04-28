import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  CheckIcon,
  FlameIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  RepeatIcon,
  RotateCcwIcon,
  TargetIcon,
  XIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  currentStreak,
  last7Days,
  progressForToday,
} from '@/lib/habits/frequency';
import type { Habit } from '@/lib/habits/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitCompletionsStore } from '@/lib/stores/habit-completions';
import { useHabitsStore } from '@/lib/stores/habits';
import { useRoutinesStore } from '@/lib/stores/routines';
import { cn } from '@/lib/utils';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const habit = useHabitsStore((s) =>
    id ? (s.items.find((h) => h.id === id) as Habit | undefined) : undefined
  );

  const completions = useHabitCompletionsStore((s) => s.items);
  const addCompletion = useHabitCompletionsStore((s) => s.addCompletion);
  const removeLatest = useHabitCompletionsStore((s) => s.removeLatest);

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

  const { done, target, ratio } = progressForToday(habit, completions);
  const isDone = done >= target;
  const days = last7Days(habit, completions);
  const streak = currentStreak(habit, completions);
  const totalCompletions = completions.filter((c) => c.habitId === habit.id).length;

  function handleIncrement() {
    if (!habit) return;
    addCompletion(habit.id).catch(() => {});
  }

  function handleUndo() {
    if (!habit) return;
    removeLatest(habit.id).catch(() => {});
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

        <View className="gap-3 rounded-2xl border border-border bg-background p-4">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text variant="muted" className="text-xs uppercase tracking-wide">
                {habit.frequencyKind === 'weekly' ? 'This week' : 'Today'}
              </Text>
              <Text className="mt-1 text-2xl font-semibold">
                {done}{' '}
                <Text variant="muted" className="text-base font-normal">
                  / {target}
                </Text>
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {done > 0 ? (
                <Pressable
                  onPress={handleUndo}
                  hitSlop={8}
                  className="size-11 items-center justify-center rounded-full border border-border">
                  <Icon as={RotateCcwIcon} size={18} className="text-muted-foreground" />
                </Pressable>
              ) : null}
              {isDone ? (
                <View className="size-11 items-center justify-center rounded-full bg-green-500/20">
                  <Icon as={CheckIcon} size={20} className="text-green-600" />
                </View>
              ) : (
                <Pressable
                  onPress={handleIncrement}
                  hitSlop={8}
                  className="size-11 items-center justify-center rounded-full bg-violet-500">
                  <Icon as={PlusIcon} size={20} className="text-white" />
                </Pressable>
              )}
            </View>
          </View>
          {target > 1 ? (
            <View className="h-1.5 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full bg-violet-500"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </View>
          ) : null}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Last 7 days
            </Text>
            {streak > 0 ? (
              <View className="flex-row items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5">
                <Icon as={FlameIcon} size={12} className="text-orange-500" />
                <Text variant="small" className="text-xs font-semibold text-orange-600">
                  {streak}
                  {habit.frequencyKind === 'weekly' ? ' week' : ' day'}
                  {streak === 1 ? '' : 's'}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row gap-1.5">
            {days.map((d) => {
              const date = new Date(d.date);
              const dow = date.getDay();
              const scheduled =
                habit.frequencyKind === 'weekly' || habit.daysOfWeek.includes(dow);
              return (
                <View key={d.date} className="flex-1 gap-1">
                  <View
                    className={cn(
                      'h-10 rounded-md',
                      d.hit
                        ? 'bg-violet-500'
                        : scheduled
                          ? 'bg-muted'
                          : 'bg-muted/40'
                    )}
                  />
                  <Text variant="muted" className="text-center text-[10px]">
                    {DAY_LETTERS[dow]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="flex-row gap-3">
          <StatCard label="Streak" value={String(streak)} />
          <StatCard label="Total" value={String(totalCompletions)} />
        </View>
      </ScrollView>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-1 rounded-2xl border border-border bg-background p-4">
      <Text variant="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
      <Text className="text-2xl font-semibold">{value}</Text>
    </View>
  );
}
