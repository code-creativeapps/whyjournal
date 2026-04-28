import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  CalendarIcon,
  CheckIcon,
  LinkIcon,
  TargetIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react-native';
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
import { celebrateTrophy } from '@/lib/celebrate';
import type { BaseItem } from '@/lib/simple-items/factory';
import { useAffirmationsStore } from '@/lib/stores/affirmations';
import { useBucketStore } from '@/lib/stores/bucket';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useTodosStore } from '@/lib/stores/todos';
import { useTrophiesStore } from '@/lib/stores/trophies';
import { cn } from '@/lib/utils';

type Kind = 'affirmation' | 'bucket' | 'trophy' | 'todo';

type KindConfig = {
  singular: string;
  titlePlaceholder: string;
  showBody: boolean;
  extraField?: 'when';
  showDueDate?: boolean;
};

const CONFIG: Record<Kind, KindConfig> = {
  affirmation: {
    singular: 'reminder',
    titlePlaceholder: 'Write a reminder or positive thought',
    showBody: true,
  },
  bucket: {
    singular: 'bucket item',
    titlePlaceholder: 'What do you want to do someday?',
    showBody: true,
  },
  trophy: {
    singular: 'trophy',
    titlePlaceholder: 'A big thing you achieved',
    showBody: true,
    extraField: 'when',
  },
  todo: {
    singular: 'todo',
    titlePlaceholder: 'Something to do',
    showBody: true,
    showDueDate: true,
  },
};

function getStoreApi(kind: Kind) {
  switch (kind) {
    case 'affirmation':
      return useAffirmationsStore;
    case 'bucket':
      return useBucketStore;
    case 'trophy':
      return useTrophiesStore;
    case 'todo':
      return useTodosStore;
  }
}

export default function SimpleItemFormScreen() {
  const { kind: kindParam, id } = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind = (kindParam ?? 'todo') as Kind;
  const config = CONFIG[kind];
  const isEditing = Boolean(id);

  const [initial] = React.useState(() => {
    if (!id) return null;
    const store = getStoreApi(kind);
    const items = store.getState().items as BaseItem[];
    return (items.find((i) => i.id === id) ?? null) as
      | (BaseItem & {
          when?: string;
          dueAt?: string;
          goalId?: string;
          milestoneId?: string;
        })
      | null;
  });

  const [title, setTitle] = React.useState(initial?.title ?? '');
  const [body, setBody] = React.useState(initial?.body ?? '');
  const [extra, setExtra] = React.useState<string>(
    config.extraField === 'when' ? initial?.when ?? '' : ''
  );
  const [dueAt, setDueAt] = React.useState<Date | null>(
    initial?.dueAt ? parseISO(initial.dueAt) : null
  );
  const [pickerVisible, setPickerVisible] = React.useState(false);
  // Working copy used inside the picker; committed to `dueAt` only when Done is tapped.
  const [pickerDate, setPickerDate] = React.useState<Date>(() => new Date());
  // Parent (goal or milestone) — only used when kind === 'todo'.
  const [parent, setParent] = React.useState<
    { kind: 'goal' | 'milestone'; id: string } | null
  >(() => {
    if (initial?.milestoneId) return { kind: 'milestone', id: initial.milestoneId };
    if (initial?.goalId) return { kind: 'goal', id: initial.goalId };
    return null;
  });
  const [parentPickerVisible, setParentPickerVisible] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  function openDuePicker() {
    setPickerDate(dueAt ?? new Date());
    setPickerVisible(true);
  }

  const canSave = title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const store = getStoreApi(kind);
    const payload: Record<string, unknown> = {
      title: title.trim(),
    };
    if (config.showBody) payload.body = body.trim() || undefined;
    if (config.extraField === 'when') payload.when = extra.trim() || undefined;
    if (config.showDueDate) {
      payload.dueAt = dueAt ? format(dueAt, 'yyyy-MM-dd') : undefined;
    }
    if (kind === 'bucket' || kind === 'todo') {
      payload.done = initial && 'done' in initial ? (initial as { done?: boolean }).done ?? false : false;
    }
    if (kind === 'todo') {
      // Always set both keys — the unset one is `undefined` so the repo's toRow
      // skips it on insert and the SQL CHECK constraint stays satisfied.
      payload.goalId = parent?.kind === 'goal' ? parent.id : undefined;
      payload.milestoneId = parent?.kind === 'milestone' ? parent.id : undefined;
      // On update, send `null` (not undefined) so the column is cleared if the
      // user removed the parent. Supabase treats undefined as "skip".
      if (isEditing) {
        payload.goalId = parent?.kind === 'goal' ? parent.id : null;
        payload.milestoneId = parent?.kind === 'milestone' ? parent.id : null;
      }
    }

    try {
      const api = store.getState() as unknown as {
        updateItem: (id: string, patch: Record<string, unknown>) => Promise<unknown>;
        addItem: (input: Record<string, unknown>) => Promise<unknown>;
      };
      if (isEditing && id) {
        await api.updateItem(id, payload);
      } else {
        await api.addItem(payload);
        if (kind === 'trophy') celebrateTrophy();
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert(`Delete ${config.singular}`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const store = getStoreApi(kind);
          await store.getState().deleteItem(id);
          router.back();
        },
      },
    ]);
  }

  const screenTitle = `${isEditing ? 'Edit' : 'New'} ${config.singular}`;

  return (
    <>
      <Stack.Screen
        options={{
          title: screenTitle,
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
        <View className="flex-1 gap-4 px-4 pt-4">
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder={config.titlePlaceholder}
            autoFocus={!isEditing}
            returnKeyType="next"
          />
          {config.showBody ? (
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Details (optional)"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
            />
          ) : null}
          {config.extraField ? (
            <Input
              value={extra}
              onChangeText={setExtra}
              placeholder="When (e.g. 2019, Summer 2023)"
            />
          ) : null}
          {config.showDueDate ? (
            <Pressable
              onPress={openDuePicker}
              className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
              <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
              <Text
                className={
                  dueAt ? 'flex-1 text-base text-foreground' : 'flex-1 text-base text-muted-foreground'
                }>
                {dueAt ? format(dueAt, 'EEEE, MMM d, yyyy') : 'Set due date'}
              </Text>
              {dueAt ? (
                <Pressable
                  onPress={() => setDueAt(null)}
                  hitSlop={8}
                  className="p-1">
                  <Icon as={XIcon} size={16} className="text-muted-foreground" />
                </Pressable>
              ) : null}
            </Pressable>
          ) : null}
          {kind === 'todo' ? (
            <ParentPickerRow
              parent={parent}
              onPress={() => setParentPickerVisible(true)}
              onClear={() => setParent(null)}
            />
          ) : null}
          {isEditing ? (
            <Button variant="outline" onPress={handleDelete}>
              <Icon as={Trash2Icon} className="text-destructive" />
              <Text className="text-destructive">Delete {config.singular}</Text>
            </Button>
          ) : null}
        </View>
      </KeyboardAvoidingView>
      {config.showDueDate ? (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setPickerVisible(false)}>
          <Pressable
            onPress={() => setPickerVisible(false)}
            className="flex-1 items-center justify-center bg-black/40 px-6">
            <View
              onStartShouldSetResponder={() => true}
              style={{ maxWidth: 360, width: '100%' }}
              className="rounded-2xl bg-background p-4">
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="inline"
                onChange={(event, date) => {
                  if (event.type === 'set' && date) setPickerDate(date);
                }}
              />
              <View className="mt-2 flex-row justify-end gap-4">
                <Pressable
                  onPress={() => setPickerVisible(false)}
                  hitSlop={8}
                  className="px-3 py-2">
                  <Text className="text-base text-muted-foreground">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setDueAt(pickerDate);
                    setPickerVisible(false);
                  }}
                  hitSlop={8}
                  className="px-3 py-2">
                  <Text className="text-base font-semibold text-primary">Done</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      ) : null}
      {kind === 'todo' ? (
        <ParentPickerModal
          visible={parentPickerVisible}
          selected={parent}
          onPick={(next) => {
            setParent(next);
            setParentPickerVisible(false);
          }}
          onClose={() => setParentPickerVisible(false)}
        />
      ) : null}
    </>
  );
}

type ParentSelection = { kind: 'goal' | 'milestone'; id: string } | null;

function ParentPickerRow({
  parent,
  onPress,
  onClear,
}: {
  parent: ParentSelection;
  onPress: () => void;
  onClear: () => void;
}) {
  const goals = useGoalsStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);

  let label = 'Attach to a goal or milestone';
  let prefix: string | null = null;
  if (parent?.kind === 'goal') {
    const g = goals.find((x) => x.id === parent.id);
    if (g) {
      prefix = 'Goal';
      label = g.title;
    }
  } else if (parent?.kind === 'milestone') {
    const m = milestones.find((x) => x.id === parent.id);
    if (m) {
      prefix = 'Milestone';
      label = m.title;
    }
  }

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
      <Icon as={LinkIcon} size={16} className="text-muted-foreground" />
      <View className="flex-1">
        {prefix ? (
          <Text variant="muted" className="text-[10px] uppercase tracking-wide">
            {prefix}
          </Text>
        ) : null}
        <Text
          className={
            parent ? 'text-base text-foreground' : 'text-base text-muted-foreground'
          }
          numberOfLines={1}>
          {label}
        </Text>
      </View>
      {parent ? (
        <Pressable onPress={onClear} hitSlop={8} className="p-1">
          <Icon as={XIcon} size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function ParentPickerModal({
  visible,
  selected,
  onPick,
  onClose,
}: {
  visible: boolean;
  selected: ParentSelection;
  onPick: (next: ParentSelection) => void;
  onClose: () => void;
}) {
  const goals = useGoalsStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);

  const milestonesByGoal = React.useMemo(() => {
    const map = new Map<string, typeof milestones>();
    for (const m of milestones) {
      const list = map.get(m.goalId) ?? [];
      list.push(m);
      map.set(m.goalId, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.createdAt.localeCompare(b.createdAt)
      );
    }
    return map;
  }, [milestones]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 items-end justify-center bg-black/40 px-6 sm:items-center">
        <View
          onStartShouldSetResponder={() => true}
          style={{ maxWidth: 420, width: '100%', maxHeight: '70%' }}
          className="rounded-2xl bg-background p-2">
          <ScrollView contentContainerClassName="p-2">
            <PickerOption
              label="None"
              isSelected={selected === null}
              onPress={() => onPick(null)}
            />
            {goals.map((g) => {
              const list = milestonesByGoal.get(g.id) ?? [];
              return (
                <View key={g.id} className="mt-1">
                  <PickerOption
                    label={g.title}
                    icon={TargetIcon}
                    iconBgClass="bg-red-500/15"
                    iconColorClass="text-red-500"
                    isSelected={
                      selected?.kind === 'goal' && selected.id === g.id
                    }
                    onPress={() => onPick({ kind: 'goal', id: g.id })}
                  />
                  {list.map((m) => (
                    <View key={m.id} className="ml-6">
                      <PickerOption
                        label={m.title}
                        icon={TargetIcon}
                        iconBgClass="bg-pink-400/15"
                        iconColorClass="text-pink-400"
                        isSelected={
                          selected?.kind === 'milestone' && selected.id === m.id
                        }
                        onPress={() => onPick({ kind: 'milestone', id: m.id })}
                      />
                    </View>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

function PickerOption({
  label,
  icon,
  iconBgClass,
  iconColorClass,
  isSelected,
  onPress,
}: {
  label: string;
  icon?: typeof TargetIcon;
  iconBgClass?: string;
  iconColorClass?: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-md px-3 py-2',
        isSelected ? 'bg-accent' : 'active:bg-accent'
      )}>
      {icon ? (
        <View
          className={cn(
            'size-6 items-center justify-center rounded-full',
            iconBgClass
          )}>
          <Icon as={icon} size={14} className={iconColorClass} />
        </View>
      ) : null}
      <Text className="flex-1 text-base" numberOfLines={1}>
        {label}
      </Text>
      {isSelected ? (
        <Icon as={CheckIcon} size={16} className="text-primary" />
      ) : null}
    </Pressable>
  );
}
