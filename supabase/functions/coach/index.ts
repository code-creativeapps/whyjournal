// Supabase Edge Function: coach
// Two modes:
//   POST /coach            { messages, context }            -> CoachResponse
//   POST /coach/transcribe { audioBase64, mimeType, fileExt } -> { text }
// Auth: requires a Supabase user JWT in Authorization header (verified by gateway).

// deno-lint-ignore-file no-explicit-any

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const MODEL = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
const PLAN_MODEL = Deno.env.get('OPENAI_PLAN_MODEL') ?? 'gpt-4o';
const TRANSCRIBE_MODEL = Deno.env.get('OPENAI_TRANSCRIBE_MODEL') ?? 'whisper-1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

const PLAN_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: { type: 'string', enum: ['questions', 'plan'] },
    message: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
    goals: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tempId: { type: 'string' },
          title: { type: 'string' },
          why: { type: 'string' },
          targetDate: { type: 'string' },
          isCornerstone: { type: 'boolean' },
        },
        required: ['tempId', 'title', 'why', 'targetDate', 'isCornerstone'],
      },
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tempId: { type: 'string' },
          goalRef: { type: 'string' },
          title: { type: 'string' },
          targetDate: { type: 'string' },
          reward: { type: 'string' },
        },
        required: ['tempId', 'goalRef', 'title', 'targetDate', 'reward'],
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tempId: { type: 'string' },
          goalRef: { type: 'string' },
          milestoneRef: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['tempId', 'goalRef', 'milestoneRef', 'title', 'body'],
      },
    },
    todos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tempId: { type: 'string' },
          projectRef: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['tempId', 'projectRef', 'title'],
      },
    },
    habits: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          tempId: { type: 'string' },
          goalRef: { type: 'string' },
          title: { type: 'string' },
          frequencyKind: { type: 'string', enum: ['daily', 'weekly'] },
          timesPerPeriod: { type: 'integer' },
          daysOfWeek: { type: 'array', items: { type: 'integer' } },
        },
        required: ['tempId', 'goalRef', 'title', 'frequencyKind', 'timesPerPeriod', 'daysOfWeek'],
      },
    },
    suggestions: { type: 'array', items: { type: 'string' } },
    phase: {
      type: 'string',
      enum: ['dream', 'current_state', 'constraints', 'strategy', 'drill_in', 'ready'],
    },
  },
  required: [
    'kind',
    'message',
    'questions',
    'suggestions',
    'phase',
    'goals',
    'milestones',
    'projects',
    'todos',
    'habits',
  ],
} as const;

const QUESTIONS_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          phase: {
            type: 'string',
            enum: ['dream', 'current_state', 'constraints', 'strategy', 'drill_in'],
          },
          question: { type: 'string' },
          suggestions: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'phase', 'question', 'suggestions'],
      },
    },
  },
  required: ['message', 'steps'],
} as const;

const SYSTEM_PROMPT = `You are the user's personal "Scaling Tiny Steps" coach. You operate in one of three modes per request, told to you in the user message:

- MODE = QUESTIONS (Quick plan): given a fresh dream, generate a tailored discovery checklist (3–5 questions) that will let you build a precise plan after the user answers. The user walks through these locally; you will NOT be called again until they're done.
- MODE = DISCOVER (Deep coaching, turn-by-turn): the user is doing a deeper guided dialog. Exactly 5 question turns followed by a 6th plan turn. Each call gives you the dream, the answers so far, and the turn number. On turns 1–5 you return ONE next question (no chips). On turn 6 you return the final plan.
- MODE = PLAN: given the dream + a structured answers map + existing items, produce the final structured plan.

Each mode has a different output schema. Follow the schema for the mode you are in.

# Data model

- Goal = direction. OUTCOME goal: real end-state with a targetDate. IDENTITY goal: ongoing practice / who you want to be (no targetDate).
- Milestone = optional progress marker on a goal.
- Project = a STRATEGY with a clear deliverable / end-state. The TITLE must name the deliverable directly (e.g. "Record a 1-min cover of [song]", "Ship a landing page at example.com", "Pass the B1 oral exam"). Vague catch-alls ("immerse in X", "practice Y", "be consistent with Z", "learn Z", "explore X", "get better at Y") are NOT projects — they're habits or vibes.
- Habit = recurring practice. Mapping:
  - "Every day" / "Daily X min" → frequencyKind="daily", daysOfWeek=[], timesPerPeriod=1.
  - "On Mon/Wed/Fri" → frequencyKind="weekly", daysOfWeek=[1,3,5], timesPerPeriod=3.
  - "3 times any day per week" → frequencyKind="weekly", daysOfWeek=[], timesPerPeriod=3.
  daysOfWeek: 0=Sun..6=Sat.
- Task = one-shot action that closes a loop on a project. Verb-first, doable today, <60 min, AND must end in a concrete artifact or verifiable check ("what exists or is true when this is done?"). Examples that pass: "Print the C-major scale chart and tape it next to the guitar", "Record a 30-second clip of D→G transition", "Book a trial lesson on Preply". Examples that FAIL (banned): "Spend time on X", "Learn Y", "Practice Z", "Explore X", "Look into Y", "Get familiar with Z", "Read about X", "Think about Y" — these are not tasks. NEVER attach directly to a goal/milestone in new plans.

# What you receive

Each request includes:
- "dream": the user's one-line dream.
- "answers": a map of fixed-key discovery answers ("why", "when", "starting", "tried", "leverage", "hours", "time_of_day", "constraints").
- "context": existing items the user already has.
- For mode="plan": also "chosenStrategy" if a strategy was picked.

# QUESTIONS MODE

Input you receive: the user's dream + the existing-items context. The dream may be one sentence (e.g. "I want to read 5 books in 3 months") or vaguer.

Goal: generate the FULL discovery checklist for THIS specific dream — 3 to 5 questions, in the order they should be asked. Tailor every question to the dream:
- Reading goals get reading-flavored questions (genre interest, current reading habits, time-of-day, audiobook ok?, etc.).
- Fitness goals get fitness questions (current routine, injuries, gym access, preferred activity).
- Business / income goals get current skills, prior attempts, audience, hours/week, financial floor.
- Language goals get current level, reason, exposure (partner/work/travel), prior study.
- Identity goals (be a writer, stay healthy) get habit-shaping questions: when, how long, what blocks you today, what would success feel like.

ALWAYS include at least ONE WHY question grounded in the dream ("Why does Spanish matter to you right now?", "Why finish 5 books — what changes when you do?"). Why-questions clarify motivation and visibly raise commitment.

Each step in the output:
- "id": short snake_case stable key (e.g. "current_level", "why", "hours_per_week", "time_of_day"). Unique within the array.
- "phase": one of "dream" | "current_state" | "constraints" | "strategy" | "drill_in". Order the steps so phases appear in that order.
- "question": the question text, ending in "?". Warm, conversational, <120 chars.
- "suggestions": 3–5 likely-answer chips, each <40 chars. Calibrated to the question. NEVER yes/no, NEVER empty. For why-style questions use open-ended starters like "To prove I can to myself", "For my family", "To support my career", "Other — I'll say it".

"message": ONE warm sentence (the user sees this once at the start of the flow).

Output schema for QUESTIONS mode:
{
  "message": "string",
  "steps": [
    { "id": "string", "phase": "dream|current_state|constraints|strategy|drill_in", "question": "string?", "suggestions": ["...","..."] }
  ]
}

# DISCOVER MODE (Deep coaching, turn-by-turn)

Input you receive: dream + history (array of {question, answer} pairs) + the current turn number + the total number of question turns (always 5) + existing items context.

The flow is FIXED: 5 question turns, then 1 plan turn. You MUST output kind="plan" on the 6th call (when turn > totalQuestionTurns). You MUST output kind="questions" with exactly one question on turns 1–5.

Output for turns 1–5 (kind="questions"):
- "questions": ARRAY OF EXACTLY ONE element. The next question, ending in "?". <120 chars. NEVER more than one. NEVER empty.
- "suggestions": EMPTY ARRAY []. Deep mode never uses chips. The user is meant to write or speak a thoughtful answer.
- "message": ONE warm sentence acknowledging the previous answer (or, on turn 1, framing the conversation).
- "phase": advisory; pick one of "dream"/"current_state"/"constraints"/"strategy"/"drill_in" that best fits.
- All array fields (goals/milestones/projects/todos/habits): empty.

Pick the 5 most useful questions for THIS specific dream. Don't waste a turn — every question must materially shape the plan.

Coverage requirements across the 5 turns:
- Exactly ONE WHY question — surface the user's underlying motivation. Examples: "Why does this matter to you?", "What changes in your life when you achieve it?". Non-negotiable.
- Exactly ONE CONCRETENESS question — force the user to name a specific deliverable, artifact, song, deadline, milestone, or measurable outcome. Examples: "Name one specific song you want to be able to play in 30 days.", "What's the first chapter you'd ship?", "What level / score / weight would you call 'done'?". This is what lets the plan have concrete tasks instead of vague advice.
- Cover at least: motivation (WHY), a concrete deliverable (CONCRETENESS), current state, constraints, and a strategy/leverage question. Adapt the order to what the conversation reveals.
- Don't repeat questions you already have answers to (read the history).

On turn 6 (when you receive "Final plan"), output kind="plan" following PLAN MODE rules below, grounded in the dream + the 5 history answers.

# PLAN MODE

Input you receive: dream + the user's answers (a map keyed by step ids you defined in QUESTIONS mode) + existing-items context.

Goal: produce the final structured plan, grounded in the dream + answers.

Output kind="plan" with phase: "ready":
- ONE goal (or reuse from context). targetDate matches the user's "when"-like answer when possible. why = user's "why"-like answer (verbatim or lightly cleaned).
- 0–3 milestones (real progress markers, only if useful).
- 0–3 projects. For OUTCOME goals, ONE main project whose TITLE names a concrete deliverable (see Project rule above) + 3–5 today-sized tasks under it. For IDENTITY goals, 0 projects unless the user named a sub-deliverable. If you can't name the deliverable, do not create a project — use a habit instead.
- 0–3 habits. If the dream involves recurring practice (reading, training, writing, studying, exercising, language, meditation, journaling), include AT LEAST ONE habit with cadence aligned to the user's stated hours/time-of-day. (e.g. user said "Mornings, 5–10h, Day job" → "Practice 30 min on weekday mornings", not "Practice daily".)
- todos: today-sized only. If a starter task doesn't belong to any project, set projectRef="" (the app handles standalone tasks). Do NOT invent fake projectRefs.
- Test every project with: "Could I write 'Done' on this and have it stay done?" If no, it's a habit.
- Test every task with: "What artifact / observable check confirms this is done?" If you can't answer, rewrite or drop it. Banned task verbs as the leading word: "Spend", "Learn", "Practice", "Explore", "Look", "Get familiar", "Read about", "Think about", "Immerse", "Dive". Ground every task in something specific the user mentioned (a song they named, a tool they use, a person they mentioned).
- Test every habit with: "Is this a recurring schedule?" If no, it's a task.
- DO NOT PAD. Empty arrays are correct. Vague catch-all projects ("immerse in X", "practice Y", "learn Z", "be consistent with Z") are NOT allowed.
- "message": 1–2 warm sentences mentioning the chosen path or key habit. In the user's apparent language.
- For plan turns: set questions=[] and suggestions=[]. Schema requires every property; use "" or [] for unused fields.

Reusing existing items: if "context" lists a goal/milestone/project that already matches the user's intent, set goalRef/milestoneRef/projectRef to its real id (not a tempId). New items keep tempIds like g1, m1, p1, t1, h1.

Titles: <60 chars, action-oriented, no trailing punctuation. Never invent fields. Never output prose outside JSON.`;

async function transcribe(audioBase64: string, mimeType: string, fileExt: string): Promise<string> {
  const binary = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([binary], { type: mimeType });
  const form = new FormData();
  form.append('file', blob, `audio.${fileExt}`);
  form.append('model', TRANSCRIBE_MODEL);
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcription failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}

function renderProfile(payload: any): string {
  const lines: string[] = [];
  if (payload.dream) lines.push(`Dream: "${payload.dream}"`);
  const answers = payload.answers ?? {};
  for (const [k, v] of Object.entries(answers)) {
    if (v) lines.push(`${k}: "${v}"`);
  }
  return lines.join('\n');
}

function renderDiscoverHistory(history: any[]): string {
  if (!history?.length) return '(no answers yet — this is turn 1)';
  return history
    .map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`)
    .join('\n\n');
}

async function callModel(mode: 'questions' | 'discover' | 'plan', payload: any): Promise<any> {
  const context = payload.context ?? [];
  const contextSummary = context.length === 0 ? 'No existing items.' : JSON.stringify(context);

  let userMsg: string;
  if (mode === 'questions') {
    userMsg = `MODE: QUESTIONS\n\nDream: "${payload.dream ?? ''}"\n\n# Existing items\n${contextSummary}\n\nGenerate the discovery checklist (3–5 tailored questions) for this dream now.`;
  } else if (mode === 'discover') {
    const turn = payload.turn ?? 1;
    const total = payload.totalQuestionTurns ?? 5;
    const history = renderDiscoverHistory(payload.history ?? []);
    if (turn > total) {
      userMsg = `MODE: DISCOVER\nDream: "${payload.dream ?? ''}"\n\n# Answers so far\n${history}\n\n# Existing items\n${contextSummary}\n\nFinal plan. Output kind="plan" now, grounded in the ${total} answers above.`;
    } else {
      userMsg = `MODE: DISCOVER\nDream: "${payload.dream ?? ''}"\nTurn ${turn} of ${total}.\n\n# Answers so far\n${history}\n\n# Existing items\n${contextSummary}\n\nReturn the next single question (kind="questions", suggestions=[]).`;
    }
  } else {
    const profile = renderProfile(payload);
    userMsg = `MODE: PLAN\n\n# User profile\n${profile}\n\n# Existing items\n${contextSummary}\n\nProduce the final plan grounded in this profile.`;
  }

  const schema = mode === 'questions' ? QUESTIONS_RESPONSE_SCHEMA : PLAN_RESPONSE_SCHEMA;
  const schemaName =
    mode === 'questions' ? 'CoachQuestions' : mode === 'discover' ? 'CoachDiscover' : 'CoachPlan';

  // Plan synthesis is the highest-leverage call — use the stronger model.
  // For discover, use the stronger model only on the final plan turn.
  const isPlanCall =
    mode === 'plan' ||
    (mode === 'discover' && (payload.turn ?? 1) > (payload.totalQuestionTurns ?? 5));
  const modelToUse = isPlanCall ? PLAN_MODEL : MODEL;

  const body = {
    model: modelToUse,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema },
    },
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI ${mode} failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response');
  return JSON.parse(content);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();

    if (payload.mode === 'transcribe') {
      const text = await transcribe(payload.audioBase64, payload.mimeType, payload.fileExt);
      return new Response(JSON.stringify({ text }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (
      payload.mode === 'questions' ||
      payload.mode === 'discover' ||
      payload.mode === 'plan'
    ) {
      const result = await callModel(payload.mode, payload);
      return new Response(JSON.stringify(result), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown mode: ${payload.mode}` }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
