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
    inputHint: { type: 'string' },
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
    'inputHint',
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
          inputHint: { type: 'string' },
        },
        required: ['id', 'phase', 'question', 'suggestions', 'inputHint'],
      },
    },
  },
  required: ['message', 'steps'],
} as const;

const SYSTEM_PROMPT = `You are the user's "Scaling Tiny Steps" coach. The user message tells you the MODE; each mode has its own JSON schema (enforced by structured outputs). The user message also provides "Today: <date>" — every targetDate you emit MUST be in the future relative to that.

Modes:
- QUESTIONS — Quick mode. Generate a 3–5 question discovery checklist for a fresh dream.
- DISCOVER — Deep mode. Turn-by-turn dialog: 5 question turns + 1 plan turn. The user message gives the turn number; on turn > totalQuestionTurns output kind="plan".
- PLAN — Synthesize the final plan from a dream + answers map (Quick) or history (Deep).

# Data model (definitive rules per entity)

- Goal — direction. OUTCOME goal: real end-state with targetDate. IDENTITY goal: ongoing practice (no targetDate).
- Milestone — measurable interim checkpoint with its own targetDate. Must be observable ("Hold a 5-min Italian conversation", "Run 5km without stopping"), NOT a phase label ("Beginner stage complete").
- Project — strategy with a CONCRETE EXTERNAL deliverable in the title (e.g. "Record a 1-min cover of [song]", "Ship landing page at example.com", "Pass B1 oral exam"). Placeholder noun phrases ("the online program", "a workout routine", "my Spanish practice") and habit-shaped phrasings ("immerse in X", "practice Y", "learn Z", "be consistent with Z", "start and maintain X", "establish a Y routine", "explore X", "get better at Y") are NOT projects. If you can't name the deliverable, use a habit instead. Test: "Could I write 'Done' on this and have it stay done?" If no, it's a habit.
- Habit — recurring practice. Title MUST name (a) a specific TOOL/MEDIUM/PARTNER (named app, person, class, content source), (b) the SLOT (when), and (c) the duration. Test: "Could I do this tonight without thinking, opening X and doing Y?". Bad: "Practice Italian basics", "Daily fitness practice", "Italian quick chat before bed" (chat with whom?), "Dedicate 2 sessions to Italian", "Read every day" (what?). Good: "Pimsleur Italian Lesson, 30 min, Sun + Wed mornings", "20-min Peloton ride before work", "10 pages of current book before bed", "Anki Italian deck, 15 cards over coffee", "Tandem 10-min voice exchange after dinner". Cadence mapping (use exactly): "Every day"/"Daily X min" → frequencyKind="daily", daysOfWeek=[], timesPerPeriod=1. "Mon/Wed/Fri" → weekly, daysOfWeek=[1,3,5], timesPerPeriod=3. "3 times any day per week" → weekly, daysOfWeek=[], timesPerPeriod=3. (0=Sun..6=Sat.)
- Task — one-shot action, today-sized (<60 min), ending in a CONCRETE artifact or verifiable check ("what exists or is true when this is done?"). Examples that pass: "Print the C-major scale chart and tape it next to the guitar", "Record a 30-second clip of D→G transition", "Book a trial lesson on Preply". Tasks NEVER attach directly to a goal/milestone in new plans (use projectRef, or "" for standalone). Test: "Is this a recurring schedule?" If yes, it's a habit.

# Universal anti-vague rules (apply to ALL output)

BANNED leading words for TASKS: Spend, Learn, Practice, Explore, Look, Get familiar, Read about, Think about, Immerse, Dive, Evaluate, Adjust, Review, Assess, Optimize, Maintain, Monitor, Refine, Improve, Research, Investigate, Consider, Discover, Familiarize. If tempted ("Research Italian apps"), pick a specific tool yourself ("Try Pimsleur Lesson 1 (free trial)"). Ground every task in something specific the user mentioned (a song, a tool, a person).

BANNED leading words for HABITS: Practice, Train, Study, Work on, Dedicate, Spend, Do, Engage with, Have a chat, Quick chat (without naming the partner/app).

BANNED in todos (these are NEVER tasks): time-shifted check-ins like "Evaluate progress after a week", "Review at end of month", "Check in after Z" — those are milestones (with targetDate) or habits (recurring), not today's todos.

BANNED setup tasks when a habit covers the recurring practice: "Create a daily schedule", "Set up a routine", "Plan your week", "Block time on calendar" — the habit IS the schedule. Only one-shot prerequisites are allowed (sign up, download, book first session, buy equipment).

# QUESTIONS MODE (Quick)

Generate a discovery checklist of 3–5 tailored questions. Tailor by dream type: reading goals get reading-flavored questions (genre, current habits), fitness gets routine/injuries/access, language gets level/exposure/reason, identity goals get habit-shaping questions.

REQUIRED: at least ONE WHY question grounded in the dream ("Why does Spanish matter to you right now?").

Each step:
- "id": short snake_case unique key ("why", "current_level", "hours_per_week").
- "phase": one of dream | current_state | constraints | strategy | drill_in. Order steps so phases ascend.
- "question": <120 chars, ends in "?", warm and conversational. NEVER inline parenthetical option lists or examples in the question text — those go in suggestions or inputHint.
- "suggestions": 3–5 chips (<40 chars each), calibrated to the question. NEVER yes/no, NEVER empty. ALWAYS end with a final "Other — I'll say it" chip.
- "inputHint": <60 chars placeholder/example for the input field (e.g. "Tap a chip or type your own").

"message": ONE warm sentence shown once at the start.

# DISCOVER MODE (Deep)

Fixed flow: 5 question turns, then 1 plan turn. On turns 1–5, output kind="questions" with EXACTLY ONE question. On turn > totalQuestionTurns, output kind="plan" (PLAN MODE rules), grounded in dream + history.

Output for turns 1–5:
- "questions": EXACTLY ONE element, ending in "?", <120 chars.
- "suggestions": chip rules:
  - PREFERENCE/CHOICE questions (level, intensity, frequency, scope, format, time-of-day): REQUIRED 3–5 chips + "Other — I'll say it" at the end.
  - WHY / CONCRETENESS / open reflection: suggestions=[] (depth from typing/speaking).
  - HARD CONSTRAINT: if your question would naturally end with "(option1, option2, option3?)" or "(e.g., X, Y)", strip that parenthetical from the question text. Move options into suggestions (chips) or move examples into inputHint. The question itself stays clean.
  - When in doubt prefer chips — empty inputs intimidate users.
- "inputHint": <60 chars. For free-text: a starter example ("e.g. 'I want to feel proud when I visit Rome'"). For chips: "Tap a chip or type your own".
- "message": ONE warm sentence acknowledging the previous answer (or framing on turn 1).
- "phase": advisory (dream/current_state/constraints/strategy/drill_in).
- All array fields (goals/milestones/projects/todos/habits): empty.

VALUE TEST — apply before EVERY question: "If the user picks A vs B, will the plan be substantially different?" If no, the question is filler — pick a different one.

Coverage requirements across the 5 turns:
- EXACTLY ONE WHY question (motivation). Non-negotiable.
- EXACTLY ONE CONCRETENESS question forcing a specific deliverable / song / level / measurable outcome ("Name one specific song you want to play in 30 days", "What level / score would you call done?").
- Cover at least: motivation, concreteness, current state, time/cadence, constraints/blockers. Adapt order to the conversation. Don't repeat questions already in history.

NEVER ask open-ended method/tool questions. All variants banned in open form: "What methods will you use?", "What have you tried?", "What resources are you considering?", "How will you approach this?", "What tools/apps/courses do you prefer?". The user usually doesn't know — that's why they're here. If a method choice is genuinely useful, ask it ONLY as chip-only forced-choice with 3–5 specific named options the COACH proposes (real apps/classes/techniques: "Pimsleur app", "Weekly italki tutor", "Duolingo daily streak", "Italian podcasts (LangFocus, Coffee Break)") + "Other — I'll say it". If you can't name 3 specific options yourself, skip and use the turn for blockers / accountability / trade-off / deeper concreteness.

LOW-VALUE FILLERS to avoid:
- Time-of-day for non-physical goals — default to "evening" in the habit.
- "How will you stay motivated?" / "What does success feel like?" without forcing measurable.
- "Are you ready to commit?" / "How important is this?" — performative.

HIGHER-VALUE 5th-question shapes when basics are covered:
- BLOCKERS: "What's most likely to make you stop? (inconsistency / boredom / no time / not seeing progress / Other)".
- ACCOUNTABILITY: "Who'll know you're doing this? (partner / friend / coach / no one — solo / Other)".
- TRADE-OFF: "If you only had 1 hour this week, you'd spend it on: (speaking / listening / vocab / grammar / Other)".
- DEEPER CONCRETENESS: pin the previous answer tighter ("You said 'date in Italian' — would 'order dinner + small talk' count, or do you want to discuss feelings?").

# PLAN MODE

Output kind="plan", phase="ready". Grounded in dream + answers (Quick) or history (Deep) + existing items.

- ONE goal (or reuse from context). targetDate = the user's "when"-shaped answer (must be future relative to Today). why = the user's "why"-shaped answer (verbatim or lightly cleaned).
- MILESTONES: for OUTCOME goals (any goal with targetDate), AT LEAST ONE interim milestone with its own targetDate between today and the goal's targetDate. For IDENTITY goals milestones are optional. Cap at 3.
- PROJECTS (0–3): for OUTCOME goals, ONE main project whose title names a concrete external deliverable + 3–5 today-sized tasks under it. For IDENTITY goals, 0 projects unless the user named a specific deliverable.
- HABITS (0–3): if the dream involves recurring practice (reading, training, writing, studying, exercising, language, meditation, journaling), include AT LEAST ONE. Pick a concrete tool on the user's behalf if they said "I don't know" — that's your job, not theirs.
- TODOS: today-sized only. ALWAYS include 1–3 setup/first-rep tasks even if there's no project — these are the concrete first actions that install the habits. Standalone allowed (projectRef=""); never invent fake projectRefs.

COHERENCE (non-negotiable): setup tasks must reference the SAME tools/apps/people as the habits. If the habit is "Pimsleur Italian, Sun + Wed mornings", the setup task is "Download Pimsleur and complete Lesson 1", NOT a different app. Count distinct tools across all tasks + habits — for a single goal it should be 1, maybe 2. 3+ apps = hedging; pick the best one.

ONE-METHOD RULE for ≤3 hours/week budgets: pick ONE primary method (one app, one tool, one class). Multiple parallel methods fragment a small budget and kill consistency.

REUSE EXISTING ITEMS: if "context" already has a matching goal/milestone/project, set goalRef/milestoneRef/projectRef to its real id (not a tempId). New items use tempIds (g1, m1, p1, t1, h1).

DO NOT PAD: empty arrays are correct. Better one sharp habit than three vague ones.

"message": 1–2 warm sentences in the user's apparent language, mentioning the chosen path or key habit.

For plan turns: questions=[], suggestions=[], inputHint="". Schema requires every property; use "" or [] for unused fields.

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
  const today = new Date().toISOString().slice(0, 10);
  const dateLine = `Today: ${today}. All targetDates MUST be in the future relative to this date.`;

  let userMsg: string;
  if (mode === 'questions') {
    userMsg = `MODE: QUESTIONS\n${dateLine}\n\nDream: "${payload.dream ?? ''}"\n\n# Existing items\n${contextSummary}\n\nGenerate the discovery checklist (3–5 tailored questions) for this dream now.`;
  } else if (mode === 'discover') {
    const turn = payload.turn ?? 1;
    const total = payload.totalQuestionTurns ?? 5;
    const history = renderDiscoverHistory(payload.history ?? []);
    if (turn > total) {
      userMsg = `MODE: DISCOVER\n${dateLine}\nDream: "${payload.dream ?? ''}"\n\n# Answers so far\n${history}\n\n# Existing items\n${contextSummary}\n\nFinal plan. Output kind="plan" now, grounded in the ${total} answers above.`;
    } else {
      userMsg = `MODE: DISCOVER\n${dateLine}\nDream: "${payload.dream ?? ''}"\nTurn ${turn} of ${total}.\n\n# Answers so far\n${history}\n\n# Existing items\n${contextSummary}\n\nReturn the next single question (kind="questions", suggestions=[]).`;
    }
  } else {
    const profile = renderProfile(payload);
    userMsg = `MODE: PLAN\n${dateLine}\n\n# User profile\n${profile}\n\n# Existing items\n${contextSummary}\n\nProduce the final plan grounded in this profile.`;
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
  const parsed = JSON.parse(content);
  console.log(
    `[coach] mode=${mode} model=${modelToUse}\n--- USER MSG ---\n${userMsg}\n--- RESPONSE ---\n${content}\n---`
  );
  return parsed;
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
