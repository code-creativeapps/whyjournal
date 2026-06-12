import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isToday, parseISO } from 'date-fns';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CalendarIcon, Trash2Icon } from 'lucide-react-native';
import * as React from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { TypeToggle } from '@/components/type-toggle';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { celebrate, onCelebrate } from '@/lib/celebrate';
import type { EntryType } from '@/lib/entries/types';
import { ENTRY_VISUALS } from '@/lib/entries/visuals';
import { useEntriesStore } from '@/lib/stores/entries';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function EntryFormScreen() {
  const { id, type: prefillType } = useLocalSearchParams<{
    id?: string;
    type?: EntryType;
  }>();
  const existing = useEntriesStore((state) =>
    id ? state.entries.find((e) => e.id === id) : undefined
  );
  const addEntry = useEntriesStore((state) => state.addEntry);
  const updateEntry = useEntriesStore((state) => state.updateEntry);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);

  const isEditing = Boolean(id);

  // Initial timestamp: existing entry's createdAt for edits, "now" for new.
  // We freeze this once at mount so it doesn't drift while the form is open.
  const initialDate = React.useMemo(
    () => (existing ? parseISO(existing.createdAt) : new Date()),
    [existing]
  );

  const [type, setType] = React.useState<EntryType>(
    existing?.type ?? prefillType ?? 'win'
  );
  const [title, setTitle] = React.useState(existing?.title ?? '');
  const [body, setBody] = React.useState(existing?.body ?? '');
  const [entryDate, setEntryDate] = React.useState<Date>(initialDate);
  const [pickerVisible, setPickerVisible] = React.useState(false);
  // Working copy used inside the picker; committed only when Done is tapped.
  const [pickerDate, setPickerDate] = React.useState<Date>(initialDate);
  const [saving, setSaving] = React.useState(false);
  const cannon = React.useRef<ConfettiCannon>(null);

  React.useEffect(() => onCelebrate(() => cannon.current?.start()), []);

  const canSave = title.trim().length > 0 && !saving;

  function openDatePicker() {
    setPickerDate(entryDate);
    setPickerVisible(true);
  }

  function buildFinalCreatedAt(): string {
    // Combine the picked date with a time-of-day. For new entries we use the
    // current clock so backdated entries get a sensible time stamp; for edits
    // we preserve the original entry's time so just changing the day doesn't
    // also shuffle when-of-day.
    const timeRef = isEditing ? initialDate : new Date();
    const combined = new Date(
      entryDate.getFullYear(),
      entryDate.getMonth(),
      entryDate.getDate(),
      timeRef.getHours(),
      timeRef.getMinutes(),
      timeRef.getSeconds(),
      timeRef.getMilliseconds()
    );
    return combined.toISOString();
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      type,
      title: title.trim(),
      body: body.trim() || undefined,
      createdAt: buildFinalCreatedAt(),
    };
    try {
      if (isEditing && id) {
        await updateEntry(id, payload);
        router.back();
      } else {
        // Fire confetti + sound immediately on press, before the await,
        // so the user sees it on this screen before the modal closes.
        celebrate();
        await addEntry(payload);
        // Small delay so the confetti has time to be visible on the modal
        // before the dismiss animation kicks in.
        setTimeout(() => router.back(), 350);
      }
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

  const dateLabel = isToday(entryDate)
    ? 'Today'
    : format(entryDate, 'EEEE, MMM d, yyyy');

  return (
    <>
      <Stack.Screen
        options={{
          title: isEditing ? 'Edit entry' : 'New entry',
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
          <TypeToggle value={type} onChange={setType} />
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder={ENTRY_VISUALS[type].titlePlaceholder}
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
          <Pressable
            onPress={openDatePicker}
            className="flex-row items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <Icon as={CalendarIcon} size={16} className="text-muted-foreground" />
            <Text className="flex-1 text-base text-foreground">{dateLabel}</Text>
          </Pressable>
          {isEditing ? (
            <Button variant="outline" onPress={handleDelete}>
              <Icon as={Trash2Icon} className="text-destructive" />
              <Text className="text-destructive">Delete entry</Text>
            </Button>
          ) : null}
        </View>
      </KeyboardAvoidingView>
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
              maximumDate={new Date()}
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
                  setEntryDate(pickerDate);
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
      <View pointerEvents="none" className="absolute inset-0">
        <ConfettiCannon
          ref={cannon}
          count={120}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={2800}
        />
      </View>
    </>
  );
}
