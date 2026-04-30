import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  CheckIcon,
  DiamondIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  TargetIcon,
} from 'lucide-react-native';
import * as React from 'react';
import { Dimensions, Pressable, ScrollView, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBorder } from '@/components/animated-border';
import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { SimpleItemRow } from '@/components/simple-item-row';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { celebrateGoal, celebrateTodoCheck, onCelebrateGoal } from '@/lib/celebrate';
import { useGoalsStore } from '@/lib/stores/goals';
import { useMilestonesStore } from '@/lib/stores/milestones';
import { useProjectsStore } from '@/lib/stores/projects';
import { useTodosStore } from '@/lib/stores/todos';
import { cn } from '@/lib/utils';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const project = useProjectsStore((state) =>
    id ? state.items.find((p) => p.id === id) : undefined
  );
  const updateProject = useProjectsStore((state) => state.updateItem);
  const goal = useGoalsStore((state) =>
    project ? state.items.find((g) => g.id === project.goalId) : undefined
  );
  const milestone = useMilestonesStore((state) =>
    project?.milestoneId ? state.items.find((m) => m.id === project.milestoneId) : undefined
  );
  const todos = useTodosStore((state) => state.items);
  const updateTodo = useTodosStore((state) => state.updateItem);
  const deleteTodo = useTodosStore((state) => state.deleteItem);
  const insets = useSafeAreaInsets();

  const tasks = React.useMemo(() => {
    if (!id) return [];
    return todos
      .filter((t) => t.projectId === id)
      .slice()
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [todos, id]);

  const [confettiTrigger, setConfettiTrigger] = React.useState(0);
  React.useEffect(
    () => onCelebrateGoal(() => setConfettiTrigger((t) => t + 1)),
    []
  );

  React.useEffect(() => {
    if (id && !project && router.canGoBack()) router.back();
  }, [id, project]);

  if (!project) return null;

  function handleMarkCompleted() {
    if (!project) return;
    updateProject(project.id, {
      done: true,
      completedAt: new Date().toISOString(),
    });
    celebrateGoal();
  }
  function handleMarkNotCompleted() {
    if (!project) return;
    updateProject(project.id, { done: false, completedAt: undefined });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Project',
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/project', params: { id: project.id } })
              }
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerClassName="gap-6 px-6 pb-4 pt-6">
          <View className="items-center gap-3">
            <View
              className={cn(
                'size-16 items-center justify-center rounded-full',
                project.done ? 'bg-green-600' : 'bg-cyan-500/15'
              )}>
              <Icon
                as={LayersIcon}
                size={32}
                className={project.done ? 'text-white' : 'text-cyan-500'}
              />
            </View>
            <Text
              variant="h2"
              className={cn(
                'border-b-0 pb-0 text-center',
                project.done && 'text-muted-foreground line-through'
              )}>
              {project.title}
            </Text>
            <View className="flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1">
              {goal ? (
                <Pressable
                  onPress={() =>
                    router.replace({ pathname: '/goal-detail', params: { id: goal.id } })
                  }
                  hitSlop={6}
                  className="flex-row items-center gap-1 active:opacity-60">
                  <Icon as={TargetIcon} size={12} className="text-red-500" />
                  <Text variant="muted" className="text-xs" numberOfLines={1}>
                    {goal.title}
                  </Text>
                </Pressable>
              ) : null}
              {milestone ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/milestone-detail',
                      params: { id: milestone.id },
                    })
                  }
                  hitSlop={6}
                  className="flex-row items-center gap-1 active:opacity-60">
                  <Icon as={DiamondIcon} size={12} className="text-orange-500" />
                  <Text variant="muted" className="text-xs" numberOfLines={1}>
                    {milestone.title}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {project.body ? (
            <Text className="text-center text-base leading-7 text-foreground">
              {project.body}
            </Text>
          ) : null}

          <View className="gap-2">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Tasks
            </Text>
            {tasks.length === 0 ? (
              <Text variant="muted" className="text-sm">
                No tasks yet — add the first action.
              </Text>
            ) : (
              <View className="overflow-hidden rounded-xl border border-border">
                {tasks.map((t, idx) => (
                  <React.Fragment key={t.id}>
                    {idx > 0 ? <View className="h-px bg-border" /> : null}
                    <SimpleItemRow
                      kind="checkbox"
                      title={t.title}
                      done={t.done}
                      onToggle={() => {
                        if (!t.done) celebrateTodoCheck();
                        updateTodo(t.id, {
                          done: !t.done,
                          completedAt: !t.done ? new Date().toISOString() : undefined,
                        });
                      }}
                      onPress={() =>
                        router.push({
                          pathname: '/simple-item',
                          params: { kind: 'todo', id: t.id },
                        })
                      }
                    />
                  </React.Fragment>
                ))}
              </View>
            )}
            <Button
              variant="outline"
              onPress={() =>
                router.push({
                  pathname: '/simple-item',
                  params: { kind: 'todo', projectId: project.id },
                })
              }>
              <Icon as={PlusIcon} className="text-foreground" />
              <Text>Add task</Text>
            </Button>
          </View>
        </ScrollView>

        <View
          className="border-t border-border bg-background px-6 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {project.done ? (
            <View style={{ padding: 2 }}>
              <HoldToConfirmButton
                label="Hold to mark as not completed"
                icon={RotateCcwIcon}
                onConfirm={handleMarkNotCompleted}
                silent
              />
            </View>
          ) : (
            <AnimatedBorder>
              <HoldToConfirmButton
                label="Hold to mark as completed"
                icon={CheckIcon}
                onConfirm={handleMarkCompleted}
              />
            </AnimatedBorder>
          )}
        </View>
      </View>
      {confettiTrigger > 0 ? (
        <View pointerEvents="none" className="absolute inset-0">
          <ConfettiCannon
            key={confettiTrigger}
            count={120}
            origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
            autoStart
            fadeOut
            explosionSpeed={350}
            fallSpeed={2800}
          />
        </View>
      ) : null}
    </>
  );
}
