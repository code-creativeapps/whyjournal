import { CheckIcon, HeartIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { EntryType } from '@/lib/entries/types';

type Props = {
  value: EntryType;
  onChange: (value: EntryType) => void;
};

export function TypeToggle({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-2">
      <Button
        variant={value === 'win' ? 'default' : 'outline'}
        className="flex-1"
        onPress={() => onChange('win')}>
        <Icon as={CheckIcon} />
        <Text>Win</Text>
      </Button>
      <Button
        variant={value === 'gratitude' ? 'default' : 'outline'}
        className="flex-1"
        onPress={() => onChange('gratitude')}>
        <Icon as={HeartIcon} />
        <Text>Gratitude</Text>
      </Button>
    </View>
  );
}
