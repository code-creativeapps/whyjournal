import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Drawer } from 'expo-router/drawer';
import { Redirect } from 'expo-router';
import {
  BarChart3Icon,
  CheckSquareIcon,
  LayersIcon,
  ListIcon,
  type LucideIcon,
  QuoteIcon,
  RepeatIcon,
  SettingsIcon,
  StarIcon,
  TargetIcon,
  TrophyIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchHeaderButton } from '@/components/search-header-button';
import { StatPill } from '@/components/stat-pill';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/stores/auth';
import { useOnboardingStore } from '@/lib/stores/onboarding';
import { useSettingsStore } from '@/lib/stores/settings';
import { THEME } from '@/lib/theme';
import { cn } from '@/lib/utils';

const DRAWER_COLORS = {
  journal: '#ec4899',
  affirmations: '#6366f1',
  bucket: '#eab308',
  goals: '#ef4444',
  trophies: '#f59e0b',
  todos: '#22c55e',
  metrics: '#0ea5e9',
};

type Section = {
  name: string;
  label: string;
  icon: LucideIcon;
  bgClass: string;
  iconColorClass: string;
};

const SECTIONS: Section[] = [
  {
    name: 'index',
    label: 'Journal',
    icon: ListIcon,
    bgClass: 'bg-indigo-500/15',
    iconColorClass: 'text-indigo-500',
  },
  {
    name: 'affirmations',
    label: 'Reminders',
    icon: QuoteIcon,
    bgClass: 'bg-sky-500/15',
    iconColorClass: 'text-sky-500',
  },
  {
    name: 'bucket',
    label: 'Bucket list',
    icon: StarIcon,
    bgClass: 'bg-yellow-500/15',
    iconColorClass: 'text-yellow-500',
  },
  {
    name: 'goals',
    label: 'Goals',
    icon: TargetIcon,
    bgClass: 'bg-red-500/15',
    iconColorClass: 'text-red-500',
  },
  {
    name: 'projects',
    label: 'Projects',
    icon: LayersIcon,
    bgClass: 'bg-cyan-500/15',
    iconColorClass: 'text-cyan-500',
  },
  {
    name: 'habits',
    label: 'Habits',
    icon: RepeatIcon,
    bgClass: 'bg-purple-600/15',
    iconColorClass: 'text-purple-600',
  },
  {
    name: 'trophies',
    label: 'Trophies',
    icon: TrophyIcon,
    bgClass: 'bg-amber-500/15',
    iconColorClass: 'text-amber-500',
  },
  {
    name: 'todos',
    label: 'Todos',
    icon: CheckSquareIcon,
    bgClass: 'bg-green-500/15',
    iconColorClass: 'text-green-500',
  },
];

const BOTTOM_ITEMS: Section[] = [
  {
    name: 'metrics',
    label: 'Metrics',
    icon: BarChart3Icon,
    bgClass: 'bg-pink-500/15',
    iconColorClass: 'text-pink-500',
  },
  {
    name: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    bgClass: 'bg-muted',
    iconColorClass: 'text-muted-foreground',
  },
];

export default function DrawerLayout() {
  const session = useAuthStore((s) => s.session);
  const authLoading = useAuthStore((s) => s.loading);
  const hydrated = useOnboardingStore((s) => s.hydrated);
  const completed = useOnboardingStore((s) => s.completed);

  React.useEffect(() => {
    useSettingsStore.getState().hydrate();
  }, []);

  if (authLoading) return null;
  if (!session) return <Redirect href="/sign-in" />;
  if (!hydrated) return null;
  if (!completed) return <Redirect href="/onboarding" />;
  return (
    <Drawer
      screenOptions={{
        headerShown: true,
        drawerType: 'slide',
        headerTintColor: THEME.light.primary,
        headerStyle: { backgroundColor: THEME.light.background },
        headerTitleStyle: { color: THEME.light.foreground },
        headerShadowVisible: false,
        headerRight: () => <SearchHeaderButton />,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}>
      <Drawer.Screen
        name="index"
        options={{
          title: 'Journal',
          headerRight: () => (
            <View className="flex-row items-center gap-2 pr-1">
              <StatPill />
              <SearchHeaderButton />
            </View>
          ),
        }}
      />
      <Drawer.Screen name="affirmations" options={{ title: 'Reminders' }} />
      <Drawer.Screen name="bucket" options={{ title: 'Bucket list' }} />
      <Drawer.Screen name="goals" options={{ title: 'Goals' }} />
      <Drawer.Screen name="projects" options={{ title: 'Projects' }} />
      <Drawer.Screen name="habits" options={{ title: 'Habits' }} />
      <Drawer.Screen name="trophies" options={{ title: 'Trophies' }} />
      <Drawer.Screen name="todos" options={{ title: 'Todos' }} />
      <Drawer.Screen name="metrics" options={{ title: 'Metrics' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const activeRoute = props.state.routes[props.state.index]?.name;
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 0 }}>
        {SECTIONS.map((section, idx) => (
          <View key={section.name}>
            {idx > 0 ? <View className="h-px bg-border" /> : null}
            <DrawerRow
              section={section}
              active={activeRoute === section.name}
              onPress={() => props.navigation.navigate(section.name)}
            />
          </View>
        ))}
      </DrawerContentScrollView>
      <View className="border-t border-border" style={{ paddingBottom: insets.bottom }}>
        {BOTTOM_ITEMS.map((item, idx) => (
          <View key={item.name}>
            {idx > 0 ? <View className="h-px bg-border" /> : null}
            <DrawerRow
              section={item}
              active={activeRoute === item.name}
              onPress={() => props.navigation.navigate(item.name)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function DrawerRow({
  section,
  active,
  onPress,
}: {
  section: Section;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn('active:bg-accent', active && 'bg-accent/60')}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <View
          className={cn(
            'size-6 items-center justify-center rounded-full',
            section.bgClass
          )}>
          <Icon as={section.icon} size={14} className={section.iconColorClass} />
        </View>
        <Text className={cn('text-base', active && 'font-semibold')}>{section.label}</Text>
      </View>
    </Pressable>
  );
}
