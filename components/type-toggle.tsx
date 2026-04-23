import { CheckIcon, HeartIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { EntryType } from '@/lib/entries/types';

type Props = {
  value: EntryType;
  onChange: (value: EntryType) => void;
};

export function TypeToggle({ value, onChange }: Props) {
  return (
    <View className="flex-row gap-2">
      <Button
        variant="outline"
        className={cn('flex-1', value === 'win' && 'border-green-500 bg-green-500/5')}
        onPress={() => onChange('win')}>
        <Icon as={CheckIcon} className="text-green-600" />
        <Text>Win</Text>
      </Button>
      <Button
        variant="outline"
        className={cn('flex-1', value === 'gratitude' && 'border-pink-500 bg-pink-500/5')}
        onPress={() => onChange('gratitude')}>
        <Icon as={HeartIcon} className="text-pink-600" />
        <Text>Gratitude</Text>
      </Button>
    </View>
  );
}
