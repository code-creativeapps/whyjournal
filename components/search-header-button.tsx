import { router } from 'expo-router';
import { SearchIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';

export function SearchHeaderButton() {
  return (
    <Pressable
      onPress={() => router.push('/search')}
      hitSlop={8}
      className="px-3 py-2 active:opacity-60">
      <Icon as={SearchIcon} size={20} className="text-foreground" />
    </Pressable>
  );
}
