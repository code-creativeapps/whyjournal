import { Link } from 'expo-router';
import { PlusIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBorder } from '@/components/animated-border';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.2,
  shadowRadius: 10,
  elevation: 8,
  borderRadius: 9999,
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
      <View style={SHADOW}>
        <AnimatedBorder thickness={2}>
          <Link href={href} asChild>
            <Button size="icon" className="size-14 rounded-full">
              <Icon as={PlusIcon} className="size-6" />
            </Button>
          </Link>
        </AnimatedBorder>
      </View>
    </View>
  );
}
