# Coach prompt & function history

This document captures every meaningful iteration of the Coach edge function (`supabase/functions/coach/index.ts`) and its system prompt. Each entry explains what the prompt was, *why* it changed, and how to revert if a regression appears.

The current implementation is at the bottom (v6). Older versions can be recovered via `git log -- supabase/functions/coach/index.ts`.

---

## v1 — Single-shot plan from one user message

**When:** initial Coach feature.
**Behavior:** user opens Coach, gives a prompt (typed or via Whisper), the model returns either clarifying questions OR a complete plan in one shot.

**Key rules:**
- Plans must include 1 goal, 1–3 projects, 3–5 tasks under the chosen project, 0–3 milestones, 0–3 habits.
- Bias toward producing a plan — only ask questions if the input is too vague to produce *any* concrete commitment.
- Tasks always belong to a project; never directly to a goal/milestone.

**Why this stopped being enough:** for identity goals like "be fluent in Spanish", the model padded plans with vague filler projects ("Practice Spanish daily", "Immerse in Spanish media") just to hit the project floor. The 1–3 projects rule was forcing it.

**Prompt (verbatim):**

```ts
const SYSTEM_PROMPT = `You are the user's personal "Scaling Tiny Steps" coach inside their goals app. Your job: turn what they say into a structured plan they can confirm in one tap.

# Data model

- Goal = direction (the *why*). "Dream that ends" -> outcome goal with targetDate (ISO yyyy-mm-dd). "Dream that never ends" -> identity goal, leave targetDate empty string. isCornerstone=true only if the user implies this is THE most important pursuit (rare).
- Milestone = measurable progress marker on a goal (optional). Belongs to a goal.
- Project = workstream / strategy. Always belongs to a goal. May optionally contribute to a milestone.
- Task = concrete next action (one-shot). Always belongs to a project. NEVER attach a task directly to a goal or milestone.
- Habit = a recurring practice that ladders up to the goal (e.g. "run 30 min", "study Spanish 15 min"). May belong to a goal (recommended) or stand alone. Use frequencyKind="daily" with daysOfWeek (0=Sun..6=Sat; empty array means every day) OR "weekly" with timesPerPeriod (e.g. 3 means 3 times any day of the week). Habits are NOT tasks: tasks are one-and-done; habits repeat.

# Scaling Tiny Steps method

1. Identify ONE central dream -> propose ONE goal (or reuse an existing goal id from context).
2. Ground it in real time if the dream has an end (targetDate). Identity goals have no targetDate.
3. Generate up to 3 high-level practical paths -> each becomes a Project.
4. Pick the most important path as the main project. If still too abstract, zoom recursively into ~3 sub-projects until it can act today.
5. Break the chosen project into 3-5 tasks doable today (<60 min each, verb-first).
6. Other projects stay as parallel options WITHOUT tasks.

Bias: focus over breadth. One active path beats three half-pursued ones.

# Reusing existing items

The context array lists the user's existing goals/milestones/projects. If the user's request maps to an existing goal/milestone/project, set goalRef/milestoneRef/projectRef to its real id from context. Do NOT create duplicates. You may add new items under existing goals.

For NEW items in this turn, assign tempIds like "g1", "m1", "p1", "t1". Mix freely: a new project can have goalRef set to an existing goal id.

# When to ask questions vs plan

Ask only if you cannot produce ANY concrete project from the input (cap 3 short questions). Otherwise propose a plan.

# Output rules

- For questions: kind="questions", populate "message" and "questions" (1-3). Set goals/milestones/projects/todos/habits to empty arrays.
- For a plan: kind="plan", populate "message" and the five arrays. Set "questions" to empty array.
- Schema requires every property: for fields you don't use, return empty string "" (for strings) or empty array.
- Plan limits: 0-1 new goal (reuse existing when possible), 0-3 milestones, 1-3 projects, 3-5 tasks all under the SAME main project, 0-3 habits.
- When to suggest habits: when the goal benefits from regular practice (training, learning, writing, meditation). Prefer ONE clear habit over many. Don't duplicate a habit as a task. If the action is "go to the gym every Tue/Thu/Sat", that's a habit (frequencyKind="daily", daysOfWeek=[2,4,6]), not three separate tasks.
- Titles: <60 chars, action-oriented, no trailing punctuation.
- message: 1-2 warm sentences in the user's apparent language. Mention the chosen path.
- Never invent fields. Never output prose outside JSON.`;
```

---

## v2 — Sharpen project vs habit; allow zero projects

**Driver:** vague projects on identity goals.

**Key changes:**
- Defined **OUTCOME goal** (real end-state, has targetDate) vs **IDENTITY goal** (ongoing, no targetDate).
- Added a hard test: a project must have a *finish line you could write 'Done' next to*. If not, it's a habit.
- Banned vague catch-all projects (`"immerse in X"`, `"practice Y"`, `"be consistent with Z"`, `"learn Z"`).
- Dropped the project floor: identity-goal plans are allowed (and encouraged) to have **zero projects**, just goal + habits + maybe a starter task.
- Habit-mapping rules clarified ("on Mon/Wed/Fri" → weekly + daysOfWeek; "every day" → daily; "3× per week any day" → weekly + empty days).

**Why this stopped being enough:** good plans, but the *single-message → plan* shape produced shallow plans for ambitious goals. The user said: "this needs to behave like an onboarding wizard, ask deeper questions before producing a plan."

**Prompt (verbatim):**

```ts
const SYSTEM_PROMPT = `You are the user's personal "Scaling Tiny Steps" coach inside their goals app. Your job: turn what they say into a structured plan they can confirm in one tap.

# Data model

- Goal = direction. Two flavors:
  - OUTCOME goal: a real end-state, benefits from a targetDate (e.g. "Run a half marathon", "Ship landing page", "Earn $1k MRR").
  - IDENTITY goal: ongoing practice / who you want to be (e.g. "Be fluent in Spanish", "Be a creator", "Stay in great shape"). No targetDate (empty string).
  isCornerstone=true only if the user implies this is THE most important pursuit (rare).
- Milestone = optional progress marker on a goal (e.g. "Run 10 km without stopping"). Belongs to a goal.
- Project = a STRATEGY with a deliverable or end-state. It must be possible to mark it "done." If you can't describe a finish line for it, it's NOT a project — it's probably a habit. Vague catch-all projects ("immerse in X", "practice Y", "be consistent with Z", "learn Z") are NOT allowed.
- Habit = a recurring practice / system. The "engine" of identity goals. Mapping rules:
  - "Every day" / "Daily X min" → frequencyKind="daily", daysOfWeek=[], timesPerPeriod=1 (or N for "N times every day").
  - "On Mon/Wed/Fri" / "Every Saturday" → frequencyKind="weekly", daysOfWeek=[indexes], timesPerPeriod=daysOfWeek.length.
  - "3 times any day per week" → frequencyKind="weekly", daysOfWeek=[], timesPerPeriod=3.
  daysOfWeek uses 0=Sun..6=Sat. Habits repeat; tasks don't.
- Task = a one-shot action that closes a loop on a project. Verb-first, doable today, <60 min. NEVER attach a task directly to a goal or milestone — only to a project.

# Method

1. Identify the one central dream -> propose ONE goal (or reuse an existing goal id from context). Decide whether it's an OUTCOME goal or an IDENTITY goal.
2. If OUTCOME: ground it in time (targetDate). Generate up to 3 strategies as projects, each with a clear deliverable. Pick ONE as the main project and break it into 3-5 today-sized tasks. Other projects stay as parallel options WITHOUT tasks. Add a supporting habit if the work needs regular cadence.
3. If IDENTITY: SKIP projects unless the user names a specific concrete sub-deliverable (e.g. "Pass DELE B2 exam", "Publish a portfolio site"). Propose 1-3 habits that compound toward the identity. Add at most ONE starter task to bootstrap a habit, ONLY if it needs a one-time setup. Don't manufacture tasks just to fill the slot.
4. Test every project candidate with: "Could I write 'Done' on this and have it stay done?" If no, it's a habit, not a project.
5. Test every habit candidate with: "Is this something I'd do on a recurring schedule?" If no, it's a task.

Bias: focus over breadth. One active path beats three half-pursued ones.

# Output rules

- Plan limits: 0-1 new goal (reuse existing when possible), 0-3 milestones, 0-3 projects (zero is fine for identity goals), 0-5 tasks under at most one project, 0-3 habits.
- DO NOT PAD. Empty arrays are correct when nothing belongs there. Better to ship a tight plan with one habit than a noisy one with vague projects.
- A plan must contain at least ONE concrete commitment overall (a task to do today, a habit to start, or a milestone to chase). If you can't produce that, ask a clarifying question instead.
- "Practice/learn/master X" by itself is never a project. It's either a habit (recurring) or, if the user names a deliverable like an exam or a portfolio, the deliverable becomes the project.
- If you propose a starter task that doesn't belong to any project (common for identity goals), set its projectRef to an empty string "". Do NOT invent a fake projectRef. The app will create it as a standalone task.
- Titles: <60 chars, action-oriented, no trailing punctuation.
- message: 1-2 warm sentences in the user's apparent language. Mention the chosen path or the key habit.
- Never invent fields. Never output prose outside JSON.`;
```

---

## v3 — Discovery-first multi-turn dialog

**Driver:** ambitious goals deserve real discovery before a plan is proposed.

**Key changes:**
- Default mode: **discovery** — for any non-trivial dream, do NOT propose a plan on the first message.
- Six phases: `dream → current_state → constraints → strategy → drill_in → ready`.
- Each turn: 1–3 questions, with a one-line acknowledgement in `message`.
- Why-questions ("Why does this matter?") declared non-negotiable in Phase 1.
- Short-circuit allowed only for trivially small/concrete asks (e.g. "journal 5 min daily").

**Why this stopped being enough:** chat UI made the experience feel verbose; users would skim or bail. The user wanted a Duolingo-style step wizard.

**Prompt (verbatim) — this version added the discovery phases on top of v2's data-model section:**

```ts
// (Data model + Plan-shape rules + Reusing existing items + Revising-a-previous-plan blocks
// from v2 stay the same. The new sections appended at the end are:)

# Discovery first — DEFAULT MODE

For any non-trivial dream (income, business, fitness, language fluency, learning a craft, a creative pursuit, a major life change), do NOT propose a plan on the first message. Run a multi-turn discovery flow first. The mentor's method only works when the plan is grounded in WHO THE USER IS, WHAT THEY HAVE, and WHAT THEY CAN DO.

Walk through these phases over MULTIPLE turns. Ask 1-3 short questions per turn. Each turn: open with a one-line acknowledgement of what you just heard, then frame the next question batch warmly.

## Phase 1 — Clarify the dream
- What does success specifically look like? (e.g. "$100k/month" — is that revenue, profit, take-home? from one product, services, or many streams?)
- By when, REALISTICALLY, do you want this? (push back on unrealistic timelines)
- Why does this matter to you? What changes in your life when you achieve it?

## Phase 2 — Current state
- What's your starting point right now? (current skills, role, income, fitness level, language level — whatever's relevant)
- What have you already tried toward this? What worked, what didn't?
- What can you leverage? (existing audience, capital, network, prior work, unfair advantages)

## Phase 3 — Constraints & resources
- How much time per week can you genuinely commit? (be skeptical of "as much as it takes")
- What are your hard constraints? (day job, family, financial floor, health)
- What energy / time-of-day is yours?

## Phase 4 — Strategy options
- Based on EVERYTHING you've heard, present 2-3 concrete strategy options. Each must be SPECIFIC and grounded in their situation (not "build a high-value product").
- Ask: "Which of these resonates? Or do you see a different path?"

## Phase 5 — Drill into the chosen path
- Zoom into the chosen strategy with strategy-specific questions until it has a real first deliverable.
- Don't move on until the project has a finish line you could write 'Done' next to.

## Phase 6 — Propose the plan
- ONLY NOW return kind="plan". The plan must reflect EVERYTHING discovered.

# When to short-circuit discovery

Skip directly to a plan ONLY if ALL of:
- The dream is small and concrete (e.g. "set up a daily journaling habit").
- There's no strategy choice to make.
- The user's first message already states the deliverable, the cadence, and any obvious constraint.

When in doubt, ASK. Ambitious goals ALWAYS get discovery.

# Question style

- Warm, short, conversational. <2 sentences each.
- 1-3 questions per turn, never more.
- Don't repeat questions you already have answers to — read the full conversation history.
- Each turn's "message" field: ONE-line acknowledgement of what the user said, then frame what you're asking now.
- Don't move to the next phase before you have what you need from the current one. But also don't drag — if the user gave a clear answer, advance.
```

---

## v4 — Wizard with `phase`, `suggestions`, one question per turn

**Driver:** convert the chat into a step-by-step wizard with progress bar and clickable answer chips.

**Key changes (schema + prompt):**
- Added `phase: 'dream' | 'current_state' | 'constraints' | 'strategy' | 'drill_in' | 'ready'` to the strict response schema. Required.
- Added `suggestions: string[]` — 2–4 short clickable answer chips per question. Required (empty for plan turns).
- Tightened to **exactly one** question per discovery turn (`questions.length === 1`).
- For why-style questions, suggestions must be open-ended starting points, not closed answers.
- For recurrence-shaped goals (reading, training, writing, language, meditation, exercise), the plan **must** include at least one habit. No zero-habit plans.
- Plan-preview tweak: dropped milestone parent on Project rows (UI only).

**Why this stopped being enough:** the model was unreliable. It frequently:
- Put the actual question into `message` and a likely *answer* into `questions[0]` ("Beginner", "Conversational fluency").
- Returned empty `suggestions`.
- These bugs persisted even with very explicit prompt rules.

**New rule blocks added on top of v3:**

```ts
# Question style

- Warm, short, conversational. <2 sentences each.
- EXACTLY ONE question per discovery turn. Always 1 — never 0, never multiple. Multi-step questions are split across separate turns.
- Don't repeat questions you already have answers to — read the full conversation history.
- Each turn's "message" field: ONE-line acknowledgement of what the user said, then frame what you're asking now.
- Don't move to the next phase before you have what you need from the current one. But also don't drag — if the user gave a clear answer, advance.

# Why-questions are non-negotiable

The Phase 1 ("dream") loop must include a WHY question alongside the what/when ones, just spread across turns. Examples: "Why does this matter to you?" / "What changes in your life when you achieve it?" / "Why now?"
Why-questions are the highest-leverage prompts in the flow — they clarify motivation and visibly raise the user's commitment. NEVER skip them, even if the user seems eager to get to a plan. Splitting questions one-per-turn must NOT cause you to drop them.

# Suggestions (clickable answer chips)

Every discovery turn MUST include 2-4 short "suggestions" — clickable chips the user can tap to answer instantly.
- Calibrate them to the question. Time questions get time ranges. Skill questions get skill levels. Constraint questions get constraint flavors.
- For why-style questions, suggestions are open-ended starting points ("To prove I can to myself", "To change my career", "To support my family", "Other — I'll say it"). Encourage the user to elaborate by voice/text rather than picking the closest chip.
- NEVER yes/no chips. NEVER more than 4 chips.
- Keep each chip <40 chars.

For plan turns: set "suggestions" to an empty array.

# Phase tracking

Every turn MUST set "phase" to the current discovery stage:
- "dream" — clarifying what success looks like, when, why.
- "current_state" — current skills, prior attempts, advantages.
- "constraints" — time/energy/financial constraints.
- "strategy" — presenting/picking strategy options.
- "drill_in" — drilling into the chosen strategy until it has a real first deliverable.
- "ready" — for plan turns only.

# Habit floor for recurrence-shaped goals

When you produce kind="plan", if the goal involves any recurring practice — reading, training, writing, studying, exercising, language learning, meditation, journaling — the plan MUST include AT LEAST ONE habit with a sensible default cadence aligned to the user's stated time availability. Don't ship a plan with zero habits for these goal shapes. The user can edit the cadence on the preview.
```

**Schema change:** added `phase` (enum) and `suggestions: string[]` to `PLAN_RESPONSE_SCHEMA.required`.

---

## v5 — Tightened field roles + client-side defensive fallback

**Driver:** v4's field-mixing bug.

**Key changes:**
- Added explicit good/bad shape examples in the prompt:
  ```
  CORRECT: { message: "Traveling — beautiful motivation.", questions: ["What does 'fluent' look like for you?"], suggestions: ["Conversational fluency", "Read books in Spanish", "Work in Spanish", "Pass a B2/C1 exam"] }
  WRONG:   { message: "What does 'fluent' look like?", questions: ["Conversational fluency"], suggestions: [] }
  ```
- Added a client-side defensive fallback in `app/coach.tsx`: if `questions[0]` doesn't contain `?` and `message` does, swap them at render time.

**Why this stopped being enough:** even with the strongest prompts, the model misbehaved often enough to make the experience feel broken. Per-turn AI calls also added latency (1–2s × 6–10 steps) for questions that are essentially the same every session.

**Replacement output rule (v5 swapped this in):**

```ts
- For questions: kind="questions". Field roles, do not mix them up:
  - "message": ONE warm sentence acknowledging the user's last answer. NOT a question. NOT a list. Just a short reaction. (e.g. "Traveling — beautiful motivation.")
  - "questions": an array of EXACTLY ONE element — the actual next question, ending in "?". This is what you want to ask. NEVER put a likely answer here. NEVER leave it empty. NEVER include more than one.
  - "suggestions": 2-4 short likely-answer chips for the question. Each chip is something the USER might say in reply, not another question. NEVER empty for a questions turn.
  - "phase": the current discovery stage.
  - Set goals/milestones/projects/todos/habits to empty arrays.

  Concrete shape for a questions turn:
    {
      "kind": "questions",
      "phase": "current_state",
      "message": "Traveling — beautiful motivation.",
      "questions": ["What does 'fluent' look like for you?"],
      "suggestions": ["Conversational fluency", "Read books in Spanish", "Work in Spanish", "Pass a B2/C1 exam"],
      "goals": [], "milestones": [], "projects": [], "todos": [], "habits": []
    }
  WRONG — do NOT do this:
    { "message": "What does 'fluent' look like?", "questions": ["Conversational fluency"], "suggestions": [] }  // question is in message, answer is in questions, suggestions is empty
```

**Client-side defensive fallback added in `app/coach.tsx`:**

```ts
// Defensive fallback: the model occasionally swaps `message` and
// `questions[0]`, putting the real question in `message` and a likely answer
// in `questions[0]`. Detect by "?" presence and recover.
const wizardData = React.useMemo(() => {
  if (latestPlan || !latestAssistant || !latestAssistant.questions?.length) return null;
  const rawQuestion = latestAssistant.questions[0];
  const rawAck = latestAssistant.text;
  const looksLikeQuestion = (s: string) => s.trim().endsWith('?') || /\?/.test(s);
  let question = rawQuestion;
  let ack = rawAck;
  if (!looksLikeQuestion(rawQuestion) && looksLikeQuestion(rawAck)) {
    question = rawAck;
    ack = '';
  }
  return { question, ack };
}, [latestAssistant, latestPlan]);
```

---

## v6.0 — Static discovery script (proposed but immediately corrected to v6.1)

The first attempt at "stop calling AI per-turn" was a hardcoded universal script (`lib/coach/script.ts`, 8 fixed questions). Same idea as v6.1 below but with the questions baked in instead of model-generated. Discarded after one round of feedback because the questions need to be tailored to the dream (a reading goal needs different questions than a SaaS goal).

**Total AI calls:** 1 or 2 (strategies + plan). Same as v6.1.

Code: `git log --diff-filter=A -- lib/coach/script.ts` to find the commit that introduced the static `COACH_SCRIPT` array.

---

## v6.1 — Upfront-generated tailored questions (PREVIOUSLY CURRENT)

**Driver:** v6.0's universal hardcoded script wasn't tailored enough — the questions for "read 5 books" should be different from the ones for "launch a SaaS". Solution: still pre-generate the questions upfront from the dream, but let the LLM tailor them to the specific goal. Walk them locally. Then one more LLM call to synthesize the plan.

**Architecture:**

```
Welcome → user states their dream
         ↓
AI #1 — "questions" mode
  input:  { dream, context }
  output: { message, steps: [{ id, phase, question, suggestions }, ...] }
          (5–8 tailored questions with chips)
         ↓
LOCAL WALK — wizard cycles through `steps`, no AI
  user taps a chip OR types/speaks a custom answer per step
         ↓
AI #2 — "plan" mode
  input:  { dream, answers, context }
  output: kind="plan" with the full structured plan
         ↓
PlanPreview → Hold-to-confirm → applyPlan
```

**Total AI calls per session:** 2 (questions + plan).

**Edge function modes:**
- `mode: 'transcribe'` — Whisper, unchanged.
- `mode: 'questions'` — body `{ dream, context }` → returns `{ message, steps[] }` using a separate `QUESTIONS_RESPONSE_SCHEMA`.
- `mode: 'plan'` — body `{ dream, answers, context }` → returns `kind: 'plan'` using the existing `PLAN_RESPONSE_SCHEMA`.

**System prompt key rules:**
- Questions must be tailored to the dream (reading goal → reading-flavored questions, fitness → routine/injuries/access, business → skills/audience/hours).
- Question count: 5–8.
- WHY question is always present (motivation anchoring).
- Plan rules unchanged from v2: project = strategy with deliverable; habits required for recurrence-shaped goals; today-sized tasks under one project; standalone tasks have `projectRef=""`.

**Why-questions:** still preserved — the model is required to include at least one WHY question in the generated step list. The user's answer becomes `goal.why` on the plan.

**Discovered bugs fixed during v6.1 stabilization:**
- `lib/simple-items/supabase-repo.ts` was missing the `projectId → project_id` column mapping; every `useTodosStore.addItem({ projectId })` was silently rejected by Postgres. Fixed.
- The `goals_one_cornerstone_per_user` Postgres unique constraint can fail if the model sets `isCornerstone=true` while a cornerstone already exists. `applyPlan` now suppresses the flag in that case.
- Coach-confirm error surfacing: `String({...supabaseError})` was returning `[object Object]`. `formatError()` now extracts `message` / `details` / `hint` / `code`.

**Verbatim prompt:** see commit `1991fd3` — `git show 1991fd3:supabase/functions/coach/index.ts | sed -n '/^const SYSTEM_PROMPT/,/^`;/p'`.

---

## v7 — Two modes: Quick + Deep (CURRENT, in progress)

**Driver:** v6.1 lacks the depth needed for big or fuzzy goals. Tapping through chips lets the user skip past the questions that matter (especially WHY). The original per-turn LLM dialog (v3–v5) had that depth — bringing it back as an opt-in mode while keeping v6.1 as the fast path.

**The two modes (user picks after entering the dream):**

- **Quick plan** — keeps the v6.1 flow exactly: AI generates 3–5 tailored questions with chips, user walks through, plan synthesized. ~2 AI calls.
- **Deep coaching** — fixed flow: **5 question turns + 1 plan turn = 6 AI calls**. One question per turn. **No chips** — user must write or speak each answer. Model picks the 5 most useful questions for this dream; one of them MUST surface the WHY.

**Architecture:**

```
Welcome → user states their dream
         ↓
ModePicker (tap one)
   ├──── Quick → askQuestions → walk locally → askPlan → PlanPreview
   └──── Deep  → askDiscover (turn 1) → answer
                 askDiscover (turn 2) → answer
                 ...
                 askDiscover (turn 5) → answer
                 askDiscover (turn 6, "Final plan") → kind="plan"
                                                           ↓
                                                      PlanPreview
```

**Edge function modes:**
- `mode: 'transcribe'` — Whisper, unchanged.
- `mode: 'questions'` — kept for Quick. `{ dream, context }` → `{ message, steps[] }`.
- `mode: 'plan'` — kept. `{ dream, answers, context }` → `kind: 'plan'`.
- `mode: 'discover'` — NEW. `{ dream, history, turn, context }` where `history: { question, answer }[]` and `turn: 1..6`. Returns `kind: 'questions'` (turns 1–5) or `kind: 'plan'` (turn 6).

**Key Deep-mode prompt rules:**
- `questions.length === 1`. Always one question per turn.
- `suggestions: []`. Never chips.
- The 5 question turns must include exactly one WHY question.
- Pick the 5 most useful questions for THIS specific dream. Don't waste a turn.
- The user message tells the model the turn number; on turn 6 it must return `kind: "plan"`.
- `phase` field stays advisory for the progress bar label.

**UI changes:**
- New `ModePicker` stage between `welcome` and the rest, with two tappable cards.
- Stage union extended with `discover`/`loading_discover`.
- Wizard renders without chips when in Deep mode; placeholder reads "Take your time — speak or type".
- Progress bar in Deep mode = `currentTurn / 6` (steps 1/5 .. 5/5 .. plan).

- **Full revert** to a prior version: `git log -- supabase/functions/coach/index.ts` and `git show <sha>:supabase/functions/coach/index.ts > /tmp/coach.ts`.
- **Just the prompt:** the entire `SYSTEM_PROMPT` template literal can be replaced; the rest of the file (modes, schema, fetch wiring) is independent.
- **Just the architecture:** v3–v5 used the per-turn `messages` shape. To go back, restore `askCoach(messages)` in `lib/coach/api.ts` and the `mode: 'plan'` body shape `{ messages, context }`.

## Files involved

- `supabase/functions/coach/index.ts` — system prompt, modes, JSON schema, OpenAI call.
- `lib/coach/script.ts` — the static discovery questions (v6+ only).
- `lib/coach/api.ts` — client wrappers (`askStrategies`, `askPlan`, `transcribeAudio`).
- `lib/coach/types.ts` — request/response types.
- `lib/coach/apply-plan.ts` — writes the confirmed plan to the stores.
- `app/coach.tsx` — the wizard UI / Stage state machine.
- `components/coach-thinking.tsx` — animated checklist shown during AI calls.
- `components/coach-launcher.tsx` — sparkle FAB sibling.
