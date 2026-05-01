import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CheckIcon, PlusIcon, Trash2Icon } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { FrequencyKind, Habit } from '@/lib/habits/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitsStore } from '@/lib/stores/habits';
import { useRoutinesStore } from '@/lib/stores/routines';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitFormScreen() {
  const { id, goalId: prefillGoalId } = useLocalSearchParams<{
    id?: string;
    goalId?: string;
  }>();
  const existing = useHabitsStore((s) =>
    id ? (s.items.find((h) => h.id === id) as Habit | undefined) : undefined
  );
  const addHabit = useHabitsStore((s) => s.addItem);
  const updateHabit = useHabitsStore((s) => s.updateItem);
  const deleteHabit = useHabitsStore((s) => s.deleteItem);

  const routines = useRoutinesStore((s) => s.items);
  const addRoutine = useRoutinesStore((s) => s.addItem);

  const goals = useGoalsStore((s) => s.items);

  const isEditing = Boolean(id);

  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [body, setBody] = React.useState(existing?.body ?? '');
  // Soft migration: a legacy row stored as `daily` with a subset of
  // daysOfWeek (e.g. M/W/F) now belongs in weekly mode under the new
  // semantics ("daily" = every day; "weekly" = pick the days).
  const initialKind: FrequencyKind = (() => {
    if (!existing) return 'daily';
    if (
      existing.frequencyKind === 'daily' &&
      existing.daysOfWeek.length > 0 &&
      existing.daysOfWeek.length < 7
    ) {
      return 'weekly';
    }
    return existing.frequencyKind;
  })();
  const [frequencyKind, setFrequencyKind] = React.useState<FrequencyKind>(initialKind);
  const [count, setCount] = React.useState<string>(
    String(existing?.timesPerPeriod ?? 1)
  );
  const [daysOfWeek, setDaysOfWeek] = React.useState<number[]>(() => {
    if (!existing) return [];
    if (existing.frequencyKind === 'daily' && existing.daysOfWeek.length === 7) return [];
    return existing.daysOfWeek;
  });
  const [routineId, setRoutineId] = React.useState<string | undefined>(existing?.routineId);
  const [goalId, setGoalId] = React.useState<string | undefined>(
    existing?.goalId ?? prefillGoalId
  );
  const [saving, setSaving] = React.useState(false);

  const parsedCount = Math.max(1, parseInt(count, 10) || 1);
  const canSave = title.trim().length > 0 && !saving;

  function toggleDay(d: number) {
    setDaysOfWeek((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function handleAddRoutine() {
    Alert.prompt(
      'New routine',
      'Name this group of habits.',
      async (name) => {
        const trimmed = name?.trim();
        if (!trimmed) return;
        try {
          const created = await addRoutine({ title: trimmed });
          setRoutineId(created.id);
        } catch (err) {
          Alert.alert('Couldn’t create routine', err instanceof Error ? err.message : '');
        }
      },
      'plain-text'
    );
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const payload: Partial<Habit> = {
      title: title.trim(),
      body: body.trim() || undefined,
      frequencyKind,
      timesPerPeriod: parsedCount,
      daysOfWeek: frequencyKind === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : daysOfWeek,
      routineId: routineId,
      goalId: goalId,
    };
    try {
      if (isEditing && id) {
        await updateHabit(id, payload);
      } else {
        await addHabit(payload as Omit<Habit, 'id' | 'createdAt'>);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Delete habit', 'Its completions will be removed too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteHabit(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit habit' : 'New habit',
          headerRight: () => (
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              hitSlop={8}
              className="flex-row items-center px-2">
              <Text
                className={
                  canSave
                    ? 'text-base font-semibold text-primary'
                    : 'text-base text-muted-foreground'
                }>
                Save
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          contentContainerClassName="gap-5 px-4 pt-4 pb-10"
          keyboardShouldPersistTaps="handled">
          <Field label="Title" hint="What's the habit?">
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Drink water"
              autoFocus={!isEditing}
              returnKeyType="next"
            />
          </Field>

          <Field label="Description" hint="Optional notes for context.">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Why or how"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
            />
          </Field>

          <Field label="Frequency" hint="How often you want to do it.">
            <View className="gap-3">
              <View className="flex-row gap-2">
                <FreqChip
                  active={frequencyKind === 'daily'}
                  label="Per day"
                  onPress={() => setFrequencyKind('daily')}
                />
                <FreqChip
                  active={frequencyKind === 'weekly'}
                  label="Per week"
                  onPress={() => setFrequencyKind('weekly')}
                />
              </View>
              <View className="flex-row items-center gap-2">
                <Input
                  value={count}
                  onChangeText={setCount}
                  keyboardType="number-pad"
                  className="w-20 text-center"
                />
                <Text variant="muted" className="text-base">
                  {frequencyKind === 'daily' ? 'time(s) per day' : 'time(s) per week'}
                </Text>
              </View>
              {frequencyKind === 'weekly' ? (
                <View className="gap-1.5">
                  <Text variant="muted" className="text-xs">
                    Specific days (optional)
                  </Text>
                  <View className="flex-row gap-1.5">
                    {DAY_LABELS.map((label, i) => (
                      <DayChip
                        key={i}
                        label={label}
                        active={daysOfWeek.includes(i)}
                        onPress={() => toggleDay(i)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </Field>

          <Field label="Routine" hint="Group habits into a stack like a morning routine.">
            <View className="flex-row flex-wrap gap-2">
              <PickerChip
                active={!routineId}
                label="None"
                onPress={() => setRoutineId(undefined)}
              />
              {routines.map((r) => (
                <PickerChip
                  key={r.id}
                  active={routineId === r.id}
                  label={r.title}
                  onPress={() => setRoutineId(r.id)}
                />
              ))}
              <Pressable
                onPress={handleAddRoutine}
                className="flex-row items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5">
                <Icon as={PlusIcon} size={14} className="text-muted-foreground" />
                <Text variant="muted" className="text-sm">
                  New routine
                </Text>
              </Pressable>
            </View>
          </Field>

          <Field label="Goal" hint="Optional. Link to a goal you're working on.">
            <View className="flex-row flex-wrap gap-2">
              <PickerChip
                active={!goalId}
                label="None"
                onPress={() => setGoalId(undefined)}
              />
              {goals.map((g) => (
                <PickerChip
                  key={g.id}
                  active={goalId === g.id}
                  label={g.title}
                  onPress={() => setGoalId(g.id)}
                />
              ))}
            </View>
          </Field>

          {isEditing ? (
            <Button variant="outline" onPress={handleDelete}>
              <Icon as={Trash2Icon} className="text-destructive" />
              <Text className="text-destructive">Delete habit</Text>
            </Button>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold">{label}</Text>
      {hint ? (
        <Text variant="muted" className="text-xs">
          {hint}
        </Text>
      ) : null}
      <View className="mt-1">{children}</View>
    </View>
  );
}

function FreqChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-1 items-center rounded-full border px-4 py-2',
        active ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background'
      )}>
      <Text
        className={cn(
          'text-sm font-medium',
          active ? 'text-violet-700' : 'text-foreground'
        )}>
        {label}
      </Text>
    </Pressable>
  );
}

function DayChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'h-9 flex-1 items-center justify-center rounded-full border',
        active ? 'border-violet-500 bg-violet-500' : 'border-border bg-background'
      )}>
      <Text
        className={cn('text-xs font-semibold', active ? 'text-white' : 'text-foreground')}>
        {label}
      </Text>
    </Pressable>
  );
}

function PickerChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-1 rounded-full border px-3 py-1.5',
        active ? 'border-violet-500 bg-violet-500/10' : 'border-border bg-background'
      )}>
      {active ? <Icon as={CheckIcon} size={12} className="text-violet-700" /> : null}
      <Text
        className={cn(
          'text-sm font-medium',
          active ? 'text-violet-700' : 'text-foreground'
        )}>
        {label}
      </Text>
    </Pressable>
  );
}
