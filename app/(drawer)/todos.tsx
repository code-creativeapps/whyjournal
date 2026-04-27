import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import * as React from 'react';
import { SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab } from '@/components/fab';
import { SimpleItemRow } from '@/components/simple-item-row';
import { SwipeableRow } from '@/components/swipeable-row';
import { SwipeableScreen } from '@/components/swipeable-screen';
import { Text } from '@/components/ui/text';
import { celebrateTodoCheck } from '@/lib/celebrate';
import { useTodosStore } from '@/lib/stores/todos';
import type { Todo } from '@/lib/todos/types';

type Section = { title: string; data: Todo[] };

function buildSections(items: Todo[]): Section[] {
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const today: Todo[] = [];
  const later: Todo[] = [];

  for (const t of items) {
    if (t.dueAt && t.dueAt <= todayKey) today.push(t);
    else later.push(t);
  }

  // Today bucket: overdue first (oldest dueAt), then today's items, tiebreaker by createdAt desc.
  today.sort((a, b) => {
    const da = a.dueAt ?? '';
    const db = b.dueAt ?? '';
    if (da !== db) return da.localeCompare(db);
    return b.createdAt.localeCompare(a.createdAt);
  });

  // Later bucket: items with a future dueAt sorted asc (closer first), then undated items by createdAt desc.
  later.sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt && !b.dueAt) return -1;
    if (!a.dueAt && b.dueAt) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const sections: Section[] = [];
  if (today.length) sections.push({ title: 'Today', data: today });
  if (later.length) sections.push({ title: 'Later', data: later });
  return sections;
}

function dueSubtitle(todo: Todo, todayKey: string): string | undefined {
  if (!todo.dueAt) return undefined;
  if (todo.dueAt === todayKey) return 'Today';
  const d = parseISO(todo.dueAt);
  return todo.dueAt < todayKey
    ? `Overdue · ${format(d, 'MMM d')}`
    : format(d, 'EEE, MMM d');
}

export default function TodosScreen() {
  const items = useTodosStore((state) => state.items);
  const hydrated = useTodosStore((state) => state.hydrated);
  const updateItem = useTodosStore((state) => state.updateItem);
  const deleteItem = useTodosStore((state) => state.deleteItem);
  const insets = useSafeAreaInsets();

  const sections = React.useMemo(() => buildSections(items), [items]);
  const todayKey = React.useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  return (
    <SwipeableScreen route="todos">
      <View className="flex-1">
        {hydrated && items.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <Text variant="h3" className="text-center">
              Nothing to do
            </Text>
            <Text variant="muted" className="text-center">
              A lightweight master list of what&apos;s on your plate.
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SwipeableRow
                onEdit={() =>
                  router.push({
                    pathname: '/simple-item',
                    params: { kind: 'todo', id: item.id },
                  })
                }
                onDelete={() => deleteItem(item.id)}
                deleteConfirmTitle="Delete todo"
              >
                <SimpleItemRow
                  kind="checkbox"
                  title={item.title}
                  body={item.body}
                  subtitle={dueSubtitle(item, todayKey)}
                  done={item.done}
                  onToggle={() => {
                    if (!item.done) celebrateTodoCheck();
                    updateItem(item.id, {
                      done: !item.done,
                      completedAt: !item.done ? new Date().toISOString() : undefined,
                    });
                  }}
                  onPress={() =>
                    router.push({ pathname: '/simple-item', params: { kind: 'todo', id: item.id } })
                  }
                />
              </SwipeableRow>
            )}
            renderSectionHeader={({ section }) => (
              <View className="bg-background px-4 pb-1 pt-3">
                <Text variant="small" className="text-muted-foreground">
                  {section.title}
                </Text>
              </View>
            )}
            stickySectionHeadersEnabled={false}
            ItemSeparatorComponent={() => <View className="h-px bg-border" />}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          />
        )}
        <Fab href={{ pathname: '/simple-item', params: { kind: 'todo' } }} />
      </View>
    </SwipeableScreen>
  );
}
