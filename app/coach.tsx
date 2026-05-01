import { Stack, router } from 'expo-router';
import {
  ArrowUpIcon,
  CheckIcon,
  CheckSquareIcon,
  DiamondIcon,
  LayersIcon,
  MicIcon,
  PlusIcon,
  RepeatIcon,
  SparklesIcon,
  StopCircleIcon,
  TargetIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBorder } from '@/components/animated-border';
import { CoachThinking } from '@/components/coach-thinking';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { askDiscover, askPlan, askQuestions, transcribeAudio } from '@/lib/coach/api';
import { applyPlan } from '@/lib/coach/apply-plan';
import { useCoachRecorder } from '@/lib/coach/recorder';
import type {
  CoachAnswers,
  CoachMode,
  CoachPhase,
  CoachPlanResponse,
  DiscoverTurn,
  GeneratedStep,
} from '@/lib/coach/types';
import { DEEP_TOTAL_TURNS } from '@/lib/coach/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';
import { cn } from '@/lib/utils';

type Stage =
  | { kind: 'mode_picker' }
  | { kind: 'dream_entry'; mode: CoachMode }
  // Quick branch
  | { kind: 'loading_questions'; dream: string }
  | {
      kind: 'script';
      stepIndex: number;
      dream: string;
      steps: GeneratedStep[];
      answers: CoachAnswers;
    }
  // Deep branch
  | {
      kind: 'discover';
      dream: string;
      turn: number; // 1-based, current question turn
      history: DiscoverTurn[]; // answered Q+A pairs so far
      currentQuestion: string;
      currentPhase: CoachPhase;
      currentSuggestions: string[];
      currentHint: string;
    }
  | {
      kind: 'loading_discover';
      dream: string;
      turn: number; // turn we're loading (1..6)
      history: DiscoverTurn[];
    }
  // Shared tail
  | { kind: 'loading_plan'; dream: string; answers: CoachAnswers }
  | { kind: 'plan'; plan: CoachPlanResponse };

function formatError(e: unknown): string {
  if (!e) return 'Unknown error';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (typeof e === 'object') {
    const obj = e as Record<string, unknown>;
    const parts: string[] = [];
    for (const k of ['message', 'details', 'hint', 'code']) {
      const v = obj[k];
      if (typeof v === 'string' && v) parts.push(v);
    }
    if (parts.length > 0) return parts.join(' · ');
    try {
      return JSON.stringify(e);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

const WELCOME_SUGGESTIONS = [
  'I want to run a half marathon by autumn',
  'Help me launch a side project this quarter',
  'I want to get fluent in Spanish in a year',
];

export default function CoachScreen() {
  const insets = useSafeAreaInsets();
  const recorder = useCoachRecorder();

  const [stage, setStage] = React.useState<Stage>({ kind: 'mode_picker' });
  const [selections, setSelections] = React.useState<Record<string, boolean>>({});
  const [transcribing, setTranscribing] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [textInput, setTextInput] = React.useState('');

  const goals = useGoalsStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);
  const projects = useProjectsStore((s) => s.items);

  const currentPhase: CoachPhase | null = React.useMemo(() => {
    switch (stage.kind) {
      case 'mode_picker':
      case 'dream_entry':
        return null;
      case 'loading_questions':
        return 'dream';
      case 'script':
        return stage.steps[stage.stepIndex]?.phase ?? null;
      case 'discover':
        return stage.currentPhase;
      case 'loading_discover':
        return 'drill_in';
      case 'loading_plan':
        return 'drill_in';
      case 'plan':
        return 'ready';
    }
  }, [stage]);

  const progressFraction = React.useMemo(() => {
    if (stage.kind === 'loading_questions') return 0.05;
    if (stage.kind === 'script') {
      const total = stage.steps.length;
      const idx = stage.stepIndex;
      return 0.1 + (idx / Math.max(1, total)) * 0.75;
    }
    if (stage.kind === 'discover') {
      // turn 1..5 → 0.10..0.80
      return 0.1 + ((stage.turn - 1) / DEEP_TOTAL_TURNS) * 0.7;
    }
    if (stage.kind === 'loading_discover') {
      return 0.1 + ((stage.turn - 1) / DEEP_TOTAL_TURNS) * 0.7 + 0.05;
    }
    if (stage.kind === 'loading_plan') return 0.95;
    if (stage.kind === 'plan') return 1.0;
    return 0;
  }, [stage]);

  // Step indicator text shown next to the phase label, e.g. "1 of 5".
  const stepLabel: string | null = React.useMemo(() => {
    if (stage.kind === 'discover') return `${stage.turn} of ${DEEP_TOTAL_TURNS}`;
    if (stage.kind === 'loading_discover' && stage.turn <= DEEP_TOTAL_TURNS)
      return `${stage.turn} of ${DEEP_TOTAL_TURNS}`;
    if (stage.kind === 'script') return `${stage.stepIndex + 1} of ${stage.steps.length}`;
    return null;
  }, [stage]);

  // ---- Stage transitions ----------------------------------------------------

  function pickMode(mode: CoachMode) {
    setStage({ kind: 'dream_entry', mode });
  }

  async function startFromDream(rawDream: string) {
    if (stage.kind !== 'dream_entry') return;
    const dream = rawDream.trim();
    if (!dream) return;
    const mode = stage.mode;
    if (mode === 'quick') {
      setStage({ kind: 'loading_questions', dream });
      try {
        const script = await askQuestions({ dream });
        if (!script.steps?.length) throw new Error('Coach returned no questions');
        setStage({ kind: 'script', stepIndex: 0, dream, steps: script.steps, answers: {} });
      } catch (e) {
        Alert.alert('Coach error', formatError(e));
        setStage({ kind: 'dream_entry', mode });
      }
    } else {
      setStage({ kind: 'loading_discover', dream, turn: 1, history: [] });
      try {
        const res = await askDiscover({
          dream,
          history: [],
          turn: 1,
          totalQuestionTurns: DEEP_TOTAL_TURNS,
        });
        if (res.kind === 'plan') {
          enterPlanStage(res);
        } else {
          setStage({
            kind: 'discover',
            dream,
            turn: 1,
            history: [],
            currentQuestion: res.questions[0] ?? 'What does success look like for you?',
            currentPhase: res.phase ?? 'dream',
            currentSuggestions: res.suggestions ?? [],
            currentHint: res.inputHint ?? '',
          });
        }
      } catch (e) {
        Alert.alert('Coach error', formatError(e));
        setStage({ kind: 'dream_entry', mode });
      }
    }
  }

  async function answerDiscover(answer: string) {
    if (stage.kind !== 'discover') return;
    const trimmed = answer.trim();
    if (!trimmed) return;
    const nextHistory: DiscoverTurn[] = [
      ...stage.history,
      { question: stage.currentQuestion, answer: trimmed },
    ];
    const nextTurn = stage.turn + 1;
    setStage({
      kind: 'loading_discover',
      dream: stage.dream,
      turn: nextTurn,
      history: nextHistory,
    });
    try {
      const res = await askDiscover({
        dream: stage.dream,
        history: nextHistory,
        turn: nextTurn,
        totalQuestionTurns: DEEP_TOTAL_TURNS,
      });
      if (res.kind === 'plan') {
        enterPlanStage(res);
      } else {
        setStage({
          kind: 'discover',
          dream: stage.dream,
          turn: nextTurn,
          history: nextHistory,
          currentQuestion: res.questions[0] ?? 'Tell me more about that.',
          currentPhase: res.phase ?? 'current_state',
          currentSuggestions: res.suggestions ?? [],
          currentHint: res.inputHint ?? '',
        });
      }
    } catch (e) {
      Alert.alert('Coach error', formatError(e));
      // Bounce back to the question we were on
      setStage({
        kind: 'discover',
        dream: stage.dream,
        turn: stage.turn,
        history: stage.history,
        currentQuestion: stage.currentQuestion,
        currentPhase: stage.currentPhase,
        currentSuggestions: stage.currentSuggestions,
        currentHint: stage.currentHint,
      });
    }
  }

  async function answerScriptStep(answer: string) {
    if (stage.kind !== 'script') return;
    const step = stage.steps[stage.stepIndex];
    const nextAnswers = { ...stage.answers, [step.id]: answer };
    const next = stage.stepIndex + 1;
    if (next < stage.steps.length) {
      setStage({
        kind: 'script',
        stepIndex: next,
        dream: stage.dream,
        steps: stage.steps,
        answers: nextAnswers,
      });
    } else {
      setStage({ kind: 'loading_plan', dream: stage.dream, answers: nextAnswers });
      try {
        const plan = await askPlan({ dream: stage.dream, answers: nextAnswers });
        enterPlanStage(plan);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Coach error', msg);
        setStage({
          kind: 'script',
          stepIndex: stage.stepIndex,
          dream: stage.dream,
          steps: stage.steps,
          answers: stage.answers,
        });
      }
    }
  }

  function enterPlanStage(plan: CoachPlanResponse) {
    const sel: Record<string, boolean> = {};
    for (const g of plan.goals) sel[g.tempId] = true;
    for (const m of plan.milestones) sel[m.tempId] = true;
    for (const p of plan.projects) sel[p.tempId] = true;
    for (const t of plan.todos) sel[t.tempId] = true;
    for (const h of plan.habits ?? []) sel[h.tempId] = true;
    setSelections(sel);
    setStage({ kind: 'plan', plan });
  }

  async function handleConfirm() {
    if (stage.kind !== 'plan') return;
    setApplying(true);
    try {
      await applyPlan(stage.plan, selections);
      router.back();
    } catch (e) {
      const msg = formatError(e);
      console.error('applyPlan failed', e);
      Alert.alert('Could not create plan', msg);
    } finally {
      setApplying(false);
    }
  }

  // ---- Submit / mic handler -------------------------------------------------

  function submitText(text: string) {
    const t = text.trim();
    if (!t) return;
    setTextInput('');
    if (stage.kind === 'dream_entry') startFromDream(t);
    else if (stage.kind === 'script') answerScriptStep(t);
    else if (stage.kind === 'discover') answerDiscover(t);
    // mode_picker / loading / plan: ignored.
  }

  async function handleMicPress() {
    if (recorder.isRecording) {
      const audio = await recorder.stop();
      if (!audio) return;
      setTranscribing(true);
      try {
        const text = await transcribeAudio(audio.base64, audio.mimeType, audio.fileExt);
        if (text.trim()) submitText(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Transcription failed', msg);
      } finally {
        setTranscribing(false);
      }
    } else {
      await recorder.start();
    }
  }

  // ---- Lookups for plan preview --------------------------------------------

  const goalById = React.useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const milestoneById = React.useMemo(
    () => new Map(milestones.map((m) => [m.id, m])),
    [milestones]
  );
  const projectById = React.useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  function findInPlan<T extends { tempId: string; title: string }>(
    ref: string,
    pick: (p: CoachPlanResponse) => T[]
  ): T | undefined {
    if (stage.kind !== 'plan') return undefined;
    return pick(stage.plan).find((x) => x.tempId === ref);
  }
  function plannedGoalLabel(ref: string): string {
    return findInPlan(ref, (p) => p.goals)?.title ?? goalById.get(ref)?.title ?? 'Existing goal';
  }
  function plannedMilestoneLabel(ref?: string): string | null {
    if (!ref) return null;
    return (
      findInPlan(ref, (p) => p.milestones)?.title ??
      milestoneById.get(ref)?.title ??
      'Existing milestone'
    );
  }
  function plannedProjectLabel(ref: string): string | null {
    if (!ref) return null;
    const planned = findInPlan(ref, (p) => p.projects)?.title;
    if (planned) return planned;
    const existing = projectById.get(ref)?.title;
    if (existing) return existing;
    return null;
  }

  // ---- Render ---------------------------------------------------------------

  const isLoading =
    stage.kind === 'loading_questions' ||
    stage.kind === 'loading_discover' ||
    stage.kind === 'loading_plan';
  const showInput =
    stage.kind !== 'plan' && stage.kind !== 'mode_picker' && !isLoading;
  const placeholder =
    stage.kind === 'dream_entry'
      ? 'Tell me a dream — type or hold the mic'
      : stage.kind === 'discover'
        ? stage.currentSuggestions.length > 0
          ? stage.currentHint || 'Tap a chip or type your own'
          : stage.currentHint || 'Take your time — speak or type'
        : stage.kind === 'script'
          ? stage.steps[stage.stepIndex]?.inputHint || 'Or type / speak your own'
          : 'Or type / speak your own';

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'Coach',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} className="px-2">
              <Icon as={XIcon} size={20} className="text-foreground" />
            </Pressable>
          ),
        }}
      />
      {currentPhase ? (
        <ProgressBar phase={currentPhase} fraction={progressFraction} stepLabel={stepLabel} />
      ) : null}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerClassName="px-5 pt-4 pb-6 gap-4"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent:
            stage.kind === 'mode_picker' || stage.kind === 'dream_entry'
              ? 'center'
              : 'flex-start',
        }}
        keyboardShouldPersistTaps="handled">
        {stage.kind === 'mode_picker' ? (
          <ModePicker onPick={pickMode} />
        ) : stage.kind === 'dream_entry' ? (
          <DreamEntry mode={stage.mode} onPick={startFromDream} />
        ) : stage.kind === 'loading_questions' || stage.kind === 'loading_discover' ? (
          <View className="pt-6">
            <CoachThinking />
          </View>
        ) : stage.kind === 'script' ? (
          <WizardStep
            ack=""
            question={stage.steps[stage.stepIndex].question}
            suggestions={stage.steps[stage.stepIndex].suggestions}
            onPickSuggestion={answerScriptStep}
          />
        ) : stage.kind === 'discover' ? (
          <WizardStep
            ack=""
            question={stage.currentQuestion}
            suggestions={stage.currentSuggestions}
            onPickSuggestion={answerDiscover}
          />
        ) : stage.kind === 'loading_plan' ? (
          <View className="pt-6">
            <CoachThinking />
          </View>
        ) : (
          <PlanView
            plan={stage.plan}
            selections={selections}
            setSelections={setSelections}
            plannedGoalLabel={plannedGoalLabel}
            plannedMilestoneLabel={plannedMilestoneLabel}
            plannedProjectLabel={plannedProjectLabel}
            ackText={stage.plan.message}
          />
        )}
      </ScrollView>

      <View
        className="border-t border-border bg-background px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}>
        {stage.kind === 'plan' ? (
          <View className="mb-3">
            <AnimatedBorder thickness={2}>
              <HoldToConfirmButton
                label={applying ? 'Creating…' : 'Hold to create plan'}
                icon={CheckIcon}
                onConfirm={handleConfirm}
              />
            </AnimatedBorder>
          </View>
        ) : null}
        {showInput ? (
          <View className="flex-row items-end gap-2">
            <TextInput
              value={textInput}
              onChangeText={setTextInput}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              multiline
              onSubmitEditing={() => submitText(textInput)}
              blurOnSubmit
              returnKeyType="send"
              className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground"
              style={{ maxHeight: 120 }}
            />
            {textInput.trim().length > 0 && !recorder.isRecording ? (
              <Pressable
                onPress={() => submitText(textInput)}
                className="size-12 items-center justify-center rounded-full bg-primary active:opacity-80">
                <Icon as={ArrowUpIcon} size={22} className="text-white" />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleMicPress}
                disabled={transcribing}
                className={cn(
                  'size-12 items-center justify-center rounded-full',
                  recorder.isRecording ? 'bg-red-500' : 'bg-primary',
                  transcribing && 'opacity-50'
                )}>
                {transcribing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Icon
                    as={recorder.isRecording ? StopCircleIcon : MicIcon}
                    size={22}
                    className="text-white"
                  />
                )}
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================================
// Welcome
// ============================================================================

function ModePicker({ onPick }: { onPick: (m: CoachMode) => void }) {
  return (
    <View className="gap-4">
      <View className="items-center gap-3">
        <View className="size-14 items-center justify-center rounded-full bg-violet-500/15">
          <Icon as={SparklesIcon} size={28} className="text-violet-500" />
        </View>
        <Text variant="h3" className="text-center">
          How deep should we go?
        </Text>
      </View>
      <View className="gap-3">
        <Pressable
          onPress={() => onPick('quick')}
          className="rounded-2xl border border-border bg-card p-4 active:opacity-70">
          <Text className="text-base font-semibold">⚡ Quick plan</Text>
          <Text variant="muted" className="mt-1 text-sm">
            ~3 questions, fast. Best when you already know what you want.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onPick('deep')}
          className="rounded-2xl border border-border bg-card p-4 active:opacity-70">
          <Text className="text-base font-semibold">🌊 Deep coaching</Text>
          <Text variant="muted" className="mt-1 text-sm">
            5 thoughtful questions, no shortcuts. Best for big or fuzzy goals — this is where the real
            clarity happens.
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function DreamEntry({
  mode,
  onPick,
}: {
  mode: CoachMode;
  onPick: (text: string) => void;
}) {
  return (
    <View className="items-center gap-3">
      <View className="size-14 items-center justify-center rounded-full bg-violet-500/15">
        <Icon as={SparklesIcon} size={28} className="text-violet-500" />
      </View>
      <Text variant="h3" className="text-center">
        Tell me a dream
      </Text>
      <Text variant="muted" className="text-center text-sm">
        {mode === 'deep'
          ? "I'll ask 5 thoughtful questions, then we'll build your plan together."
          : "I'll ask a few quick questions, then we'll build your plan together."}
      </Text>
      <View className="mt-3 w-full gap-2">
        {WELCOME_SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            onPress={() => onPick(s)}
            className="rounded-xl border border-border bg-card px-4 py-3 active:opacity-70">
            <Text className="text-sm">{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// WizardStep — one question per screen with chips
// ============================================================================

function WizardStep({
  ack,
  question,
  suggestions,
  onPickSuggestion,
}: {
  ack: string;
  question: string;
  suggestions: string[];
  onPickSuggestion: (text: string) => void;
}) {
  return (
    <View className="gap-5 pt-2">
      {ack ? (
        <Text variant="muted" className="text-center text-sm">
          {ack}
        </Text>
      ) : null}
      <Text variant="h2" className="border-b-0 pb-0 text-center">
        {question}
      </Text>
      {suggestions.length > 0 ? (
        <View className="mt-2 gap-2">
          {suggestions.map((s) => (
            <Pressable
              key={s}
              onPress={() => onPickSuggestion(s)}
              className="rounded-2xl border border-border bg-card px-4 py-3.5 active:opacity-70">
              <Text className="text-sm">{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ============================================================================
// PlanView (plan preview + ack)
// ============================================================================

function PlanView({
  plan,
  selections,
  setSelections,
  plannedGoalLabel,
  plannedMilestoneLabel,
  plannedProjectLabel,
  ackText,
}: {
  plan: CoachPlanResponse;
  selections: Record<string, boolean>;
  setSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  plannedGoalLabel: (ref: string) => string;
  plannedMilestoneLabel: (ref?: string) => string | null;
  plannedProjectLabel: (ref: string) => string | null;
  ackText?: string;
}) {
  return (
    <View className="gap-3">
      {ackText ? (
        <Text variant="muted" className="text-center text-sm">
          {ackText}
        </Text>
      ) : null}
      <PlanPreview
        plan={plan}
        selections={selections}
        setSelections={setSelections}
        plannedGoalLabel={plannedGoalLabel}
        plannedMilestoneLabel={plannedMilestoneLabel}
        plannedProjectLabel={plannedProjectLabel}
      />
    </View>
  );
}

// ============================================================================
// PlanPreview, Section, Row
// ============================================================================

function PlanPreview({
  plan,
  selections,
  setSelections,
  plannedGoalLabel,
  plannedProjectLabel,
}: {
  plan: CoachPlanResponse;
  selections: Record<string, boolean>;
  setSelections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  plannedGoalLabel: (ref: string) => string;
  plannedMilestoneLabel: (ref?: string) => string | null;
  plannedProjectLabel: (ref: string) => string | null;
}) {
  function toggle(tempId: string) {
    setSelections((s) => ({ ...s, [tempId]: s[tempId] === false }));
  }
  function included(tempId: string) {
    return selections[tempId] !== false;
  }

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      {plan.goals.length > 0 ? (
        <Section label="Goals">
          {plan.goals.map((g) => (
            <Row
              key={g.tempId}
              typeIcon={TargetIcon}
              typeColor="text-red-500"
              typeBg="bg-red-500/15"
              title={g.title}
              subtitleText={g.targetDate ? `By ${g.targetDate}` : undefined}
              included={included(g.tempId)}
              onToggle={() => toggle(g.tempId)}
            />
          ))}
        </Section>
      ) : null}

      {plan.milestones.length > 0 ? (
        <Section label="Milestones">
          {plan.milestones.map((m) => (
            <Row
              key={m.tempId}
              typeIcon={DiamondIcon}
              typeColor="text-orange-500"
              typeBg="bg-orange-500/15"
              title={m.title}
              parents={[
                {
                  icon: TargetIcon,
                  color: 'text-red-500',
                  text: plannedGoalLabel(m.goalRef),
                },
              ]}
              included={included(m.tempId)}
              onToggle={() => toggle(m.tempId)}
            />
          ))}
        </Section>
      ) : null}

      {plan.projects.length > 0 ? (
        <Section label="Projects">
          {plan.projects.map((p) => (
            <Row
              key={p.tempId}
              typeIcon={LayersIcon}
              typeColor="text-cyan-500"
              typeBg="bg-cyan-500/15"
              title={p.title}
              parents={[
                {
                  icon: TargetIcon,
                  color: 'text-red-500',
                  text: plannedGoalLabel(p.goalRef),
                },
              ]}
              included={included(p.tempId)}
              onToggle={() => toggle(p.tempId)}
            />
          ))}
        </Section>
      ) : null}

      {plan.todos.length > 0 ? (
        <Section label="Today's tasks">
          {plan.todos.map((t) => {
            const projectLabel = plannedProjectLabel(t.projectRef);
            return (
              <Row
                key={t.tempId}
                typeIcon={CheckSquareIcon}
                typeColor="text-green-500"
                typeBg="bg-green-500/15"
                title={t.title}
                parents={
                  projectLabel
                    ? [{ icon: LayersIcon, color: 'text-cyan-500', text: projectLabel }]
                    : []
                }
                included={included(t.tempId)}
                onToggle={() => toggle(t.tempId)}
              />
            );
          })}
        </Section>
      ) : null}

      {plan.habits && plan.habits.length > 0 ? (
        <Section label="Habits">
          {plan.habits.map((h) => {
            const goalLabel = h.goalRef ? plannedGoalLabel(h.goalRef) : null;
            const parents: RowParent[] = [];
            if (goalLabel) {
              parents.push({ icon: TargetIcon, color: 'text-red-500', text: goalLabel });
            }
            return (
              <Row
                key={h.tempId}
                typeIcon={RepeatIcon}
                typeColor="text-violet-500"
                typeBg="bg-violet-500/15"
                title={h.title}
                subtitleText={describeHabit(h)}
                parents={parents}
                included={included(h.tempId)}
                onToggle={() => toggle(h.tempId)}
              />
            );
          })}
        </Section>
      ) : null}
    </View>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function describeHabit(h: {
  frequencyKind: 'daily' | 'weekly';
  timesPerPeriod: number;
  daysOfWeek: number[];
}): string {
  const days = h.daysOfWeek ?? [];
  const everyDay = days.length === 0 || days.length === 7;
  if (h.frequencyKind === 'daily') {
    return everyDay
      ? 'Every day'
      : days.slice().sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(', ');
  }
  if (everyDay) return `${h.timesPerPeriod}× per week`;
  return days.slice().sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(', ');
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="muted" className="text-xs uppercase tracking-wide">
        {label}
      </Text>
      <View className="gap-1.5">{children}</View>
    </View>
  );
}

type RowParent = { icon: LucideIcon; color: string; text: string };

function Row({
  typeIcon,
  typeColor,
  typeBg,
  title,
  subtitleText,
  parents,
  included,
  onToggle,
}: {
  typeIcon: LucideIcon;
  typeColor: string;
  typeBg: string;
  title: string;
  subtitleText?: string;
  parents?: RowParent[];
  included: boolean;
  onToggle: () => void;
}) {
  const subtitleParts: React.ReactNode[] = [];
  if (parents && parents.length > 0) {
    parents.forEach((p, i) => {
      subtitleParts.push(
        <View key={`p${i}`} className="flex-row items-center gap-1">
          <Icon as={p.icon} size={11} className={p.color} />
          <Text variant="muted" className="text-xs" numberOfLines={1}>
            {p.text}
          </Text>
        </View>
      );
    });
  }
  if (subtitleText) {
    subtitleParts.push(
      <Text key="sub" variant="muted" className="text-xs">
        {subtitleText}
      </Text>
    );
  }
  return (
    <View
      className={cn(
        'flex-row items-center gap-3 rounded-lg px-2 py-1.5',
        !included && 'opacity-50'
      )}>
      <View className={cn('size-7 items-center justify-center rounded-full', typeBg)}>
        <Icon as={typeIcon} size={14} className={typeColor} />
      </View>
      <View className="flex-1">
        <Text
          className={cn('text-sm', !included && 'line-through text-muted-foreground')}>
          {title}
        </Text>
        {subtitleParts.length > 0 ? (
          <View className="mt-0.5 flex-row flex-wrap items-center gap-x-2 gap-y-0.5">
            {subtitleParts}
          </View>
        ) : null}
      </View>
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        className="size-7 items-center justify-center rounded-full bg-muted active:opacity-60">
        <Icon
          as={included ? XIcon : PlusIcon}
          size={14}
          className="text-muted-foreground"
        />
      </Pressable>
    </View>
  );
}

// ============================================================================
// ProgressBar
// ============================================================================

const PHASE_LABEL: Record<CoachPhase, string> = {
  dream: 'Dream',
  current_state: 'Current state',
  constraints: 'Constraints',
  strategy: 'Strategy',
  drill_in: 'Plan details',
  ready: 'Plan ready',
};

function ProgressBar({
  phase,
  fraction,
  stepLabel,
}: {
  phase: CoachPhase;
  fraction: number;
  stepLabel?: string | null;
}) {
  const pct = Math.max(0, Math.min(1, fraction));
  return (
    <View className="border-b border-border bg-background px-5 py-2">
      <View className="flex-row items-center justify-between">
        <Text variant="muted" className="text-xs uppercase tracking-wide">
          {PHASE_LABEL[phase]}
        </Text>
        <Text variant="muted" className="text-xs">
          {stepLabel ? `Step ${stepLabel}` : `${Math.round(pct * 100)}%`}
        </Text>
      </View>
      <View className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <View
          className="h-full rounded-full bg-violet-500"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </View>
    </View>
  );
}
