/**
 * prompts.js
 * Full journal prompt library and all prompt selection logic.
 *
 * Exports:
 *   PROMPT_LIBRARY   — object keyed by category → {light, deep} prompt arrays
 *   selectCategoryPrompts(category, mode, count, recentTexts) → string[]
 *   selectGratitudePrompt(emotion, stress) → string
 *   shuffleArr(arr) → shuffled copy
 */

const PROMPT_LIBRARY = {
  grounding: {
    light: [
      { text: "What feels like too much right now?",      tag: "release" },
      { text: "What drained me the most today?",          tag: "reflection" },
      { text: "What would feel like enough for tonight?", tag: "needs" },
    ],
    deep: [
      { text: "What has been building up in me that I haven't had space to process?", tag: "depth" },
      { text: "Where in my life do I feel stretched beyond my limits?",               tag: "boundaries" },
      { text: "What would it mean to truly rest tonight,\nnot just stop?",            tag: "needs" },
      { text: "What am I carrying that isn't actually mine?",                         tag: "release" },
      { text: "If my body could speak right now, what would it ask for?",             tag: "awareness" },
    ],
  },
  foggy: {
    light: [
      { text: "What feels unclear right now?",                                tag: "clarity" },
      { text: "What's one small thing I did today?",                         tag: "reflection" },
      { text: "What's been sitting quietly in the back of my mind?",         tag: "awareness" },
    ],
    deep: [
      { text: "What might I be avoiding by staying in this foggy state?",    tag: "depth" },
      { text: "If I slowed down fully, what thoughts would surface?",        tag: "clarity" },
      { text: "What decision or conversation have I been\nquietly dreading?", tag: "awareness" },
    ],
  },
  anxiety: {
    light: [
      { text: "What am I worried might happen?",          tag: "release" },
      { text: "What's actually in my control right now?", tag: "grounding" },
      { text: "What would reassure me a little?",         tag: "needs" },
    ],
    deep: [
      { text: "What fear is underneath this feeling?",                                  tag: "depth" },
      { text: "When have I felt this before, and what does that tell me?",             tag: "awareness" },
      { text: "What am I trying to control that I actually cannot?",                   tag: "grounding" },
      { text: "What would I tell a close friend feeling exactly\nthis way right now?", tag: "release" },
      { text: "What small thing could make me feel 10% safer\nright now?",             tag: "needs" },
    ],
  },
  emotional: {
    light: [
      { text: "What felt heavy today?",                        tag: "release" },
      { text: "What do I wish someone understood right now?",  tag: "needs" },
      { text: "What do I need more of emotionally?",           tag: "needs" },
    ],
    deep: [
      { text: "What is this feeling asking from me?",                                  tag: "depth" },
      { text: "What part of me feels unseen or unheard?",                             tag: "awareness" },
      { text: "What have I been silently grieving lately?",                           tag: "depth" },
      { text: "What would feel like a small act of kindness\ntoward myself tonight?", tag: "needs" },
    ],
  },
  frustrated: {
    light: [
      { text: "What triggered this feeling?",                  tag: "reflection" },
      { text: "What felt unfair or off today?",                tag: "release" },
      { text: "What did I hold back from saying?",             tag: "awareness" },
    ],
    deep: [
      { text: "What boundary might have been crossed?",                                       tag: "boundaries" },
      { text: "What does this frustration reveal about what I need?",                        tag: "needs" },
      { text: "What expectation — of myself or others —\nis underneath this?",               tag: "awareness" },
      { text: "What would it feel like to fully let this go,\neven just for tonight?",       tag: "release" },
    ],
  },
  growth: {
    light: [
      { text: "What felt good or aligned today?",              tag: "reflection" },
      { text: "What do I want more of tomorrow?",              tag: "forward" },
      { text: "What surprised me in a positive way?",          tag: "reflection" },
    ],
    deep: [
      { text: "What patterns in my life are working well right now?",                              tag: "awareness" },
      { text: "What conditions made today feel more aligned —\n and how could I protect more of those?", tag: "forward" },
      { text: "If I could design more days like this,\n what would they look like?",               tag: "forward" },
    ],
  },
};

const GRATITUDE_HIGH_STRESS = [
  "What made today slightly more manageable?",
  "Was there a small moment of relief?",
];
const GRATITUDE_NEUTRAL_GOOD = [
  "What am I genuinely grateful for today?",
  "Who or what supported me today?",
];

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Selects `count` prompts from the given category/mode pool.
 * Avoids recentTexts first, then falls back to any prompt.
 * Tag balancing: max 2 prompts with the same tag per call.
 * Falls back to 'growth' if the category has no prompts.
 */
function selectCategoryPrompts(category, mode, count, recentTexts) {
  const lib = PROMPT_LIBRARY[category] || PROMPT_LIBRARY.growth;
  const pool = (lib[mode] || lib.light || []);
  if (pool.length === 0) return [];

  const tagCounts = {};
  const selected = [];

  // First pass: skip recent prompts, respect tag balance
  for (const p of shuffleArr(pool.filter(p => !recentTexts.includes(p.text)))) {
    if (selected.length >= count) break;
    if ((tagCounts[p.tag] || 0) < 2) {
      selected.push(p.text);
      tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1;
    }
  }

  // Second pass: fill gaps, ignoring recency
  if (selected.length < count) {
    for (const p of shuffleArr(pool)) {
      if (selected.length >= count) break;
      if (!selected.includes(p.text) && (tagCounts[p.tag] || 0) < 2) {
        selected.push(p.text);
        tagCounts[p.tag] = (tagCounts[p.tag] || 0) + 1;
      }
    }
  }

  return selected;
}

function selectGratitudePrompt(emotion, stress) {
  const pool = (stress === 'high' || emotion === 'sad' || emotion === 'anxious' || emotion === 'overwhelmed')
    ? GRATITUDE_HIGH_STRESS
    : GRATITUDE_NEUTRAL_GOOD;
  return pool[Math.floor(Math.random() * pool.length)];
}
