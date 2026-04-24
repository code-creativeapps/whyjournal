import { Stack, router } from 'expo-router';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, TextInput as RNTextInput, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CelebrationIllustration from '@/assets/illustrations/celebration.svg';
import GoalIllustration from '@/assets/illustrations/goal.svg';
import TrophyIllustration from '@/assets/illustrations/trophy.svg';
import WelcomeIllustration from '@/assets/illustrations/welcome.svg';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { celebrate, celebrateTrophy } from '@/lib/celebrate';
import { useEntriesStore } from '@/lib/stores/entries';
import { useGoalsStore } from '@/lib/stores/goals';
import { useOnboardingStore } from '@/lib/stores/onboarding';
import { useTrophiesStore } from '@/lib/stores/trophies';

const SCREEN_WIDTH = Dimensions.get('window').width;
const STEPS = ['welcome', 'trophy', 'goal', 'win'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingScreen() {
  const [step, setStep] = React.useState<Step>('welcome');
  const [trophyTitle, setTrophyTitle] = React.useState('');
  const [trophyWhen, setTrophyWhen] = React.useState('');
  const [goalTitle, setGoalTitle] = React.useState('');
  const [winTitle, setWinTitle] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const insets = useSafeAreaInsets();
  const cannon = React.useRef<ConfettiCannon>(null);

  const stepIdx = STEPS.indexOf(step);
  const isLast = stepIdx === STEPS.length - 1;

  async function finish() {
    setSaving(true);
    try {
      if (trophyTitle.trim()) {
        await useTrophiesStore.getState().addItem({
          title: trophyTitle.trim(),
          when: trophyWhen.trim() || undefined,
        });
      }
      if (goalTitle.trim()) {
        await useGoalsStore.getState().addItem({
          title: goalTitle.trim(),
          done: false,
        });
      }
      if (winTitle.trim()) {
        await useEntriesStore.getState().addEntry({
          type: 'win',
          title: winTitle.trim(),
        });
      }
      await useOnboardingStore.getState().markComplete();
      router.replace('/');
    } finally {
      setSaving(false);
    }
  }

  function next() {
    // Fire the celebration for leaving the current step, if the user filled it in.
    if (step === 'trophy' && trophyTitle.trim()) {
      celebrateTrophy();
      cannon.current?.start();
    } else if (step === 'win' && winTitle.trim()) {
      celebrate();
      cannon.current?.start();
    }

    if (isLast) {
      finish();
      return;
    }
    setStep(STEPS[stepIdx + 1]);
  }

  function back() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View className="flex-1 bg-background">
        <View style={{ paddingTop: insets.top + 16 }}>
          <View className="flex-row items-center justify-between px-6 py-3">
            <View className="flex-row items-center gap-1.5">
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  className={
                    i === stepIdx
                      ? 'h-1.5 w-6 rounded-full bg-primary'
                      : i < stepIdx
                        ? 'h-1.5 w-1.5 rounded-full bg-primary/60'
                        : 'h-1.5 w-1.5 rounded-full bg-muted'
                  }
                />
              ))}
            </View>
            <Pressable onPress={finish} hitSlop={8} disabled={saving}>
              <Text className="text-sm font-medium text-muted-foreground">Skip</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}>
          <Animated.View
            key={step}
            entering={FadeIn.duration(260)}
            exiting={FadeOut.duration(120)}>
            {step === 'welcome' && <WelcomeStep />}
            {step === 'trophy' && (
              <TrophyStep
                title={trophyTitle}
                setTitle={setTrophyTitle}
                when={trophyWhen}
                setWhen={setTrophyWhen}
                onSubmit={next}
              />
            )}
            {step === 'goal' && (
              <GoalStep title={goalTitle} setTitle={setGoalTitle} onSubmit={next} />
            )}
            {step === 'win' && (
              <WinStep title={winTitle} setTitle={setWinTitle} onSubmit={next} />
            )}
          </Animated.View>
        </ScrollView>

        <View
          className="flex-row gap-3 border-t border-border bg-background px-6 pt-3"
          style={{ paddingBottom: insets.bottom + 12 }}>
          {stepIdx > 0 ? (
            <Button variant="outline" onPress={back} className="flex-1" disabled={saving}>
              <Text>Back</Text>
            </Button>
          ) : null}
          <Button onPress={next} className="flex-1" disabled={saving}>
            <Text>{isLast ? 'Finish' : stepIdx === 0 ? 'Get started' : 'Next'}</Text>
          </Button>
        </View>
      </View>

      <View pointerEvents="none" className="absolute inset-0">
        <ConfettiCannon
          ref={cannon}
          count={120}
          origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={2800}
        />
      </View>
    </>
  );
}

function Illustration({ Component }: { Component: React.FC<{ width?: number; height?: number }> }) {
  return (
    <View className="items-center">
      <Component width={200} height={140} />
    </View>
  );
}

function WelcomeStep() {
  return (
    <View className="gap-6">
      <Illustration Component={WelcomeIllustration} />
      <Text variant="h1" className="text-4xl font-extrabold leading-tight">
        Five minutes a day.
      </Text>
      <Text variant="lead" className="text-muted-foreground">
        Capture wins, remember your trophies, move your goals forward — one small entry at a time.
      </Text>
      <Text variant="muted">
        Let&apos;s set up a few things so the app isn&apos;t empty when you start.
      </Text>
    </View>
  );
}

function TrophyStep({
  title,
  setTitle,
  when,
  setWhen,
  onSubmit,
}: {
  title: string;
  setTitle: (v: string) => void;
  when: string;
  setWhen: (v: string) => void;
  onSubmit: () => void;
}) {
  const whenRef = React.useRef<RNTextInput>(null);
  return (
    <View className="gap-4">
      <Illustration Component={TrophyIllustration} />
      <Text variant="h2">🏆 Start with a trophy</Text>
      <Text variant="muted">
        Name one big thing you&apos;ve done. Something you want to come back to on hard days.
      </Text>
      <Input
        placeholder="e.g. Ran a marathon"
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={() => whenRef.current?.focus()}
      />
      <Input
        ref={whenRef}
        placeholder="When? (e.g. 2022) — optional"
        value={when}
        onChangeText={setWhen}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

function GoalStep({
  title,
  setTitle,
  onSubmit,
}: {
  title: string;
  setTitle: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View className="gap-4">
      <Illustration Component={GoalIllustration} />
      <Text variant="h2">🎯 What are you working on? </Text>
      <Text variant="muted">
        Pick one goal that matters right now. You can break it into milestones later.
      </Text>
      <Input
        placeholder="e.g. Learn Spanish"
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

function WinStep({
  title,
  setTitle,
  onSubmit,
}: {
  title: string;
  setTitle: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View className="gap-4">
      <Illustration Component={CelebrationIllustration} />
      <Text variant="h2">✅ One win from today</Text>
      <Text variant="muted">
        Anything positive, however small. This is the habit — five seconds a day.
      </Text>
      <Input
        placeholder="e.g. Went for a walk"
        value={title}
        onChangeText={setTitle}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <Text variant="muted" className="text-xs">
        You can open the app tomorrow and add another. That&apos;s all it takes.
      </Text>
    </View>
  );
}
