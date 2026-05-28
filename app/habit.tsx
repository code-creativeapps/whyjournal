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
import type { Habit } from '@/lib/habits/types';
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
  const [timesPerWeek, setTimesPerWeek] = React.useState<number>(
    existing?.timesPerWeek ?? 7
  );
  const [fixedDays, setFixedDays] = React.useState<number[]>(existing?.fixedDays ?? []);
  const [routineId, setRoutineId] = React.useState<string | undefined>(existing?.routineId);
  const [goalId, setGoalId] = React.useState<string | undefined>(
    existing?.goalId ?? prefillGoalId
  );
  const [saving, setSaving] = React.useState(false);

  const canSave = title.trim().length > 0 && !saving;

  function setCount(n: number) {
    setTimesPerWeek(n);
    setFixedDays([]);
  }

  function toggleDay(d: number) {
    setFixedDays((prev) => {
      const next = prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b);
      if (next.length > 0) setTimesPerWeek(next.length);
      return next;
    });
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
      timesPerWeek,
      fixedDays: fixedDays.length > 0 ? fixedDays : undefined,
      routineId,
      goalId,
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

  const summary =
    fixedDays.length > 0
      ? `${fixedDays
          .slice()
          .sort((a, b) => a - b)
          .map((d) => DAY_LABELS[d])
          .join(', ')} · ${fixedDays.length}× per week`
      : timesPerWeek === 7
        ? 'Every day'
        : `${timesPerWeek}× per week, any day`;

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

          <Field label="Frequency" hint="How many times you want to do it per week.">
            <View className="gap-3">
              <View className="flex-row gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <CountChip
                    key={n}
                    label={String(n)}
                    active={timesPerWeek === n && fixedDays.length === 0}
                    onPress={() => setCount(n)}
                  />
                ))}
              </View>
              <Text variant="muted" className="text-xs">
                {summary}
              </Text>
              <View className="gap-1.5">
                <Text variant="muted" className="text-xs">
                  Specific days (optional)
                </Text>
                <View className="flex-row gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <DayChip
                      key={i}
                      label={label}
                      active={fixedDays.includes(i)}
                      onPress={() => toggleDay(i)}
                    />
                  ))}
                </View>
              </View>
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

function CountChip({
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
        className={cn('text-sm font-semibold', active ? 'text-white' : 'text-foreground')}>
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
