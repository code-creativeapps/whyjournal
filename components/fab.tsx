import { Link } from 'expo-router';
import { PlusIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 8,
};

export function Fab({ href }: { href: Parameters<typeof Link>[0]['href'] }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + 16,
        alignItems: 'center',
      }}>
      <Link href={href} asChild>
        <Button size="icon" className="size-14 rounded-full" style={SHADOW}>
          <Icon as={PlusIcon} className="size-6" />
        </Button>
      </Link>
    </View>
  );
}
