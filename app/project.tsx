import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ChevronRightIcon, TargetIcon, Trash2Icon } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { GoalIconCircle } from '@/lib/goals/icon';
import type { Project } from '@/lib/projects/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';
import { cn } from '@/lib/utils';

export default function ProjectFormScreen() {
  const { id, goalId: prefillGoalId } = useLocalSearchParams<{
    id?: string;
    goalId?: string;
  }>();

  const existing = useProjectsStore((s) =>
    id ? (s.items.find((p) => p.id === id) as Project | undefined) : undefined
  );
  const addProject = useProjectsStore((s) => s.addItem);
  const updateProject = useProjectsStore((s) => s.updateItem);
  const deleteProject = useProjectsStore((s) => s.deleteItem);

  const goals = useGoalsStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);

  const isEditing = Boolean(id);

  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [body, setBody] = React.useState(existing?.body ?? '');
  const [goalId, setGoalId] = React.useState<string | undefined>(
    existing?.goalId ?? prefillGoalId
  );
  const [milestoneId, setMilestoneId] = React.useState<string | undefined>(
    existing?.milestoneId
  );
  const [saving, setSaving] = React.useState(false);
  const [goalPickerOpen, setGoalPickerOpen] = React.useState(false);
  const [milestonePickerOpen, setMilestonePickerOpen] = React.useState(false);

  const goalsById = React.useMemo(() => {
    const map = new Map<string, (typeof goals)[number]>();
    for (const g of goals) map.set(g.id, g);
    return map;
  }, [goals]);
  const goalMilestones = React.useMemo(() => {
    if (!goalId) return [];
    return milestones
      .filter((m) => m.goalId === goalId)
      .slice()
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.createdAt.localeCompare(b.createdAt)
      );
  }, [goalId, milestones]);
  const selectedGoal = goalId ? goalsById.get(goalId) : undefined;
  const selectedMilestone = milestoneId
    ? milestones.find((m) => m.id === milestoneId)
    : undefined;

  const canSave = title.trim().length > 0 && Boolean(goalId) && !saving;

  async function handleSave() {
    if (!canSave || !goalId) return;
    setSaving(true);
    try {
      const payload: Partial<Project> = {
        title: title.trim(),
        body: body.trim() || undefined,
        goalId,
        // Send null when explicitly cleared so the column drops to NULL.
        milestoneId: (milestoneId ?? null) as string | undefined,
      };
      if (isEditing && id) {
        await updateProject(id, payload);
      } else {
        await addProject({
          ...payload,
          done: false,
        } as Omit<Project, 'id' | 'createdAt'>);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Delete project', 'Linked tasks will be removed too. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProject(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit project' : 'New project',
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
          <Field label="Goal" hint="Projects always belong to a goal.">
            <Pressable
              onPress={() => setGoalPickerOpen(true)}
              className="flex-row items-center gap-3 rounded-md border border-input bg-background px-3 py-2 active:bg-accent">
              {selectedGoal ? (
                <>
                  <GoalIconCircle icon={selectedGoal.icon} done={selectedGoal.done} size="sm" />
                  <Text className="flex-1 text-base" numberOfLines={1}>
                    {selectedGoal.title}
                  </Text>
                </>
              ) : (
                <Text variant="muted" className="flex-1 text-base">
                  Choose a goal
                </Text>
              )}
              <Icon as={ChevronRightIcon} size={16} className="text-muted-foreground" />
            </Pressable>
          </Field>

          <Field label="Title" hint="What's the workstream? Make it concrete.">
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Content engine v1"
              autoFocus={!isEditing}
              returnKeyType="next"
            />
          </Field>

          <Field label="Description" hint="Optional notes for context.">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="What this project covers"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
            />
          </Field>

          <Field
            label="Contributes to milestone"
            hint="Optional — link this project to one of the goal's milestones to track progress.">
            <Pressable
              onPress={() => goalId && setMilestonePickerOpen(true)}
              disabled={!goalId}
              className={cn(
                'flex-row items-center gap-3 rounded-md border border-input bg-background px-3 py-2',
                goalId ? 'active:bg-accent' : 'opacity-60'
              )}>
              {selectedMilestone ? (
                <>
                  <View className="size-6 items-center justify-center rounded-full bg-pink-400/15">
                    <Icon as={TargetIcon} size={14} className="text-pink-400" />
                  </View>
                  <Text className="flex-1 text-base" numberOfLines={1}>
                    {selectedMilestone.title}
                  </Text>
                </>
              ) : (
                <Text variant="muted" className="flex-1 text-base">
                  {goalId ? 'None' : 'Pick a goal first'}
                </Text>
              )}
              <Icon as={ChevronRightIcon} size={16} className="text-muted-foreground" />
            </Pressable>
          </Field>

          {isEditing ? (
            <Button variant="outline" onPress={handleDelete}>
              <Icon as={Trash2Icon} className="text-destructive" />
              <Text className="text-destructive">Delete project</Text>
            </Button>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={goalPickerOpen}
        title="Choose a goal"
        onClose={() => setGoalPickerOpen(false)}>
        {goals.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => {
              if (g.id !== goalId) setMilestoneId(undefined);
              setGoalId(g.id);
              setGoalPickerOpen(false);
            }}
            className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-accent">
            <GoalIconCircle icon={g.icon} done={g.done} size="sm" />
            <Text className="flex-1 text-base" numberOfLines={1}>
              {g.title}
            </Text>
          </Pressable>
        ))}
      </PickerModal>

      <PickerModal
        visible={milestonePickerOpen}
        title="Pick a milestone"
        onClose={() => setMilestonePickerOpen(false)}>
        <Pressable
          onPress={() => {
            setMilestoneId(undefined);
            setMilestonePickerOpen(false);
          }}
          className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-accent">
          <View className="size-6 items-center justify-center rounded-full bg-muted">
            <Text className="text-xs">—</Text>
          </View>
          <Text className="flex-1 text-base">None</Text>
        </Pressable>
        {goalMilestones.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              setMilestoneId(m.id);
              setMilestonePickerOpen(false);
            }}
            className="flex-row items-center gap-3 rounded-xl px-3 py-3 active:bg-accent">
            <View className="size-6 items-center justify-center rounded-full bg-pink-400/15">
              <Icon as={TargetIcon} size={14} className="text-pink-400" />
            </View>
            <Text className="flex-1 text-base" numberOfLines={1}>
              {m.title}
            </Text>
          </Pressable>
        ))}
      </PickerModal>
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

function PickerModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/40 px-6">
        <View
          onStartShouldSetResponder={() => true}
          style={{ maxWidth: 420, width: '100%', maxHeight: '70%' }}
          className="rounded-2xl bg-background p-2">
          <View className="px-3 py-2">
            <Text className="text-sm font-semibold">{title}</Text>
          </View>
          <ScrollView contentContainerClassName="p-1">{children}</ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
