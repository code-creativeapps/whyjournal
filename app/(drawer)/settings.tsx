import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ExternalLinkIcon, Trash2Icon } from 'lucide-react-native';
import { Platform } from 'react-native';
import * as React from 'react';
import { Alert, Linking, Pressable, ScrollView, Switch, View } from 'react-native';

const PRIVACY_POLICY_URL = 'https://www.creativeapps.studio/privacy';

function appVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : String(Constants.expoConfig?.android?.versionCode ?? '');
  return build ? `${version} (${build})` : version;
}

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/stores/auth';
import { useSettingsStore } from '@/lib/stores/settings';
import { supabase } from '@/lib/supabase/client';

export default function SettingsScreen() {
  const showActivity = useSettingsStore((s) => s.showActivityInJournal);
  const setShowActivity = useSettingsStore((s) => s.setShowActivityInJournal);
  const [deleting, setDeleting] = React.useState(false);

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently erases your account and all your entries, habits, goals, todos, and milestones. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_current_user');
      if (error) throw error;
      await useAuthStore.getState().signOut();
      router.replace('/sign-in');
    } catch (err) {
      Alert.alert('Could not delete account', err instanceof Error ? err.message : '');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerClassName="gap-6 px-4 pt-4 pb-10">
      <View className="gap-1.5">
        <Text className="text-sm font-semibold">Journal</Text>
        <View className="flex-row items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2">
          <View className="flex-1">
            <Text className="text-base">Show completed items</Text>
            <Text variant="muted" className="text-xs">
              Habits, todos, and milestones you check off appear in the journal timeline.
            </Text>
          </View>
          <Switch value={showActivity} onValueChange={setShowActivity} />
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-semibold">About</Text>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          className="flex-row items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-3 active:bg-accent">
          <Text className="text-base">Privacy policy</Text>
          <Icon as={ExternalLinkIcon} size={16} className="text-muted-foreground" />
        </Pressable>
        <View className="flex-row items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-3">
          <Text className="text-base">Version</Text>
          <Text variant="muted" className="text-sm">
            {appVersionLabel()}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-semibold">Account</Text>
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          className="flex-row items-center justify-between gap-3 rounded-md border border-destructive/40 bg-background px-3 py-3 active:bg-destructive/10">
          <View className="flex-1">
            <Text className="text-base text-destructive">
              {deleting ? 'Deleting…' : 'Delete account'}
            </Text>
            <Text variant="muted" className="text-xs">
              Permanently erase your account and all data.
            </Text>
          </View>
          <Icon as={Trash2Icon} size={18} className="text-destructive" />
        </Pressable>
      </View>
    </ScrollView>
  );
}
