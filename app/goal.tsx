import {
  BottomSheetModal,
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ImagePlusIcon, Trash2Icon, XIcon } from 'lucide-react-native';
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

import { GoalImagePickerSheet, type PickedImage } from '@/components/goal-image-picker-sheet';
import { MilestoneEditor } from '@/components/milestone-editor';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { Goal, MilestoneDraft } from '@/lib/goals/types';
import { useGoalImagesStore } from '@/lib/stores/goal-images';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';

type ImageDraft = {
  id?: string;
  url: string;
  source: 'upload' | 'pexels';
  attribution?: string;
};

export default function GoalFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useGoalsStore((state) =>
    id ? (state.items.find((g) => g.id === id) as Goal | undefined) : undefined
  );
  const addGoal = useGoalsStore((state) => state.addItem);
  const updateGoal = useGoalsStore((state) => state.updateItem);
  const deleteGoal = useGoalsStore((state) => state.deleteItem);

  const allMilestones = useMilestonesStore((state) => state.items);
  const addMilestone = useMilestonesStore((state) => state.addItem);
  const updateMilestone = useMilestonesStore((state) => state.updateItem);
  const deleteMilestone = useMilestonesStore((state) => state.deleteItem);

  const allImages = useGoalImagesStore((s) => s.items);
  const addImage = useGoalImagesStore((s) => s.addItem);
  const deleteImage = useGoalImagesStore((s) => s.deleteItem);

  const isEditing = Boolean(id);

  // Snapshot of current milestones at mount — the baseline we diff against on save.
  // Sort by stored position so reordering is sticky across edits.
  const initialMilestonesRef = React.useRef(
    id
      ? allMilestones
          .filter((m) => m.goalId === id)
          .slice()
          .sort(
            (a, b) =>
              (a.position ?? 0) - (b.position ?? 0) ||
              a.createdAt.localeCompare(b.createdAt)
          )
      : []
  );

  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [body, setBody] = React.useState(existing?.body ?? '');
  const [why, setWhy] = React.useState(existing?.why ?? '');
  const [reward, setReward] = React.useState(existing?.reward ?? '');
  const [targetDate, setTargetDate] = React.useState(existing?.targetDate ?? '');
  const [milestones, setMilestones] = React.useState<MilestoneDraft[]>(() =>
    initialMilestonesRef.current.map((m) => ({
      id: m.id,
      title: m.title,
      done: m.done,
      position: m.position,
    }))
  );

  const initialImagesRef = React.useRef(
    id
      ? allImages
          .filter((img) => img.goalId === id)
          .slice()
          .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt))
      : []
  );
  const [images, setImages] = React.useState<ImageDraft[]>(() =>
    initialImagesRef.current.map((img) => ({
      id: img.id,
      url: img.url,
      source: img.source,
      attribution: img.attribution,
    }))
  );

  const pickerRef = React.useRef<BottomSheetModal>(null);
  const [saving, setSaving] = React.useState(false);

  const canSave = title.trim().length > 0 && !saving;
  const allMilestonesDone =
    milestones.length > 0 && milestones.every((m) => m.done) && !existing?.done;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const goalPayload: Partial<Goal> = {
        title: title.trim(),
        body: body.trim() || undefined,
        why: why.trim() || undefined,
        reward: reward.trim() || undefined,
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

      // Sync milestones — diff the local drafts against the initial snapshot.
      // Persist `position` based on array index so reordering survives reloads.
      const initial = initialMilestonesRef.current;
      const initialIds = new Set(initial.map((m) => m.id));
      const keptIds = new Set<string>();
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        const cleanTitle = m.title.trim();
        if (!cleanTitle) continue;
        if (initialIds.has(m.id)) {
          keptIds.add(m.id);
          const before = initial.find((x) => x.id === m.id)!;
          if (
            before.title !== cleanTitle ||
            before.done !== m.done ||
            (before.position ?? 0) !== i
          ) {
            await updateMilestone(m.id, {
              title: cleanTitle,
              done: m.done,
              position: i,
              completedAt: m.done
                ? before.completedAt ?? new Date().toISOString()
                : undefined,
            });
          }
        } else {
          await addMilestone({
            title: cleanTitle,
            done: m.done,
            position: i,
            goalId,
            completedAt: m.done ? new Date().toISOString() : undefined,
          });
        }
      }
      for (const m of initial) {
        if (!keptIds.has(m.id)) {
          await deleteMilestone(m.id);
        }
      }

      // Sync images — diff drafts vs initial. New drafts have no `id`
      // (they were uploaded into Storage / picked from Pexels but not yet
      // persisted as a row). Removed drafts are deleted from goal_images.
      const initialImages = initialImagesRef.current;
      const initialImageIds = new Set(initialImages.map((i) => i.id));
      const keptImageIds = new Set<string>();
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.id && initialImageIds.has(img.id)) {
          keptImageIds.add(img.id);
        } else {
          await addImage({
            goalId,
            url: img.url,
            source: img.source,
            attribution: img.attribution,
            position: i,
          });
        }
      }
      for (const img of initialImages) {
        if (!keptImageIds.has(img.id)) {
          await deleteImage(img.id);
        }
      }

      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Delete goal', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Milestones cascade via the goals.id ON DELETE in Supabase. Reset our local
          // milestones store afterwards so the next render reflects the deletion.
          await deleteGoal(id);
          await useMilestonesStore.getState().hydrate();
          router.back();
        },
      },
    ]);
  }

  return (
    <BottomSheetModalProvider>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit goal' : 'New goal',
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
            label="Vivid description"
            hint="Describe success in detail — what does it look, feel, and sound like?">
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Paint the picture of what done looks like"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
            />
          </Field>

          {isEditing && id ? (
            <Field
              label="Images"
              hint="Backdrop for the goal — upload your own or pull from Pexels.">
              <ImageDraftRow
                images={images}
                onRemove={(idx) =>
                  setImages((prev) => prev.filter((_, i) => i !== idx))
                }
                onAdd={() => pickerRef.current?.present()}
              />
              <GoalImagePickerSheet
                ref={pickerRef}
                goalId={id}
                onPick={(picked: PickedImage) => {
                  setImages((prev) => [
                    ...prev,
                    {
                      url: picked.url,
                      source: picked.source,
                      attribution: picked.attribution,
                    },
                  ]);
                  pickerRef.current?.dismiss();
                }}
              />
            </Field>
          ) : null}

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
            label="Reward"
            hint="How will you celebrate? An event, a gift, a trip — anything that motivates you.">
            <Input
              value={reward}
              onChangeText={setReward}
              placeholder="e.g. A weekend in Lisbon"
            />
          </Field>

          <Field
            label="Milestones"
            hint="Break it down into concrete steps you can tick off.">
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
    </BottomSheetModalProvider>
  );
}

function ImageDraftRow({
  images,
  onRemove,
  onAdd,
}: {
  images: ImageDraft[];
  onRemove: (index: number) => void;
  onAdd: () => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {images.map((img, idx) => (
        <View key={`${img.id ?? 'new'}-${idx}`} className="relative">
          <Image
            source={{ uri: img.url }}
            style={{ width: 80, height: 80, borderRadius: 12 }}
            contentFit="cover"
            transition={120}
          />
          <Pressable
            onPress={() => onRemove(idx)}
            hitSlop={6}
            className="absolute -right-1 -top-1 size-6 items-center justify-center rounded-full bg-black/70">
            <Icon as={XIcon} size={14} className="text-white" />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={onAdd}
        className="size-20 items-center justify-center rounded-xl border border-dashed border-border active:bg-accent">
        <Icon as={ImagePlusIcon} size={20} className="text-muted-foreground" />
      </Pressable>
    </ScrollView>
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
