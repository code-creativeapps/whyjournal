import { Stack, router } from 'expo-router';
import * as React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';

import { TypeToggle } from '@/components/type-toggle';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { celebrate } from '@/lib/celebrate';
import type { EntryType } from '@/lib/entries/types';
import { useEntriesStore } from '@/lib/stores/entries';

export default function NewEntryScreen() {
  const [type, setType] = React.useState<EntryType>('win');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const addEntry = useEntriesStore((state) => state.addEntry);

  const canSave = title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    celebrate();
    try {
      await addEntry({
        type,
        title: title.trim(),
        body: body.trim() || undefined,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'New entry',
          headerRight: () => (
            <Pressable onPress={handleSave} disabled={!canSave} className="px-2">
              <Text
                className={
                  canSave ? 'text-base font-semibold text-primary' : 'text-base text-muted-foreground'
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
            autoFocus
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
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
