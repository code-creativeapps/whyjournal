import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CalendarIcon, Trash2Icon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
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
import { useTodosStore } from '@/lib/stores/todos';
import { useTrophiesStore } from '@/lib/stores/trophies';

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
      | (BaseItem & { when?: string; dueAt?: string })
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
    </>
  );
}
