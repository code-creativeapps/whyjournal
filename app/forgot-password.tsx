import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
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

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const insets = useSafeAreaInsets();

  const canSubmit = email.trim().length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const redirectTo = Linking.createURL('/reset-password');
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email');
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
              Reset password
            </Text>
            <Text variant="muted">
              {sent
                ? "Check your inbox — we sent a link to set a new password."
                : 'Enter your account email and we’ll send you a link.'}
            </Text>
          </View>

          {!sent ? (
            <>
              <Input
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Button onPress={handleSubmit} disabled={!canSubmit} size="lg">
                <Text>{submitting ? 'Sending…' : 'Send reset link'}</Text>
              </Button>

              {error ? (
                <View className="flex-row items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                  <Icon as={AlertCircleIcon} size={18} className="text-destructive" />
                  <Text className="flex-1 text-sm leading-5 text-destructive">{error}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Button onPress={() => router.replace('/sign-in')} size="lg" variant="outline">
              <Text>Back to sign in</Text>
            </Button>
          )}

          <Pressable onPress={() => router.replace('/sign-in')} className="self-center pt-2">
            <Text variant="muted">
              Remember it?{' '}
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
