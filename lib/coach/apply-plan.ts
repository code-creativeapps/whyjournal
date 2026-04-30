import { useGoalsStore } from '@/lib/stores/goals';
import { useHabitsStore } from '@/lib/stores/habits';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';
import { useTodosStore } from '@/lib/stores/todos';

import type { CoachPlanResponse } from './types';

export type ApplyPlanResult = {
  created: { goals: number; milestones: number; projects: number; todos: number; habits: number };
  skipped: number;
};

function clean<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out as T;
}

export async function applyPlan(
  plan: CoachPlanResponse,
  selections: Record<string, boolean>
): Promise<ApplyPlanResult> {
  const result: ApplyPlanResult = {
    created: { goals: 0, milestones: 0, projects: 0, todos: 0, habits: 0 },
    skipped: 0,
  };

  const goalIdMap = new Map<string, string>();
  const milestoneIdMap = new Map<string, string>();
  const projectIdMap = new Map<string, string>();

  const isSelected = (tempId: string) => selections[tempId] !== false;
  const resolveGoal = (ref: string) => goalIdMap.get(ref) ?? ref;
  const resolveMilestone = (ref?: string) =>
    ref ? (milestoneIdMap.get(ref) ?? ref) : undefined;
  const resolveProject = (ref: string) => projectIdMap.get(ref) ?? ref;

  // Only one cornerstone goal allowed per user (DB unique constraint). If one
  // already exists, suppress the flag on any planned goal that requested it.
  const cornerstoneTaken = useGoalsStore
    .getState()
    .items.some((g) => g.isCornerstone);
  for (const g of plan.goals) {
    if (!isSelected(g.tempId)) continue;
    const created = await useGoalsStore.getState().addItem(
      clean({
        title: g.title,
        why: g.why,
        targetDate: g.targetDate,
        isCornerstone: cornerstoneTaken ? false : g.isCornerstone,
        done: false,
      })
    );
    goalIdMap.set(g.tempId, created.id);
    result.created.goals++;
  }

  for (const m of plan.milestones) {
    if (!isSelected(m.tempId)) continue;
    const goalId = resolveGoal(m.goalRef);
    if (!goalId) {
      result.skipped++;
      continue;
    }
    const created = await useMilestonesStore.getState().addItem(
      clean({
        goalId,
        title: m.title,
        targetDate: m.targetDate,
        reward: m.reward,
        done: false,
      })
    );
    milestoneIdMap.set(m.tempId, created.id);
    result.created.milestones++;
  }

  for (const p of plan.projects) {
    if (!isSelected(p.tempId)) continue;
    const goalId = resolveGoal(p.goalRef);
    if (!goalId) {
      result.skipped++;
      continue;
    }
    const created = await useProjectsStore.getState().addItem(
      clean({
        goalId,
        milestoneId: resolveMilestone(p.milestoneRef),
        title: p.title,
        body: p.body,
        done: false,
      })
    );
    projectIdMap.set(p.tempId, created.id);
    result.created.projects++;
  }

  const existingProjectIds = new Set(useProjectsStore.getState().items.map((p) => p.id));
  for (const t of plan.todos) {
    if (!isSelected(t.tempId)) continue;
    let projectId: string | undefined;
    if (t.projectRef) {
      const fromPlan = projectIdMap.get(t.projectRef);
      if (fromPlan) projectId = fromPlan;
      else if (existingProjectIds.has(t.projectRef)) projectId = t.projectRef;
      // else: bogus ref — fall through to standalone task.
    }
    await useTodosStore.getState().addItem(
      clean({
        projectId,
        title: t.title,
        done: false,
      })
    );
    result.created.todos++;
  }

  for (const h of plan.habits ?? []) {
    if (!isSelected(h.tempId)) continue;
    const goalId = h.goalRef ? resolveGoal(h.goalRef) : undefined;
    await useHabitsStore.getState().addItem(
      clean({
        title: h.title,
        frequencyKind: h.frequencyKind,
        timesPerPeriod: h.timesPerPeriod || 1,
        daysOfWeek: h.daysOfWeek ?? [],
        goalId,
      })
    );
    result.created.habits++;
  }

  return result;
}
