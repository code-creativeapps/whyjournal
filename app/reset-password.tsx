import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { AlertCircleIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase/client';

// Reads tokens / code from the deep link Supabase sent the user and
// hands them to the supabase client so updateUser() works.
async function consumeRecoveryUrl(url: string | null): Promise<{ ok: boolean; error?: string }> {
  if (!url) return { ok: false, error: 'Missing recovery link' };
  try {
    const parsed = Linking.parse(url);
    // PKCE flow puts `code` in query params; implicit flow uses hash fragment.
    const code = (parsed.queryParams?.code as string | undefined) ?? undefined;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return { ok: true };
    }
    // Implicit flow: tokens live in the URL fragment (#access_token=...&refresh_token=...)
    const hash = url.split('#')[1] ?? '';
    if (hash) {
      const params = Object.fromEntries(
        hash.split('&').map((kv) => {
          const [k, v = ''] = kv.split('=');
          return [decodeURIComponent(k), decodeURIComponent(v)];
        })
      );
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        return { ok: true };
      }
    }
    return { ok: false, error: 'Recovery link missing credentials' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Recovery failed' };
  }
}

export default function ResetPasswordScreen() {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const initial = await Linking.getInitialURL();
      const result = await consumeRecoveryUrl(initial);
      if (cancelled) return;
      if (result.ok) {
        setReady(true);
      } else {
        setError(result.error ?? 'Recovery link invalid');
      }
    })();
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const result = await consumeRecoveryUrl(url);
      if (cancelled) return;
      if (result.ok) {
        setReady(true);
        setError(null);
      } else {
        setError(result.error ?? 'Recovery link invalid');
      }
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const canSubmit =
    ready && password.length >= 8 && password === confirm && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
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
              New password
            </Text>
            <Text variant="muted">Set a fresh password to finish recovery.</Text>
          </View>

          <Input
            placeholder="New password"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            editable={ready}
            returnKeyType="next"
          />
          <Input
            placeholder="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            autoCapitalize="none"
            autoComplete="new-password"
            secureTextEntry
            editable={ready}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <Button onPress={handleSubmit} disabled={!canSubmit} size="lg">
            <Text>{submitting ? 'Updating…' : 'Update password'}</Text>
          </Button>

          {error ? (
            <View className="flex-row items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <Icon as={AlertCircleIcon} size={18} className="text-destructive" />
              <Text className="flex-1 text-sm leading-5 text-destructive">{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
