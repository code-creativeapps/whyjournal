import * as AppleAuthentication from 'expo-apple-authentication';
import * as React from 'react';
import { Alert, Platform, Pressable, View, useColorScheme } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/stores/auth';
import { cn } from '@/lib/utils';

export function OAuthButtons({ disabled }: { disabled?: boolean }) {
  const [busy, setBusy] = React.useState<'apple' | 'google' | null>(null);
  const colorScheme = useColorScheme();

  async function handle(provider: 'apple' | 'google') {
    if (busy) return;
    setBusy(provider);
    try {
      if (provider === 'apple') {
        await useAuthStore.getState().signInWithApple();
      } else {
        await useAuthStore.getState().signInWithGoogle();
      }
    } catch (err) {
      // User-cancelled native Apple sign-in surfaces as a specific error code
      // we just swallow.
      const code = (err as { code?: string })?.code;
      if (code === 'ERR_REQUEST_CANCELED') return;
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      Alert.alert('Sign-in failed', message);
    } finally {
      setBusy(null);
    }
  }

  // Apple's HIG requires their official button when offering Sign in with
  // Apple on iOS, so we render the native one there.
  const appleButton =
    Platform.OS === 'ios' ? (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          colorScheme === 'dark'
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={22}
        style={{ height: 44, width: '100%' }}
        onPress={() => handle('apple')}
      />
    ) : null;

  return (
    <View className="gap-2">
      {appleButton}
      <ProviderButton
        onPress={() => handle('google')}
        disabled={disabled || busy !== null}
        loading={busy === 'google'}
        label="Continue with Google"
        renderIcon={() => (
          <View className="size-[18px] items-center justify-center">
            <Text className="text-base font-bold leading-none text-blue-600">G</Text>
          </View>
        )}
      />
    </View>
  );
}

function ProviderButton({
  onPress,
  disabled,
  loading,
  label,
  renderIcon,
}: {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  renderIcon: () => React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'h-11 flex-row items-center justify-center gap-2 rounded-full border border-border bg-background',
        disabled && 'opacity-60'
      )}>
      {renderIcon()}
      <Text className="text-base font-semibold text-foreground">
        {loading ? '…' : label}
      </Text>
    </Pressable>
  );
}
