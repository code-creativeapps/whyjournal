import { format } from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Trash2Icon } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { Milestone } from '@/lib/milestones/types';
import { useMilestonesStore } from '@/lib/stores/milestones';

export default function MilestoneFormScreen() {
  const { id, goalId } = useLocalSearchParams<{ id?: string; goalId?: string }>();
  const existing = useMilestonesStore((state) =>
    id ? (state.items.find((m) => m.id === id) as Milestone | undefined) : undefined
  );
  const addMilestone = useMilestonesStore((state) => state.addItem);
  const updateMilestone = useMilestonesStore((state) => state.updateItem);
  const deleteMilestone = useMilestonesStore((state) => state.deleteItem);

  const isEditing = Boolean(id);

  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [body, setBody] = React.useState(existing?.body ?? '');
  const [targetDate, setTargetDate] = React.useState(existing?.targetDate ?? '');
  const [reward, setReward] = React.useState(existing?.reward ?? '');
  const [monthly, setMonthly] = React.useState(existing?.monthly ?? false);
  const [saving, setSaving] = React.useState(false);

  const canSave = title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const payload: Partial<Milestone> = {
      title: title.trim(),
      body: body.trim() || undefined,
      targetDate: targetDate.trim() || undefined,
      reward: reward.trim() || undefined,
      monthly,
    };
    try {
      if (isEditing && id) {
        await updateMilestone(id, payload);
      } else {
        const parentGoalId = existing?.goalId ?? goalId;
        if (!parentGoalId) {
          throw new Error('Cannot create a milestone without a goal.');
        }
        await addMilestone({
          ...payload,
          goalId: parentGoalId,
          done: false,
          periodMonth: monthly ? format(new Date(), 'yyyy-MM') : undefined,
          seriesId: monthly
            ? `series-${Date.now()}-${Math.random().toString(36).slice(2)}`
            : undefined,
        } as Omit<Milestone, 'id' | 'createdAt'>);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Delete milestone', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMilestone(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit milestone' : 'New milestone',
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
          <Field label="Title" hint="What's the milestone? Make it concrete.">
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Hit 10km run"
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
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
            />
          </Field>

          <Field
            label="Monthly target"
            hint="Resets each month — a new instance is created automatically.">
            <View className="flex-row items-center justify-between rounded-md border border-input bg-background px-3 py-2">
              <Text className="text-base">Repeat every month</Text>
              <Switch value={monthly} onValueChange={setMonthly} />
            </View>
          </Field>

          <Field label="Target date" hint="Optional — soft deadline keeps things honest.">
            <Input
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="e.g. End of June, Mar 30"
            />
          </Field>

          <Field
            label="Reward"
            hint="Optional — a small celebration when you hit this milestone.">
            <Input
              value={reward}
              onChangeText={setReward}
              placeholder="e.g. New running shoes"
            />
          </Field>

          {isEditing ? (
            <Button variant="outline" onPress={handleDelete}>
              <Icon as={Trash2Icon} className="text-destructive" />
              <Text className="text-destructive">Delete milestone</Text>
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
