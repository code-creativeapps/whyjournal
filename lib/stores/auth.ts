import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase/client';

type State = {
  session: Session | null;
  loading: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

let initialized = false;

export const useAuthStore = create<State>((set) => ({
  session: null,
  loading: true,

  async init() {
    if (initialized) return;
    initialized = true;
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, loading: false });
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },

  async signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  async signInWithApple() {
    // On iOS, use the native Sign in with Apple flow (required by Apple's
    // App Store guideline 4.8 when other social-login providers are offered).
    // Other platforms fall back to the web OAuth flow.
    if (Platform.OS === 'ios') {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token');
      }
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) throw error;
      return;
    }
    await signInWithOAuth('apple');
  },

  async signInWithGoogle() {
    await signInWithOAuth('google');
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
}));

async function signInWithOAuth(provider: 'apple' | 'google') {
  const redirectTo = Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No auth URL returned by Supabase');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return;

  const params = parseFragment(result.url);
  if (params.access_token && params.refresh_token) {
    const { error: setError } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (setError) throw setError;
  }
}

function parseFragment(url: string): Record<string, string> {
  const fragment = url.split('#')[1] ?? url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value) params[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return params;
}
