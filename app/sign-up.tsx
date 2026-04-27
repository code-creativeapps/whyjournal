import { Stack, router } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertCircleIcon, MailCheckIcon } from 'lucide-react-native';

import { OAuthButtons } from '@/components/oauth-buttons';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/stores/auth';

export default function SignUpScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);

  React.useEffect(() => {
    if (session) router.replace('/');
  }, [session]);

  const canSubmit = email.trim().length > 0 && password.length >= 6 && !submitting;

  async function handleSignUp() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    const trimmed = email.trim();
    try {
      await useAuthStore.getState().signUp(trimmed, password);
      // If email confirmation is required, no session arrives — show a confirmation
      // panel. If confirmation is off, the auth gate effect above will redirect us.
      setSubmittedEmail(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
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
              Create your account
            </Text>
            <Text variant="muted">A spot to capture your wins, goals, and trophies.</Text>
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
              placeholder="Password (6+ characters)"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
          </View>

          <Button onPress={handleSignUp} disabled={!canSubmit} size="lg">
            <Text>{submitting ? 'Creating…' : 'Create account'}</Text>
          </Button>

          {error ? (
            <View className="flex-row items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <Icon as={AlertCircleIcon} size={18} className="text-destructive" />
              <Text className="flex-1 text-sm leading-5 text-destructive">{error}</Text>
            </View>
          ) : null}

          {submittedEmail ? (
            <View className="flex-row items-start gap-3 rounded-xl border border-green-500/40 bg-green-500/10 p-4">
              <Icon as={MailCheckIcon} size={18} className="text-green-700" />
              <View className="flex-1 gap-1">
                <Text className="text-sm font-semibold text-green-700">
                  Check your inbox
                </Text>
                <Text className="text-sm leading-5 text-green-700/90">
                  We sent a confirmation link to {submittedEmail}. Tap it, then come back
                  and sign in.
                </Text>
              </View>
            </View>
          ) : null}

          <Divider />
          <OAuthButtons disabled={submitting} />

          <Pressable onPress={() => router.replace('/sign-in')} className="self-center pt-2">
            <Text variant="muted">
              Already have an account?{' '}
              <Text className="text-primary" style={{ fontWeight: '600' }}>
                Sign in
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
