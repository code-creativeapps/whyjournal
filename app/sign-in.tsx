import { Stack, router } from 'expo-router';
import { AlertCircleIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OAuthButtons } from '@/components/oauth-buttons';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/stores/auth';

export default function SignInScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);

  React.useEffect(() => {
    if (session) router.replace('/');
  }, [session]);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSignIn() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await useAuthStore.getState().signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-background">
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 48,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 32,
            gap: 24,
          }}
          keyboardShouldPersistTaps="handled">
          <View className="gap-2">
            <Text variant="h1" className="text-4xl font-extrabold leading-tight">
              Welcome back
            </Text>
            <Text variant="muted">Sign in to keep your wins, goals, and streak in sync.</Text>
          </View>

          <View className="gap-3">
            <Input
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
          </View>

          <Button onPress={handleSignIn} disabled={!canSubmit} size="lg">
            <Text>{submitting ? 'Signing in…' : 'Sign in'}</Text>
          </Button>

          {error ? (
            <View className="flex-row items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <Icon as={AlertCircleIcon} size={18} className="text-destructive" />
              <Text className="flex-1 text-sm leading-5 text-destructive">{error}</Text>
            </View>
          ) : null}

          <Divider />
          <OAuthButtons disabled={submitting} />

          <Pressable onPress={() => router.replace('/sign-up')} className="self-center pt-2">
            <Text variant="muted">
              No account?{' '}
              <Text className="text-primary" style={{ fontWeight: '600' }}>
                Create one
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Divider() {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text variant="muted" className="text-xs">
        or
      </Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
