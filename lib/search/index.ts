import type { Affirmation } from '@/lib/affirmations/types';
import type { BucketItem } from '@/lib/bucket/types';
import type { Entry } from '@/lib/entries/types';
import type { Goal } from '@/lib/goals/types';
import type { Habit } from '@/lib/habits/types';
import type { Milestone } from '@/lib/milestones/types';
import type { Todo } from '@/lib/todos/types';
import type { Trophy } from '@/lib/trophies/types';

export type SearchKind =
  | 'entry'
  | 'affirmation'
  | 'bucket'
  | 'goal'
  | 'milestone'
  | 'habit'
  | 'todo'
  | 'trophy';

export type SearchHit = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  pathname: string;
  params: Record<string, string>;
};

const KIND_PRIORITY: Record<SearchKind, number> = {
  entry: 0,
  todo: 1,
  goal: 2,
  milestone: 3,
  habit: 4,
  affirmation: 5,
  bucket: 6,
  trophy: 7,
};

const PER_KIND_LIMIT = 50;

function matches(query: string, ...fields: (string | undefined)[]): boolean {
  for (const f of fields) {
    if (f && f.toLowerCase().includes(query)) return true;
  }
  return false;
}

function excerpt(body: string | undefined, limit = 80): string | undefined {
  if (!body) return undefined;
  const flat = body.replace(/\s+/g, ' ').trim();
  if (!flat) return undefined;
  return flat.length > limit ? flat.slice(0, limit - 1) + '…' : flat;
}

export function searchAll(
  rawQuery: string,
  stores: {
    entries: Entry[];
    affirmations: Affirmation[];
    bucketItems: BucketItem[];
    goals: Goal[];
    milestones: Milestone[];
    habits: Habit[];
    todos: Todo[];
    trophies: Trophy[];
  }
): SearchHit[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];

  const goalsById = new Map<string, Goal>();
  for (const g of stores.goals) goalsById.set(g.id, g);

  const hits: SearchHit[] = [];

  for (const e of stores.entries) {
    if (hits.length >= PER_KIND_LIMIT * 8) break;
    if (matches(q, e.title, e.body)) {
      hits.push({
        kind: 'entry',
        id: e.id,
        title: e.title,
        subtitle: excerpt(e.body),
        pathname: '/entry-detail',
        params: { id: e.id },
      });
    }
  }
  for (const t of stores.todos) {
    if (matches(q, t.title, t.body)) {
      hits.push({
        kind: 'todo',
        id: t.id,
        title: t.title,
        subtitle: excerpt(t.body),
        pathname: '/simple-item',
        params: { kind: 'todo', id: t.id },
      });
    }
  }
  for (const g of stores.goals) {
    if (matches(q, g.title, g.body, g.why, g.reward)) {
      hits.push({
        kind: 'goal',
        id: g.id,
        title: g.title,
        subtitle: excerpt(g.body ?? g.why),
        pathname: '/goal-detail',
        params: { id: g.id },
      });
    }
  }
  for (const m of stores.milestones) {
    if (matches(q, m.title, m.body)) {
      hits.push({
        kind: 'milestone',
        id: m.id,
        title: m.title,
        subtitle: goalsById.get(m.goalId)?.title ?? excerpt(m.body),
        pathname: '/milestone-detail',
        params: { id: m.id },
      });
    }
  }
  for (const h of stores.habits) {
    if (matches(q, h.title, h.body)) {
      hits.push({
        kind: 'habit',
        id: h.id,
        title: h.title,
        subtitle: excerpt(h.body),
        pathname: '/habit-detail',
        params: { id: h.id },
      });
    }
  }
  for (const a of stores.affirmations) {
    if (matches(q, a.title, a.body)) {
      hits.push({
        kind: 'affirmation',
        id: a.id,
        title: a.title,
        subtitle: excerpt(a.body),
        pathname: '/reminder-detail',
        params: { id: a.id },
      });
    }
  }
  for (const b of stores.bucketItems) {
    if (matches(q, b.title, b.body)) {
      hits.push({
        kind: 'bucket',
        id: b.id,
        title: b.title,
        subtitle: excerpt(b.body),
        pathname: '/bucket-detail',
        params: { id: b.id },
      });
    }
  }
  for (const t of stores.trophies) {
    if (matches(q, t.title, t.body)) {
      hits.push({
        kind: 'trophy',
        id: t.id,
        title: t.title,
        subtitle: excerpt(t.body),
        pathname: '/trophy-detail',
        params: { id: t.id },
      });
    }
  }

  hits.sort((a, b) => {
    const k = KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind];
    if (k !== 0) return k;
    return a.title.localeCompare(b.title);
  });

  return hits;
}
