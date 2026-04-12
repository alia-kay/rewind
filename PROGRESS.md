# Tonight? — Progress Notes

## What it is
A single-page web app for a tired mom with 1–2 hours of free time after her toddler goes to bed. She opens the app, checks in with how she's feeling, and gets a personalised activity recommendation — or writes a journal entry first. All data is private — stored only in her browser's `localStorage`, no backend.

## Current implementation
Single `index.html` file. React 18 via CDN, Tailwind CSS via CDN (play), Babel standalone for JSX. No build step, no backend, no login.

**Stack:** React + Tailwind + Babel standalone (all CDN) · `localStorage` for journal entries, custom activities, disabled activities, hidden activities, intentions, reviews, recent prompts

---

## Global UI

### Top navigation bar
Fixed horizontal bar at the top of every screen (56px height, frosted navy background).
- **Left:** 🌙 moon icon + "Tonight?" in serif
- **Center:** `Home · Journal · Activities` — active tab has a terracotta bottom-border accent
- **Right:** current date (e.g. "Fri, Apr 4")

Clicking Home returns to the welcome/quiz flow. Clicking Journal opens the Calendar screen. Clicking Activities opens the two-column Activities screen.

---

## Screens

### 1. Welcome screen
- Crescent moon emoji, serif headline "Tonight?", taglines
- On return visits: shows week intention sentence (if set) and last journal entry date
- Small muted uppercase label: "How are you arriving tonight?"
- Primary CTA button **"Write first ✏️"** → starts the journal flow
- Ghost button **"Skip to recommendations →"** → goes directly to the 5-question quiz
- Subtle link **"+ Add your own activities"** → opens the Manage Activities screen

### 2. Journal flow (multi-step, two phases + optional deep mode)

#### Check-in — 4 questions (steps 0–3)

| Step | Question | Options |
|------|----------|---------|
| 0 | "How's your body feeling right now?" | 🪫 Completely drained · 😴 Tired but okay · 😐 Neutral · ✨ Surprisingly good |
| 1 | "How's your head tonight?" | 🌀 Overstimulated · 🌫️ Foggy and kind of blank · 🙂 Clear enough |
| 2 | "What emotion is closest right now?" | 😬 Anxious · 🌊 Overwhelmed · 😔 Sad · 😤 Irritated · 😌 Calm · 🙂 Good |
| 3 | "How intense does everything feel right now?" | 🌿 Low · 🌤️ Medium · 🔥 High |

Back buttons on steps 1–3. Step 0 has no back button.

All four values stored on the journal entry: `energyLevel`, `mentalState`, `emotionTone`, `stressIntensity`.

#### Contextual intro (step 4)
After the 4th check-in answer, a soft transition screen auto-advances after 1500 ms (or on tap). Message is derived from check-in answers:
- stress === "high" → "Let's slow things down a bit."
- emotion === "anxious" or "overwhelmed" → "Let's unpack what's on your mind."
- mental === "clear" → "You seem clear tonight — let's build on that."
- default → "Take a moment for yourself."

No back button, no progress dots.

#### State category detection
After 4 check-in answers, the app detects a category in priority order:

1. drained + overstimulated + high stress → **grounding**
2. anxious or overwhelmed → **anxiety**
3. sad → **emotional**
4. irritated → **frustrated**
5. tired/drained + foggy → **foggy**
6. calm/good + clear + low stress → **growth**

#### Phase 1 — Light prompts (steps 5…)
2–3 light prompts selected from the detected category's pool. Selection logic:
- Never repeat prompts used in the last 10 sessions (`journal_recent_prompts` in localStorage)
- Tag balancing: no more than 2 prompts with the same tag per session
- Optionally appends 1 gratitude prompt (if user has < 3 prompts already):
  - stress high or emotion sad/anxious → "What made today slightly more manageable?" / "Was there a small moment of relief?"
  - emotion neutral/good → "What am I genuinely grateful for today?" / "Who or what supported me today?"

Progress dots span the 4 check-in steps + light prompts. Each prompt has a textarea, auto-saves on keystroke, "Continue →" to advance. Back button on every step.

#### Deep mode offer
After the last light prompt, shows a transition card: **"Want to go a bit deeper tonight?"**
- **"Not now"** → proceeds to closing screen
- **"Yes, let's go"** → shows 1–2 deep prompts from the same category. Back button returns to this offer.

Deep prompts show a "Deep 1/2" counter instead of progress dots. Same deduplication and tag balancing applies.

Each prompt answer is saved with `mode: "light" | "deep"` on the entry.

#### Closing screen
- Serif heading: "That's yours for tonight."
- Italic muted subtext: "Anything else you want to add?"
- **Notes** textarea (freeform, no prompt)
- **"Save entry"** button → saves, flashes "Saved ✓", navigates to Calendar
- **"Delete this entry"** button → two-tap confirm, removes entry, returns to Welcome

### 3. Activity quiz (5 questions)

| Step | Question | Options |
|------|----------|---------|
| 0 | "How's your body feeling right now?" | 🪫 Drained · 😴 Tired but okay · 😐 Neutral · ✨ Surprisingly good |
| 1 | "How's your head tonight?" | 🌀 Overstimulated · 🌫️ Foggy · 🙂 Clear enough |
| 2 | "Do you want to include your husband?" | 💑 Together · 👤 Solo · 🤷 Either |
| 3 | "Any urge to make or create something?" | 🎨 Hands · 📖 Absorb · 🌀 Zone out |
| 4 | "How much time do you have?" | ⚡ ~1 hr · 🌙 ~2 hrs · 🌌 Full 3 hrs |

Back buttons on every step except step 0.

Journal text (if the user wrote first) is keyword-scanned before the quiz runs. Matching keywords quietly adjust activity scores (+15 boosts). Intention keywords also influence scoring (+12 per theme). If the top recommendation changes due to either boost, a gold italic line explains the influence.

### 4. Results screen
- Top 3 activity recommendations (scored and ranked)
- Each card shows: emoji, name, description, contextual "why" line, "How to start" tip
- **Series and movie cards** also show "A few picks to consider" — 5 curated titles with a short note each
- "Start over" link · "Go to my journal →" link

### 5. Calendar / Journal screen (three-column full-page layout)
Accessible via the **Journal** nav tab.

**Left column (440px)** — intention cards:
- "Intentions" header + month navigator (independent, browse any month)
- **Month intention card**: inline edit/read toggle. Read mode shows sentence, checklist items (checkable), focus word pills, "Review [Month] →" button. Edit mode shows textarea, item add/remove, focus word chip toggle, Save/Cancel.
- **Weekly intention cards** for each week in the selected month: same inline edit/read pattern
- Cards show "No intention set yet." empty state

**Center column (flex 1)** — today's entry + calendar:
- **Today's entry card** at the top:
  - If entry exists: terracotta-accented card with energy/mental/emotion/stress pills, prompt Q&As, notes, Edit/Delete (two-tap confirm). Inline edit mode: re-select all check-in values + edit prompt text + edit notes. Auto-updates entryDates set on save.
  - If no entry: dashed placeholder card with "How are you arriving tonight?" + "✏️ Write tonight's entry" button
- **Journal** heading + month navigator (← Month Year →)
- Monthly calendar grid starting **Monday** (Mon–Sun headers)
- Days with entries tinted by energy level (solid colors):
  - `good` → #D6ECD2 / #2E6B27
  - `neutral` / `tired` → #FAE8D0 / #854F0B
  - `drained` → #F5DDD8 / #712B13
  - today (no entry) → dark warm tint + gold border
- Clicking a day with an entry opens an entry preview panel below the calendar with date header, all pills, prompt Q&As, notes, recommended activity (if any), Delete button (two-tap confirm), Edit entry button
- Color legend + Export + Clear all inline below the grid

**Right column (220px)** — review cards:
- "Reviews" header + month navigator (independent, browse any month)
- **Month review card** with status badge (Done = green, Pending = beige if intention exists, Not yet = muted)
- **Weekly review cards** for each week in the selected month, same badge logic
- Done cards preview the final "one word" answer
- "Start review →" / "Edit review →" button opens the review overlay pre-populated with existing answers

**Review overlay** — absolute-positioned over the calendar screen (nav remains visible):
- × button top-right → confirm dialog ("Leave without saving?" / "Yes, exit" / "Keep going")
- Week review: 6 questions · Month review: 8 questions
- Progress dots, fade transitions, auto-advance on option-only questions
- Back buttons on every step except step 0
- Final step: Save review button (writes to `review_week_YYYY-WW` or `review_month_YYYY-MM`)
- Review key tracks the specific week/month being reviewed, so browsing past months reviews the correct period

**Week review questions (6 steps):**
1. "Did this week feel like you intended it to?" — options: Fully / Mostly / Not really + optional text
2. "What was the hardest moment this week?" — free text
3. "What was the most nourishing moment?" — free text
4. "Did you show up for yourself this week?" — options: Yes / Sometimes / Not really
5. "What do you want to carry into next week?" — free text
6. "One word for how this week felt." — single word input

**Month review questions (8 steps):**
1. "In one sentence, how was this month?" — free text
2. "Did you live your intention?" — options + optional text
3. "What surprised you most this month?" — free text
4. "What did you let go of?" — free text
5. "What are you most proud of, even quietly?" — free text
6. "What do you want more of next month?" — free text
7. "What do you want less of?" — free text
8. "One word or image that captures this month." — single word input

### 6. Activities screen (two-column full-page layout)
Accessible via the **Activities** nav tab.

**Left column (380px)** — activity list:
- Header: "My activities" serif + subheader
- Right-aligned "+ Add activity" button and "Get recommendation →" button (runs the quiz from Activities)
- Scrollable list of all 18 built-in + any custom activities
- Each row: emoji · name (with "custom" badge if user-added) · social + creative tag pills · toggle switch
- Clicking a row opens the detail panel. Active row has a left terracotta bar + warm background tint

**Right column (flex)** — activity detail panel:
- Empty state: centered 🌙 + "Select an activity to see details."
- When selected: large emoji, serif name, tag pills, description, "Best when you're..." bullets, "How to start" card
- Bottom actions: "Remove from list" ghost danger button (two-tap confirm) · "Include in recommendations" toggle

**Add Activity modal** — fields: name, emoji picker (24), social mode, creative mode (multi), time needed. On save: appears at top of list, selected.

---

## Data model

### Journal entries
Saved to `localStorage` as `journal_YYYY-MM-DD` (JSON):

```js
{
  date: "YYYY-MM-DD",
  energyLevel: "drained" | "tired" | "neutral" | "good",
  mentalState: "overstimulated" | "foggy" | "clear",
  emotionTone: "anxious" | "overwhelmed" | "sad" | "irritated" | "calm" | "good",
  stressIntensity: "low" | "medium" | "high",
  prompts: [
    { question: "prompt text", answer: "user's written answer", mode: "light" | "deep" }
  ],
  notes: "freeform text",
  recommendedActivity: null | { id, name, emoji }
}
```

### Prompt deduplication
- `journal_recent_prompts` — JSON array of the last 10 prompt texts used across sessions

### Custom activities
Saved to `localStorage` as `tonight-custom` (JSON array). Each: `id`, `name`, `emoji`, `social`, `creative`, `energy` (all levels), `mental` (all levels), `minTime`, `isCustom: true`.

### Activity preferences
- `tonight-disabled` — JSON array of activity IDs excluded from scoring
- `tonight-hidden` — JSON array of built-in activity IDs removed from the list entirely

### Intentions
- `intention_week_YYYY-WW` — JSON: `{ sentence, items: [{text, checked}], words: [string] }`
- `intention_month_YYYY-MM` — JSON: same shape

### Reviews
- `review_week_YYYY-WW` — JSON: `{ type, date, answers: { [stepIdx]: { option?, text? } } }`
- `review_month_YYYY-MM` — JSON: same shape

---

## Prompt library (6 categories × light + deep)

Each prompt has a `tag` for variety balancing (max 2 same tag per session):

| Category | Condition | Tags used |
|----------|-----------|-----------|
| grounding | drained + overstimulated + high stress | release, reflection, needs, depth, boundaries |
| foggy | tired/drained + foggy | clarity, reflection, awareness, depth |
| anxiety | anxious or overwhelmed | release, grounding, needs, depth, awareness |
| emotional | sad | release, needs, depth, awareness |
| frustrated | irritated | reflection, release, awareness, boundaries, needs |
| growth | calm/good + clear + low stress | reflection, forward, awareness |

Plus two contextual gratitude pools (high-stress and neutral/good variants).

---

## Activity library (18 activities)

```
series         · Watch a series            (+ 5 curated picks)
fiction        · Read fiction
nonfiction     · Read non-fiction
clay           · Make something with clay
podcast        · Listen to a podcast
interview      · Watch a long interview
husband-games  · Watch your husband play video games
board-games    · Play a board game
movie          · Watch a movie             (+ 5 curated picks)
yoga           · Gentle yoga or stretching
journal        · Journal with a prompt
doodle         · Sketchbook doodling
learn          · Learn something tiny
bath           · Long bath + podcast/audiobook
baking         · Bake or cook something enjoyable
documentary    · Watch a documentary
walk           · An evening walk
write          · Write something
```

---

## Design

- **Colors:** deep navy `#1a1a2e` (bg) · terracotta `#c4714f` (CTA, accents) · cream `#f5efe6` (primary text) · gold `#d4a853` (highlights)
- **Energy tints (solid):** good `#D6ECD2`/`#2E6B27` · neutral/tired `#FAE8D0`/`#854F0B` · drained `#F5DDD8`/`#712B13`
- **Fonts:** Lora (serif) for headings and italic prompt questions · Inter (sans) for body and buttons
- **Animations:** fade-up on screen entry · pulsing moon during transitions · progress dots animate between steps
- **Mobile:** large tap targets, single-column layout, fluid font sizes

---

## Feature flags

### `SHOW_ACTIVITIES` (currently `false`)
Defined at the top of the `<script type="text/babel">` block in `index.html`, just before the `App()` function.

When `false`, the following are hidden (not removed):
- **Activities tab** in the top nav bar
- **"Find an activity for today →"** ghost button on the Today tab CTA card
- **"Find an activity for today →"** button on the EmotionalFlowScreen closing screen
- **"Find an activity for today →"** button on the JournalScreen check-in closing screen
- **`handleFindActivityFromJournal`** redirect to the 3-question quiz (guarded with early return)

The Activities page component, all activity-related code, localStorage data, and logic remain intact.
To restore everything: change `const SHOW_ACTIVITIES = false;` → `const SHOW_ACTIVITIES = true;`.

---

## What's not in the current build

- Mood trend visualization in calendar
- Streak counter / habit tracking
- Optional partner mode (shared read-only view)
- Post-journal option to get activity recommendations (journal → quiz)
