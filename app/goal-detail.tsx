import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CalendarIcon, CheckIcon, PencilIcon } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { goalProgress } from '@/lib/goals/progress';
import { useGoalsStore } from '@/lib/stores/goals';
import { useTodosStore } from '@/lib/stores/todos';
import { cn } from '@/lib/utils';

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goal = useGoalsStore((state) =>
    id ? state.items.find((g) => g.id === id) : undefined
  );
  const allTodos = useTodosStore((state) => state.items);
  const updateTodo = useTodosStore((state) => state.updateItem);

  const linkedTodos = React.useMemo(
    () => (id ? allTodos.filter((t) => t.goalId === id) : []),
    [allTodos, id]
  );
  const progress = React.useMemo(
    () => (goal ? goalProgress(goal, linkedTodos) : null),
    [goal, linkedTodos]
  );

  if (!goal || !progress) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text variant="muted">Goal not found</Text>
      </View>
    );
  }

  const hasMilestones = linkedTodos.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Goal',
          headerRight: () => (
            <Pressable
              onPress={() => router.push({ pathname: '/goal', params: { id: goal.id } })}
              hitSlop={8}
              className="flex-row items-center gap-1 px-2">
              <Icon as={PencilIcon} size={16} className="text-primary" />
              <Text className="text-base font-semibold text-primary">Edit</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView contentContainerClassName="gap-5 px-4 pt-4 pb-10">
        <View className="gap-2">
          <Text variant="h2" className={cn(goal.done && 'text-muted-foreground line-through')}>
            {goal.title}
          </Text>
          {goal.targetDate ? (
            <View className="flex-row items-center gap-1.5 self-start rounded-full bg-muted px-3 py-1">
              <Icon as={CalendarIcon} size={13} className="text-muted-foreground" />
              <Text variant="small" className="text-sm text-muted-foreground">
                {goal.targetDate}
              </Text>
            </View>
          ) : null}
        </View>

        {goal.why ? (
          <View className="gap-1">
            <Text variant="muted" className="text-xs uppercase tracking-wide">
              Why it matters
            </Text>
            <Text className="text-base leading-6">{goal.why}</Text>
          </View>
        ) : null}

        {hasMilestones ? (
          <View className="gap-2">
            <View className="h-2 overflow-hidden rounded-full bg-muted">
              <View
                className="h-full rounded-full bg-red-500"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </View>
            <Text variant="muted" className="text-xs">
              {progress.done} / {progress.total} milestones
            </Text>
          </View>
        ) : null}

        <View className="gap-2">
          <Text variant="muted" className="text-xs uppercase tracking-wide">
            Milestones
          </Text>
          {hasMilestones ? (
            <View className="overflow-hidden rounded-xl border border-border">
              {linkedTodos.map((todo, idx) => (
                <View
                  key={todo.id}
                  className={cn('flex-row items-center gap-3 px-3 py-3', idx > 0 && 'border-t border-border')}>
                  <Pressable
                    onPress={() =>
                      updateTodo(todo.id, {
                        done: !todo.done,
                        completedAt: !todo.done ? new Date().toISOString() : undefined,
                      })
                    }
                    hitSlop={8}
                    className={cn(
                      'size-6 items-center justify-center rounded-md border-2',
                      todo.done ? 'border-red-500 bg-red-500' : 'border-muted-foreground/40'
                    )}>
                    {todo.done ? <Icon as={CheckIcon} size={14} className="text-white" /> : null}
                  </Pressable>
                  <Text
                    className={cn(
                      'flex-1 text-base',
                      todo.done && 'text-muted-foreground line-through'
                    )}>
                    {todo.title}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text variant="muted" className="text-sm">
              No milestones yet. Tap Edit to add some.
            </Text>
          )}
        </View>
      </ScrollView>
    </>
  );
}
