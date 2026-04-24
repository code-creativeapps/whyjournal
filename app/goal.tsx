import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Trash2Icon } from 'lucide-react-native';
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

import { MilestoneEditor } from '@/components/milestone-editor';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { Goal, MilestoneDraft } from '@/lib/goals/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useTodosStore } from '@/lib/stores/todos';

export default function GoalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useGoalsStore((state) =>
    id ? (state.items.find((g) => g.id === id) as Goal | undefined) : undefined
  );
  const addGoal = useGoalsStore((state) => state.addItem);
  const updateGoal = useGoalsStore((state) => state.updateItem);
  const deleteGoal = useGoalsStore((state) => state.deleteItem);

  const allTodos = useTodosStore((state) => state.items);
  const addTodo = useTodosStore((state) => state.addItem);
  const updateTodo = useTodosStore((state) => state.updateItem);
  const deleteTodo = useTodosStore((state) => state.deleteItem);

  const isEditing = Boolean(id);

  // Snapshot of linked todos at mount — the baseline we diff against on save.
  const initialLinkedTodosRef = React.useRef(
    id ? allTodos.filter((t) => t.goalId === id) : []
  );

  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [why, setWhy] = React.useState(existing?.why ?? '');
  const [targetDate, setTargetDate] = React.useState(existing?.targetDate ?? '');
  const [milestones, setMilestones] = React.useState<MilestoneDraft[]>(() =>
    initialLinkedTodosRef.current.map((t) => ({
      id: t.id,
      title: t.title,
      done: t.done,
    }))
  );
  const [saving, setSaving] = React.useState(false);

  const canSave = title.trim().length > 0 && !saving;
  const allMilestonesDone =
    milestones.length > 0 && milestones.every((m) => m.done) && !existing?.done;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      // 1. Write the goal, capturing its id (new or existing).
      const goalPayload: Partial<Goal> = {
        title: title.trim(),
        why: why.trim() || undefined,
        targetDate: targetDate.trim() || undefined,
        done: existing?.done ?? false,
      };
      let goalId: string;
      if (isEditing && id) {
        await updateGoal(id, goalPayload);
        goalId = id;
      } else {
        const created = await addGoal(goalPayload as Omit<Goal, 'id' | 'createdAt'>);
        goalId = created.id;
      }

      // 2. Sync milestones -> linked todos (create/update/delete).
      const initialLinked = initialLinkedTodosRef.current;
      const initialIds = new Set(initialLinked.map((t) => t.id));
      const keptIds = new Set<string>();
      for (const m of milestones) {
        const cleanTitle = m.title.trim();
        if (!cleanTitle) continue;
        if (initialIds.has(m.id)) {
          keptIds.add(m.id);
          const before = initialLinked.find((t) => t.id === m.id)!;
          if (before.title !== cleanTitle || before.done !== m.done) {
            await updateTodo(m.id, {
              title: cleanTitle,
              done: m.done,
              completedAt: m.done ? before.completedAt ?? new Date().toISOString() : undefined,
            });
          }
        } else {
          await addTodo({
            title: cleanTitle,
            done: m.done,
            goalId,
            completedAt: m.done ? new Date().toISOString() : undefined,
          });
        }
      }
      for (const t of initialLinked) {
        if (!keptIds.has(t.id)) {
          await deleteTodo(t.id);
        }
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert(
      'Delete goal',
      'Its linked milestones in Todos will be removed too. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const t of initialLinkedTodosRef.current) {
              await deleteTodo(t.id);
            }
            await deleteGoal(id);
            router.back();
          },
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit goal' : 'New goal',
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={!canSave} className="px-2">
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
        <ScrollView contentContainerClassName="gap-5 px-4 pt-4 pb-10" keyboardShouldPersistTaps="handled">
          <Field label="What do you want to achieve?" hint="Keep it concrete — name the outcome, not the activity.">
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Run a half marathon"
              autoFocus={!isEditing}
              returnKeyType="next"
            />
          </Field>

          <Field
            label="Why does this matter?"
            hint="What changes once you get there? Keeping this visible makes goals stick.">
            <TextInput
              value={why}
              onChangeText={setWhy}
              placeholder="The reason behind the goal"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
            />
          </Field>

          <Field label="Target date" hint="Optional — a soft deadline keeps things honest.">
            <Input
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="e.g. Jun 30, end of Q2"
            />
          </Field>

          <Field
            label="Milestones"
            hint="Each milestone also appears in your Todos, tagged with this goal.">
            <MilestoneEditor milestones={milestones} onChange={setMilestones} />
          </Field>

          {allMilestonesDone ? (
            <View className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">
              <Text className="text-sm text-red-600">
                All milestones done — mark the goal complete from the card when you&apos;re ready.
              </Text>
            </View>
          ) : null}

          {isEditing ? (
            <Button variant="outline" onPress={handleDelete}>
              <Icon as={Trash2Icon} className="text-destructive" />
              <Text className="text-destructive">Delete goal</Text>
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
