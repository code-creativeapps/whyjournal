import { supabase } from '@/lib/supabase/client';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';

import type {
  CoachAnswers,
  CoachContextItem,
  CoachPlanResponse,
  CoachQuestionsResponse,
  CoachResponse,
  DiscoverTurn,
  GeneratedScript,
} from './types';

const MAX_CONTEXT_ITEMS = 50;

function truncate(s: string, n = 80) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function buildContextSnapshot(): CoachContextItem[] {
  const items: CoachContextItem[] = [];
  for (const g of useGoalsStore.getState().items) {
    items.push({
      kind: 'goal',
      id: g.id,
      title: truncate(g.title),
      isCornerstone: !!g.isCornerstone,
    });
  }
  for (const m of useMilestonesStore.getState().items) {
    if (m.done) continue;
    items.push({
      kind: 'milestone',
      id: m.id,
      goalId: m.goalId,
      title: truncate(m.title),
      done: false,
    });
  }
  for (const p of useProjectsStore.getState().items) {
    if (p.done) continue;
    items.push({
      kind: 'project',
      id: p.id,
      goalId: p.goalId,
      milestoneId: p.milestoneId,
      title: truncate(p.title),
      done: false,
    });
  }
  return items.slice(0, MAX_CONTEXT_ITEMS);
}

export async function askQuestions(args: {
  dream: string;
}): Promise<GeneratedScript> {
  const context = buildContextSnapshot();
  const { data, error } = await supabase.functions.invoke('coach', {
    body: { mode: 'questions', dream: args.dream, context },
  });
  if (error) throw error;
  return data as GeneratedScript;
}

export async function askPlan(args: {
  dream: string;
  answers: CoachAnswers;
}): Promise<CoachPlanResponse> {
  const context = buildContextSnapshot();
  const { data, error } = await supabase.functions.invoke('coach', {
    body: {
      mode: 'plan',
      dream: args.dream,
      answers: args.answers,
      context,
    },
  });
  if (error) throw error;
  return data as CoachPlanResponse;
}

export async function askDiscover(args: {
  dream: string;
  history: DiscoverTurn[];
  turn: number;
  totalQuestionTurns: number;
}): Promise<CoachResponse> {
  const context = buildContextSnapshot();
  const { data, error } = await supabase.functions.invoke('coach', {
    body: {
      mode: 'discover',
      dream: args.dream,
      history: args.history,
      turn: args.turn,
      totalQuestionTurns: args.totalQuestionTurns,
      context,
    },
  });
  if (error) throw error;
  return data as CoachResponse;
}

// Re-export for convenience.
export type { CoachQuestionsResponse, CoachResponse };

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string,
  fileExt: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('coach', {
    body: { mode: 'transcribe', audioBase64, mimeType, fileExt },
  });
  if (error) throw error;
  return (data as { text: string }).text;
}
