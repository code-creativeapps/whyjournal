import * as React from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { ProjectRow } from '@/components/project-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import type { Goal } from '@/lib/goals/types';
import type { Project } from '@/lib/projects/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';
import { useTodosStore } from '@/lib/stores/todos';

export default function ProjectsScreen() {
  const projects = useProjectsStore((s) => s.items);
  const projectsHydrated = useProjectsStore((s) => s.hydrated);
  const goals = useGoalsStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);
  const todos = useTodosStore((s) => s.items);
  const insets = useSafeAreaInsets();

  const goalById = React.useMemo(() => {
    const map = new Map<string, Goal>();
    for (const g of goals) map.set(g.id, g);
    return map;
  }, [goals]);
  const milestoneById = React.useMemo(() => {
    const map = new Map<string, (typeof milestones)[number]>();
    for (const m of milestones) map.set(m.id, m);
    return map;
  }, [milestones]);
  const tasksByProject = React.useMemo(() => {
    const map = new Map<string, typeof todos>();
    for (const t of todos) {
      if (!t.projectId) continue;
      const list = map.get(t.projectId) ?? [];
      list.push(t);
      map.set(t.projectId, list);
    }
    return map;
  }, [todos]);

  // Order projects by their goal's order, then by the project's own position
  // within that goal — same effective ordering as the by-goal grouping had,
  // just flattened into one list.
  const goalOrder = React.useMemo(() => {
    const order = new Map<string, number>();
    const sorted = goals
      .slice()
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          b.createdAt.localeCompare(a.createdAt)
      );
    sorted.forEach((g, i) => order.set(g.id, i));
    return order;
  }, [goals]);

  const sorted = React.useMemo(() => {
    return projects.slice().sort((a, b) => {
      const goalDelta =
        (goalOrder.get(a.goalId) ?? Number.MAX_SAFE_INTEGER) -
        (goalOrder.get(b.goalId) ?? Number.MAX_SAFE_INTEGER);
      if (goalDelta !== 0) return goalDelta;
      return (
        (a.position ?? 0) - (b.position ?? 0) ||
        a.createdAt.localeCompare(b.createdAt)
      );
    });
  }, [projects, goalOrder]);

  return (
    <SwipeableScreen route="projects">
      <View className="flex-1">
        {projectsHydrated && projects.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <Text variant="h3" className="text-center">
              Projects
            </Text>
            <Text variant="muted" className="text-center">
              Break a goal down into the workstream that gets it done.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sorted}
            keyExtractor={(item: Project) => item.id}
            renderItem={({ item }) => {
              const goal = goalById.get(item.goalId);
              return (
                <ProjectRow
                  project={item}
                  goal={goal ? { id: goal.id, title: goal.title } : undefined}
                  milestone={
                    item.milestoneId ? milestoneById.get(item.milestoneId) : undefined
                  }
                  tasks={tasksByProject.get(item.id) ?? []}
                />
              );
            }}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        )}
        <Fab href="/project" />
      </View>
    </SwipeableScreen>
  );
}
