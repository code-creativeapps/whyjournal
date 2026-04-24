import { CheckIcon, PlusIcon, XIcon } from 'lucide-react-native';
import { Pressable, TextInput, View } from 'react-native';
import uuid from 'react-native-uuid';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { MilestoneDraft } from '@/lib/goals/types';

type Props = {
  milestones: MilestoneDraft[];
  onChange: (next: MilestoneDraft[]) => void;
};

export function MilestoneEditor({ milestones, onChange }: Props) {
  function update(id: string, patch: Partial<MilestoneDraft>) {
    onChange(milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function toggle(id: string) {
    const current = milestones.find((m) => m.id === id);
    if (!current) return;
    update(id, { done: !current.done });
  }

  function remove(id: string) {
    onChange(milestones.filter((m) => m.id !== id));
  }

  function add() {
    onChange([...milestones, { id: String(uuid.v4()), title: '', done: false }]);
  }

  return (
    <View className="gap-2">
      {milestones.map((m) => (
        <View key={m.id} className="flex-row items-center gap-2">
          <Pressable
            onPress={() => toggle(m.id)}
            hitSlop={8}
            className={cn(
              'size-6 items-center justify-center rounded-md border-2',
              m.done ? 'border-red-500 bg-red-500' : 'border-muted-foreground/40'
            )}>
            {m.done ? <Icon as={CheckIcon} size={14} className="text-white" /> : null}
          </Pressable>
          <TextInput
            value={m.title}
            onChangeText={(title) => update(m.id, { title })}
            placeholder="Milestone title"
            placeholderTextColor="#9ca3af"
            className={cn(
              'flex-1 rounded-md border border-input bg-background px-3 py-2 text-base text-foreground',
              m.done && 'text-muted-foreground line-through'
            )}
          />
          <Pressable onPress={() => remove(m.id)} hitSlop={8} className="p-1">
            <Icon as={XIcon} size={18} className="text-muted-foreground" />
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={add}
        className="mt-1 flex-row items-center gap-2 self-start rounded-md border border-dashed border-border px-3 py-2">
        <Icon as={PlusIcon} size={16} className="text-muted-foreground" />
        <Text variant="muted" className="text-sm font-medium">
          Add milestone
        </Text>
      </Pressable>
    </View>
  );
}
