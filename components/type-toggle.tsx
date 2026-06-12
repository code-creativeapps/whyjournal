import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { EntryType } from '@/lib/entries/types';
import { ENTRY_VISUALS } from '@/lib/entries/visuals';
import { cn } from '@/lib/utils';

type Props = {
  value: EntryType;
  onChange: (value: EntryType) => void;
};

// Confirmation is hidden in the MVP. Keep it in the type union so existing
// rows still render; just don't surface it in the picker.
const ORDER: EntryType[] = ['win', 'gratitude'];

export function TypeToggle({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-2">
      {ORDER.map((type) => {
        const visual = ENTRY_VISUALS[type];
        const selected = value === type;
        return (
          <Button
            key={type}
            variant="outline"
            className={cn(
              'flex-1 px-2',
              selected && visual.toggleBorderClass,
              selected && visual.toggleFillClass
            )}
            onPress={() => onChange(type)}>
            <Icon as={visual.icon} className={visual.iconColorClass} />
            <Text numberOfLines={1}>{visual.label}</Text>
          </Button>
        );
      })}
    </View>
  );
}
