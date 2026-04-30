import { router } from 'expo-router';
import { ChevronRightIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { ProjectRow } from '@/components/project-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { GoalIconCircle } from '@/lib/goals/icon';
import type { Goal } from '@/lib/goals/types';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';
import { useTodosStore } from '@/lib/stores/todos';
import type { Project } from '@/lib/projects/types';

type Section = {
  goal: Goal;
  data: Project[];
};

export default function ProjectsScreen() {
  const projects = useProjectsStore((s) => s.items);
  const projectsHydrated = useProjectsStore((s) => s.hydrated);
  const goals = useGoalsStore((s) => s.items);
  const milestones = useMilestonesStore((s) => s.items);
  const todos = useTodosStore((s) => s.items);
  const insets = useSafeAreaInsets();

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

  const sections: Section[] = React.useMemo(() => {
    // Walk goals in their list order (positions); within each goal, project
    // position then createdAt. Goals with no projects are skipped.
    const byGoal = new Map<string, Project[]>();
    for (const p of projects) {
      const list = byGoal.get(p.goalId) ?? [];
      list.push(p);
      byGoal.set(p.goalId, list);
    }
    for (const list of byGoal.values()) {
      list.sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          a.createdAt.localeCompare(b.createdAt)
      );
    }
    const sortedGoals = goals
      .slice()
      .sort(
        (a, b) =>
          (a.position ?? 0) - (b.position ?? 0) ||
          b.createdAt.localeCompare(a.createdAt)
      );
    return sortedGoals
      .filter((g) => (byGoal.get(g.id)?.length ?? 0) > 0)
      .map((g) => ({ goal: g, data: byGoal.get(g.id) ?? [] }));
  }, [projects, goals]);

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
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ProjectRow
                project={item}
                milestone={
                  item.milestoneId ? milestoneById.get(item.milestoneId) : undefined
                }
                tasks={tasksByProject.get(item.id) ?? []}
              />
            )}
            renderSectionHeader={({ section }) => (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/goal-detail',
                    params: { id: section.goal.id },
                  })
                }
                className="flex-row items-center gap-2 bg-background px-4 pb-1 pt-3 active:bg-accent">
                <GoalIconCircle
                  icon={section.goal.icon}
                  done={section.goal.done}
                  size="sm"
                />
                <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
                  {section.goal.title}
                </Text>
                <Icon
                  as={ChevronRightIcon}
                  size={14}
                  className="text-muted-foreground"
                />
              </Pressable>
            )}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        )}
        <Fab href="/project" />
      </View>
    </SwipeableScreen>
  );
}
