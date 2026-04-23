import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Trash2Icon } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';

import { TypeToggle } from '@/components/type-toggle';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { celebrate } from '@/lib/celebrate';
import type { EntryType } from '@/lib/entries/types';
import { useEntriesStore } from '@/lib/stores/entries';

export default function EntryFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useEntriesStore((state) =>
    id ? state.entries.find((e) => e.id === id) : undefined
  );
  const addEntry = useEntriesStore((state) => state.addEntry);
  const updateEntry = useEntriesStore((state) => state.updateEntry);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);

  const isEditing = Boolean(id);
  const [type, setType] = React.useState<EntryType>(existing?.type ?? 'win');
  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [body, setBody] = React.useState(existing?.body ?? '');
  const [saving, setSaving] = React.useState(false);

  const canSave = title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      type,
      title: title.trim(),
      body: body.trim() || undefined,
    };
    try {
      if (isEditing && id) {
        await updateEntry(id, payload);
      } else {
        celebrate();
        await addEntry(payload);
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!id) return;
    Alert.alert('Delete entry', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(id);
          router.back();
        },
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit entry' : 'New entry',
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
        <View className="flex-1 gap-4 px-4 pt-4">
          <TypeToggle value={type} onChange={setType} />
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder={type === 'win' ? 'What went well?' : 'What are you grateful for?'}
            autoFocus={!isEditing}
            returnKeyType="next"
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Details (optional)"
            placeholderTextColor="#9ca3af"
            multiline
            textAlignVertical="top"
            className="min-h-32 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground"
          />
          {isEditing ? (
            <Button variant="outline" onPress={handleDelete}>
              <Icon as={Trash2Icon} className="text-destructive" />
              <Text className="text-destructive">Delete entry</Text>
            </Button>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
