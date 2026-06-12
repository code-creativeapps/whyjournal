import { Stack, router } from 'expo-router';
import { CheckIcon, DiamondIcon, RepeatIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitsStore } from '@/lib/stores/habits';
import {
  useOnboardingStore,
  type OnboardingFocus,
} from '@/lib/stores/onboarding';
import { cn } from '@/lib/utils';

const STEPS = ['welcome', 'focus', 'goal', 'habit'] as const;
type Step = (typeof STEPS)[number];

const FOCUS_OPTIONS: { value: OnboardingFocus; emoji: string; label: string }[] = [
  { value: 'journal', emoji: '📝', label: 'Journal what’s going well' },
  { value: 'habits', emoji: '🔁', label: 'Build daily habits' },
  { value: 'goals', emoji: '🎯', label: 'Hit bigger goals' },
  { value: 'all', emoji: '🚀', label: 'All of it' },
];

// Goal suggestions surfaced as chips. Keyed by the focus segment from screen 2.
const GOAL_SUGGESTIONS: Record<OnboardingFocus, string[]> = {
  journal: [
    'Notice more wins',
    'Become more grateful',
    'Track my mood',
    'Be a calmer person',
  ],
  habits: [
    'Get fit',
    'Sleep better',
    'Read 1 book / month',
    'Be a calmer person',
  ],
  goals: [
    'Run a half-marathon',
    'Ship 1 app / month',
    'Save $10k',
    'Learn Spanish',
  ],
  all: [
    'Run a half-marathon',
    'Ship 1 app / month',
    'Read 1 book / month',
    'Sleep better',
    'Save $10k',
  ],
};

// Habit suggestions tied to common goals. The fallback list runs when nothing
// matches the user's chosen goal text.
const HABIT_SUGGESTIONS: { match: RegExp; items: { title: string; timesPerWeek: number }[] }[] = [
  {
    match: /run|marathon/i,
    items: [
      { title: 'Run', timesPerWeek: 3 },
      { title: 'Stretch 10 min', timesPerWeek: 7 },
      { title: 'Walk 5km', timesPerWeek: 4 },
    ],
  },
  {
    match: /ship|app|build|code/i,
    items: [
      { title: 'Code 1 hour', timesPerWeek: 5 },
      { title: 'Ship 1 commit', timesPerWeek: 6 },
      { title: 'Sketch one screen', timesPerWeek: 3 },
    ],
  },
  {
    match: /sleep|rest/i,
    items: [
      { title: 'Lights off by 11', timesPerWeek: 7 },
      { title: 'No phone in bed', timesPerWeek: 7 },
      { title: 'Stretch before bed', timesPerWeek: 5 },
    ],
  },
  {
    match: /read|book/i,
    items: [
      { title: 'Read 10 pages', timesPerWeek: 7 },
      { title: 'Listen to audiobook', timesPerWeek: 4 },
    ],
  },
  {
    match: /spanish|language|learn/i,
    items: [
      { title: 'Duolingo lesson', timesPerWeek: 7 },
      { title: 'Watch 1 episode in target language', timesPerWeek: 3 },
    ],
  },
  {
    match: /grateful|mood|calm|journal|notice/i,
    items: [
      { title: '5-minute journal', timesPerWeek: 7 },
      { title: 'List 3 gratitudes', timesPerWeek: 7 },
      { title: '10-min meditation', timesPerWeek: 5 },
    ],
  },
  {
    match: /save|money|finance/i,
    items: [
      { title: 'Log every expense', timesPerWeek: 7 },
      { title: 'No-spend day', timesPerWeek: 2 },
    ],
  },
  {
    match: /fit|gym|workout/i,
    items: [
      { title: 'Workout 30 min', timesPerWeek: 4 },
      { title: 'Walk 8k steps', timesPerWeek: 7 },
      { title: 'Stretch 10 min', timesPerWeek: 7 },
    ],
  },
];

const FALLBACK_HABITS = [
  { title: 'Drink water', timesPerWeek: 7 },
  { title: 'Move your body', timesPerWeek: 5 },
  { title: 'Read 10 pages', timesPerWeek: 7 },
  { title: '5-minute journal', timesPerWeek: 7 },
];

export default function OnboardingScreen() {
  const [step, setStep] = React.useState<Step>('welcome');
  const [focus, setFocus] = React.useState<OnboardingFocus | null>(null);
  const [goalTitle, setGoalTitle] = React.useState('');
  const [habitTitle, setHabitTitle] = React.useState('');
  const [habitTimes, setHabitTimes] = React.useState(7);
  const [saving, setSaving] = React.useState(false);
  const insets = useSafeAreaInsets();

  const stepIdx = STEPS.indexOf(step);
  const isLast = stepIdx === STEPS.length - 1;
  const goalHasContent = goalTitle.trim().length > 0;
  const habitHasContent = habitTitle.trim().length > 0;
  const canContinue =
    (step === 'welcome' ||
      (step === 'focus' && focus !== null) ||
      (step === 'goal' && goalHasContent) ||
      (step === 'habit' && habitHasContent)) &&
    !saving;

  async function finish(skipped: boolean) {
    setSaving(true);
    try {
      let createdGoalId: string | undefined;
      if (!skipped && goalHasContent) {
        // Mark this as cornerstone only if the user has no other goals yet.
        const existing = useGoalsStore.getState().items;
        const hasCornerstone = existing.some((g) => g.isCornerstone);
        const goal = await useGoalsStore.getState().addItem({
          title: goalTitle.trim(),
          done: false,
          isCornerstone: !hasCornerstone,
        });
        createdGoalId = goal.id;
      }
      if (!skipped && habitHasContent) {
        await useHabitsStore.getState().addItem({
          title: habitTitle.trim(),
          timesPerWeek: habitTimes,
          goalId: createdGoalId,
        });
      }
      await useOnboardingStore.getState().markComplete(focus ?? 'all');
      router.replace('/');
    } catch (err) {
      Alert.alert('Couldn’t save', err instanceof Error ? err.message : '');
    } finally {
      setSaving(false);
    }
  }

  function next() {
    if (isLast) {
      finish(false);
      return;
    }
    setStep(STEPS[stepIdx + 1]);
  }

  function back() {
    if (stepIdx > 0) setStep(STEPS[stepIdx - 1]);
  }

  function ctaLabel() {
    if (isLast) return saving ? 'Saving…' : 'Create my starter habit';
    if (step === 'welcome') return 'Let’s set you up';
    return 'Continue';
  }

  const goalChips = focus ? GOAL_SUGGESTIONS[focus] : GOAL_SUGGESTIONS.all;
  const habitChipMatch = HABIT_SUGGESTIONS.find((s) => s.match.test(goalTitle));
  const habitChips = habitChipMatch?.items ?? FALLBACK_HABITS;

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
            {step !== 'welcome' ? (
              <Pressable onPress={() => finish(true)} hitSlop={8} disabled={saving}>
                <Text className="text-sm font-medium text-muted-foreground">Skip</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => router.replace('/sign-in')} hitSlop={8}>
                <Text className="text-sm font-medium text-primary">I have an account</Text>
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}>
          <Animated.View key={step} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
            {step === 'welcome' && <WelcomeStep />}
            {step === 'focus' && <FocusStep value={focus} onChange={setFocus} />}
            {step === 'goal' && (
              <GoalStep
                value={goalTitle}
                onChange={setGoalTitle}
                suggestions={goalChips}
                onSubmit={() => goalHasContent && next()}
              />
            )}
            {step === 'habit' && (
              <HabitStep
                value={habitTitle}
                onChange={setHabitTitle}
                times={habitTimes}
                onTimesChange={setHabitTimes}
                suggestions={habitChips}
                onSubmit={() => habitHasContent && next()}
              />
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
          <Button onPress={next} className="flex-1" disabled={!canContinue}>
            <Text>{ctaLabel()}</Text>
          </Button>
        </View>
      </View>
    </>
  );
}

function WelcomeStep() {
  return (
    <View className="gap-6 pt-4">
      <Text variant="h1" className="text-4xl font-extrabold leading-tight">
        ✨ Win the day, every day.
      </Text>
      <Text variant="lead" className="text-muted-foreground">
        LogHero turns small daily wins into momentum — one calm ritual, no app-switching.
      </Text>
      <JournalPreview />
    </View>
  );
}

function JournalPreview() {
  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-background">
      <View className="border-b border-border px-4 py-2">
        <Text variant="small" className="text-muted-foreground">
          Today
        </Text>
      </View>
      <PreviewRow
        icon={CheckIcon}
        iconBg="bg-green-500/15"
        iconColor="text-green-600"
        title="Ran 5 km"
        body="Beat last week’s time"
      />
      <View className="h-px bg-border" />
      <PreviewRow
        icon={RepeatIcon}
        iconBg="bg-purple-600/15"
        iconColor="text-purple-600"
        title="Yoga"
      />
      <View className="h-px bg-border" />
      <PreviewRow
        icon={DiamondIcon}
        iconBg="bg-orange-500/15"
        iconColor="text-orange-500"
        title="Shipped a draft"
      />
    </View>
  );
}

function PreviewRow({
  icon,
  iconBg,
  iconColor,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof Icon>['as'];
  iconBg: string;
  iconColor: string;
  title: string;
  body?: string;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-2.5">
      <View className={cn('size-7 items-center justify-center rounded-full', iconBg)}>
        <Icon as={icon} size={17} className={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-base" numberOfLines={1}>
          {title}
        </Text>
        {body ? (
          <Text variant="muted" numberOfLines={1} className="text-xs">
            {body}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function FocusStep({
  value,
  onChange,
}: {
  value: OnboardingFocus | null;
  onChange: (v: OnboardingFocus) => void;
}) {
  return (
    <View className="gap-4 pt-4">
      <Text variant="h2">What brings you here?</Text>
      <Text variant="muted">Pick the one that feels closest right now.</Text>
      <View className="gap-2">
        {FOCUS_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={cn(
                'flex-row items-center gap-3 rounded-2xl border bg-background px-4 py-4',
                selected ? 'border-primary bg-primary/5' : 'border-border'
              )}>
              <Text className="text-2xl">{opt.emoji}</Text>
              <Text className="flex-1 text-base font-medium">{opt.label}</Text>
              <View
                className={cn(
                  'size-6 items-center justify-center rounded-full border-2',
                  selected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                )}>
                {selected ? <Icon as={CheckIcon} size={14} className="text-white" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function GoalStep({
  value,
  onChange,
  suggestions,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  onSubmit: () => void;
}) {
  return (
    <View className="gap-4 pt-4">
      <Text variant="h2">What are you really after right now?</Text>
      <Text variant="muted">Pick one. You can always add more later.</Text>
      <View className="flex-row flex-wrap gap-2">
        {suggestions.map((s) => {
          const selected = value === s;
          return (
            <Pressable
              key={s}
              onPress={() => onChange(s)}
              className={cn(
                'rounded-full border px-3 py-2',
                selected ? 'border-primary bg-primary/10' : 'border-border bg-background'
              )}>
              <Text
                className={cn(
                  'text-sm font-medium',
                  selected ? 'text-primary' : 'text-foreground'
                )}>
                {s}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Input
        placeholder="Or write your own…"
        value={value}
        onChangeText={onChange}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
    </View>
  );
}

function HabitStep({
  value,
  onChange,
  times,
  onTimesChange,
  suggestions,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  times: number;
  onTimesChange: (n: number) => void;
  suggestions: { title: string; timesPerWeek: number }[];
  onSubmit: () => void;
}) {
  function pick(s: { title: string; timesPerWeek: number }) {
    onChange(s.title);
    onTimesChange(s.timesPerWeek);
  }
  return (
    <View className="gap-4 pt-4">
      <Text variant="h2">Small thing you’ll do for it.</Text>
      <Text variant="muted">A daily-ish action you can imagine actually doing.</Text>
      <View className="flex-row flex-wrap gap-2">
        {suggestions.map((s) => {
          const selected = value === s.title;
          return (
            <Pressable
              key={s.title}
              onPress={() => pick(s)}
              className={cn(
                'rounded-full border px-3 py-2',
                selected ? 'border-primary bg-primary/10' : 'border-border bg-background'
              )}>
              <Text
                className={cn(
                  'text-sm font-medium',
                  selected ? 'text-primary' : 'text-foreground'
                )}>
                {s.title}
                <Text variant="muted" className="text-xs">{`  ${s.timesPerWeek}×/wk`}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Input
        placeholder="Or your own habit…"
        value={value}
        onChangeText={onChange}
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      <View className="gap-1.5">
        <Text variant="small" className="text-muted-foreground">
          How many times per week?
        </Text>
        <View className="flex-row gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const selected = times === n;
            return (
              <Pressable
                key={n}
                onPress={() => onTimesChange(n)}
                className={cn(
                  'h-9 flex-1 items-center justify-center rounded-full border',
                  selected ? 'border-primary bg-primary' : 'border-border bg-background'
                )}>
                <Text
                  className={cn(
                    'text-sm font-semibold',
                    selected ? 'text-white' : 'text-foreground'
                  )}>
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
