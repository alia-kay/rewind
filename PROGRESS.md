# Tonight? — Progress Notes

## What it is
A single-page web app for a tired mom with 1–2 hours of free time after her toddler goes to bed at 7pm. It asks 5 quick questions and recommends the best evening activity based on her answers.

## Current implementation
Single `index.html` file. React 18 via CDN, Tailwind CSS via CDN (play), Babel standalone for JSX. No build step, no backend, no login.

**Stack:** React + Tailwind + Babel standalone (all CDN) · `localStorage` for session memory

---

## Screens

### 1. Welcome screen
- Crescent moon logo, serif headline "Tonight?", italic tagline
- On return visits: shows "Last time you were [energy label]" pulled from `localStorage`
- Single CTA button → starts the question flow

### 2. Question flow (5 questions, one per screen)
Smooth fade transition between each. Progress bar (dots) at top.

| # | Question | Options |
|---|----------|---------|
| Q1 | "How's your body feeling right now?" | 🪫 Completely drained · 😴 Tired but okay · 😐 Neutral · ✨ Surprisingly good |
| Q2 | "How's your head tonight?" | 🌀 Overstimulated · 🌫️ Foggy and kind of blank · 🙂 Clear enough |
| Q3 | "Do you want to include your husband?" | 💑 Yes together · 👤 Solo · 🤷 Either |
| Q4 | "Any urge to make or create something?" | 🎨 Use my hands · 📖 Absorb something · 🌀 Zone out |
| Q5 | "How much time do you have?" | ⚡ 1 hour · 🌙 2 hours · 🌌 3 hours |

### 3. Results screen
- Top recommendation shown as a primary card (cream background)
- Each card has: emoji + activity name, 2-sentence description, contextual "why this fits you tonight" (generated from answers), "How to start" starter suggestion
- "Not feeling it?" button reveals the #2 and #3 matches below (also scored)
- "Start over" link

---

## Activity library (19 activities)

| ID | Name | Social | Creative mode |
|----|------|--------|---------------|
| `series` | Watch a series | solo/together/either | zoneout, absorb |
| `fiction` | Read fiction | solo/either | absorb |
| `nonfiction` | Read non-fiction | solo/either | absorb |
| `clay` | Make something with clay | solo/either | hands |
| `podcast` | Listen to a podcast | solo/either | absorb, zoneout |
| `interview` | Watch a long interview | solo/either | absorb |
| `husband-games` | Watch husband play video games | together/either | zoneout |
| `board-games` | Play a board game | together | absorb, hands |
| `movie` | Watch a movie with husband | together | absorb, zoneout |
| `yoga` | Gentle yoga or stretching | solo/either | zoneout, absorb |
| `journal` | Journal with a prompt | solo/either | hands |
| `doodle` | Sketchbook doodling | solo/either | hands |
| `learn` | Learn something tiny | solo/either | absorb |
| `bath` | Long bath + podcast/audiobook | solo/either | absorb, zoneout |
| `baking` | Bake or cook something | solo/together/either | hands |
| `embroidery` | Embroidery or knitting | solo/either | hands, zoneout |
| `documentary` | Watch a documentary | solo/together/either | absorb |
| `walk` | An evening walk | solo/together/either | zoneout, absorb |
| `write` | Write something | solo/either | hands, absorb |

---

## Scoring / recommendation engine
Pure logic, no AI. Each activity is scored against the 5 answers:

- **Hard exclusions:** activity `minTime` > available time · energy level incompatible · social mode incompatible (e.g. `together`-only activity when solo was selected)
- **Drained energy:** excludes board games, baking, writing, learning, documentary, walk · boosts bath, yoga, series, embroidery, podcast, fiction, journal
- **Mental state bonuses:**
  - Overstimulated → boosts clay, embroidery, yoga, doodle, bath, journal · penalises nonfiction, learn, board games
  - Foggy → boosts podcast, husband-games, series, bath, yoga, embroidery · penalises nonfiction, learn, write
  - Clear → boosts nonfiction, learn, write, documentary, board games, baking
- **Creative mode bonuses:** hands → clay/baking/embroidery/doodle/write/journal · absorb → fiction/podcast/interview/documentary/learn · zoneout → series/husband-games/embroidery/yoga/bath/podcast/walk/movie
- Returns top 3 sorted by score

---

## Design

- **Colors:** deep navy `#1a1a2e` (bg) · terracotta `#c4714f` (CTA, accents) · cream `#f5efe6` (primary card, text) · gold `#d4a853` (highlights, dots)
- **Fonts:** Lora (serif) for headings and italic "why" text · Inter (sans) for body
- **Animations:** fade-up on screen entry · pulsing moon on transitions · progress dots animate between questions
- **Mobile:** large tap targets, single-column layout, fluid font sizes

---

## What's not done yet / possible next steps

- [ ] The "why this fits you tonight" copy could be richer — currently picked from a static map, could be more combinatorial
- [ ] No sound / haptic feedback on selection
- [ ] No sharing / export of the recommendation
- [ ] Could add a "how did it go?" follow-up prompt on next visit
- [ ] Babel standalone is ~700KB — if performance matters, migrate to a proper Vite/React build
- [ ] The activity library could be expanded further (e.g. calling a friend, skincare ritual, vision board)
