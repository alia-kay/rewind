/**
 * insights.js
 * Pure analysis layer — reads journal/intention/review data from localStorage
 * and generates contextual micro-insights. No direct localStorage access;
 * delegates all reads to the storage functions defined in the app.
 *
 * Intended to be inlined inside the main Babel script block in index.html,
 * since Babel standalone does not share scope across multiple script tags.
 *
 * Entry schema reference:
 *   { id, date, flowType ('checkin'|'emotional'), energyLevel, mentalState,
 *     emotionTone, stressIntensity, prompts[], emotionalFlow[], emotionalBranch,
 *     createdAt, recommendedActivity }
 *
 * Depends on (from index.html):
 *   loadJournalEntries(dateStr) → Entry[]
 *   loadIntention(key)          → object | null
 *   todayStr()                  → 'YYYY-MM-DD'
 *   getWeekKey(Date)            → 'intention_week_YYYY-WW'
 *   getWeekStart(Date)          → Date
 */

// ── Insight persistence ───────────────────────────────────────────────────────

const INSIGHT_DAILY_KEY = 'insight_last_shown_daily';

function getInsightLastShownDaily() {
  try {
    const s = localStorage.getItem(INSIGHT_DAILY_KEY);
    return s ? JSON.parse(s) : null; // { date: 'YYYY-MM-DD', key: string }
  } catch { return null; }
}

function saveInsightLastShownDaily(templateKey) {
  try {
    localStorage.setItem(INSIGHT_DAILY_KEY, JSON.stringify({ date: todayStr(), key: templateKey }));
  } catch {}
}

// ── Data access helpers ───────────────────────────────────────────────────────

/**
 * Returns a flat array of all entry objects across a date range (inclusive).
 * startDateStr / endDateStr are 'YYYY-MM-DD' strings.
 */
function getEntriesForRange(startDateStr, endDateStr) {
  const entries = [];
  const start = new Date(startDateStr + 'T00:00:00');
  const end   = new Date(endDateStr   + 'T23:59:59');
  const cursor = new Date(start);
  while (cursor <= end) {
    const ds = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
    entries.push(...loadJournalEntries(ds));
    cursor.setDate(cursor.getDate() + 1);
  }
  return entries;
}

function getCheckInEntries(entries) {
  return entries.filter(e => e.flowType !== 'emotional');
}

function getEmotionalEntries(entries) {
  return entries.filter(e => e.flowType === 'emotional');
}

// ── Analysis utilities ────────────────────────────────────────────────────────

/** Most frequently occurring value in an array, or null if empty. */
function getMostFrequent(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = {};
  for (const v of arr) {
    if (v == null) continue;
    counts[v] = (counts[v] || 0) + 1;
  }
  const keys = Object.keys(counts);
  if (keys.length === 0) return null;
  return keys.reduce((a, b) => counts[a] >= counts[b] ? a : b);
}

/** Consecutive days ending today (inclusive) that have at least one entry. */
function getStreak() {
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (loadJournalEntries(ds).length === 0) break;
    streak++;
  }
  return streak;
}

/** Fraction of entries where field === targetValue. */
function getFieldRate(entries, field, targetValue) {
  if (!entries || entries.length === 0) return 0;
  return entries.filter(e => e[field] === targetValue).length / entries.length;
}

/** Most common value for a given field across entries. */
function getWeekAverage(entries, field) {
  if (!entries || entries.length === 0) return null;
  return getMostFrequent(entries.map(e => e[field]).filter(v => v != null));
}

/** Fraction of weekKeys that have a completed review. */
function getIntentionCompletionRate(weekKeys) {
  if (!weekKeys || weekKeys.length === 0) return 0;
  let completed = 0;
  for (const wk of weekKeys) {
    const suffix = wk.replace('intention_week_', '');
    if (loadIntention(`review_week_${suffix}`)) completed++;
  }
  return completed / weekKeys.length;
}

/** Words appearing in focus-word lists of more than one intention. */
function getRepeatedFocusWords(weekKeys) {
  if (!weekKeys || weekKeys.length === 0) return [];
  const wordCount = {};
  for (const wk of weekKeys) {
    const int = loadIntention(wk);
    if (int && int.focusWords) {
      for (const w of int.focusWords) {
        wordCount[w] = (wordCount[w] || 0) + 1;
      }
    }
  }
  return Object.entries(wordCount).filter(([,c]) => c >= 2).map(([w]) => w);
}

/** Most common emotionalBranch among emotional-flow entries. */
function getEmotionalBranchFrequency(entries) {
  const emotional = getEmotionalEntries(entries);
  if (emotional.length === 0) return null;
  return getMostFrequent(emotional.map(e => e.emotionalBranch).filter(Boolean));
}

const _INSIGHT_STOP_WORDS = new Set([
  'i','a','an','the','and','or','but','in','on','at','to','for','of','with',
  'it','is','was','my','me','you','we','he','she','they','this','that','just',
  'so','do','be','not','have','had','has','what','how','when','where','why',
  'if','then','there','here','all','some','one','two','got','get','can','will',
  'would','could','should','about','from','up','out','no','yes','its','our',
  'been','are','were','go','going','went','feel','felt','feeling','really',
  'very','little','bit','kind','lot','too','also','still','again','back',
  'day','night','time','today','like','want','need','think','know',
]);

/** Top recurring meaningful words from journal text across all entries. */
function getTopicKeywords(entries) {
  const counts = {};
  for (const entry of entries) {
    const texts = [];
    if (entry.flowType === 'emotional') {
      (entry.emotionalFlow || []).forEach(f => { if (f.answer) texts.push(f.answer); });
    } else {
      (entry.prompts || []).forEach(p => { if (p.answer) texts.push(p.answer); });
      if (entry.notes) texts.push(entry.notes);
    }
    for (const text of texts) {
      const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
      for (const w of words) {
        if (w.length >= 4 && !_INSIGHT_STOP_WORDS.has(w)) {
          counts[w] = (counts[w] || 0) + 1;
        }
      }
    }
  }
  return Object.entries(counts)
    .filter(([,c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

/**
 * Returns the dominant journaling time bucket: 'early' (<17h), 'evening' (17-21h), 'late' (>21h).
 * Returns null if no timestamp data.
 */
function getJournalBehaviour(entries) {
  if (entries.length === 0) return null;
  const hours = entries
    .map(e => { try { return new Date(e.createdAt).getHours(); } catch { return null; } })
    .filter(h => h != null);
  if (hours.length === 0) return null;
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  return avg < 17 ? 'early' : avg < 21 ? 'evening' : 'late';
}

/** Top recurring words from completed review answers. */
function getPastReviewWords(reviewKeys) {
  const counts = {};
  for (const rk of reviewKeys) {
    const review = loadIntention(rk);
    if (!review || !review.answers) continue;
    for (const ans of Object.values(review.answers)) {
      if (!ans.text) continue;
      const words = ans.text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/);
      for (const w of words) {
        if (w.length >= 4 && !_INSIGHT_STOP_WORDS.has(w)) {
          counts[w] = (counts[w] || 0) + 1;
        }
      }
    }
  }
  return Object.entries(counts)
    .filter(([,c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

// ── Template library ──────────────────────────────────────────────────────────

const INSIGHT_TEMPLATES = {
  // BODY — energy patterns
  body_low_run:       (n)    => `You've had ${n} tired day${n>1?'s':''} in a row. Your body has been working hard.`,
  body_good_run:      (n)    => `You've checked in feeling good ${n} day${n>1?'s':''} running. Something has been working.`,
  body_drained:       ()     => `Drained keeps showing up lately. That's worth sitting with.`,
  body_mostly_tired:  ()     => `Most of your check-ins have landed on tired or drained lately.`,
  body_mixed:         ()     => `Your energy has been up and down this week. That kind of inconsistency is exhausting in itself.`,

  // HEAD — mental state
  head_foggy:         ()     => `Foggy has been your most common headspace lately. Sometimes the mind just needs stillness.`,
  head_overstimulated:()     => `Overstimulated keeps coming up. There might be more input than you can comfortably hold right now.`,
  head_clear_run:     (n)    => `You've had ${n} clear-headed day${n>1?'s':''} recently. Worth noticing what made them different.`,

  // STRESS
  stress_high:        (n)    => `High stress ${n} day${n>1?'s':''} this week. That's a lot to carry.`,
  stress_low_run:     ()     => `You've had a stretch of lower-stress days lately. Whatever helped — it's worth keeping.`,
  stress_medium:      ()     => `Medium intensity has been your baseline lately. Steady, but still a lot to hold.`,

  // EMOTIONAL
  emotional_frequent: (branch) => {
    const map = {
      grief:'grief', anxiety:'anxiety', anger:'anger', sadness:'sadness',
      loneliness:'loneliness', overwhelm:'feeling overwhelmed', stress:'stress',
    };
    return `You've been sitting with ${map[branch] || branch} quite a bit lately. That takes something to keep naming.`;
  },
  emotional_explore:  (n)    => `You chose to explore a feeling ${n} time${n>1?'s':''} recently. That takes courage.`,
  emotional_checkins: (n)    => `${n} check-in${n>1?'s':''} in the window. Every single one counts.`,

  // BEHAVIOUR
  streak:             (n)    => `${n} nights in a row. Showing up when you're tired is its own kind of strength.`,
  late_habit:         ()     => `You tend to write late in the evening. Consistent, even when the day runs long.`,
  evening_habit:      ()     => `Evening is your time to check in. There's something grounding about that rhythm.`,
  returning_habit:    (n)    => `You've been coming back here for ${n} week${n>1?'s':''} now. That consistency matters.`,

  // INTENTION
  focus_repeat:       (words) => `${words.join(' and ')} keeps showing up in your intentions. Something you keep trying to return to.`,
  review_gap:         ()     => `You've been setting intentions but haven't reviewed them in a while. What would you notice now?`,
  review_consistent:  ()     => `You've been following through on your reviews. That kind of reflection compounds quietly.`,

  // CROSS-SIGNAL
  cross_tired_stress: ()     => `Tired body and high stress at the same time. That particular combination is heavy.`,
  cross_clear_calm:   ()     => `Clear-headed and calm on the same day — that's a good combination to remember.`,

  // TOPICS
  topic_recurring:    (word) => `The word "${word}" keeps appearing in what you write. Worth sitting with.`,

  // ENCOURAGEMENT
  milestone:          (n)    => `${n} entries this month. You keep showing up.`,
  first_emotional:    ()     => `You tried exploring a feeling. That's harder than it sounds.`,
  consistent_weeks:   ()     => `You've been consistent even through hard weeks. That's not nothing.`,
};

// ── Insight generators ────────────────────────────────────────────────────────

/**
 * Generates a single daily micro-insight for the Today tab.
 * Returns { key, text } or null if insufficient data.
 * Minimum threshold: 3 entries in the last 14 days.
 */
function generateDailyInsight() {
  const today = todayStr();
  const last  = getInsightLastShownDaily();
  // Avoid repeating the same template key today
  const usedKey = (last && last.date === today) ? last.key : null;

  // Gather last 14 days
  const now       = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 13);
  const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,'0')}-${String(startDate.getDate()).padStart(2,'0')}`;
  const recent   = getEntriesForRange(startStr, today);

  if (recent.length < 3) return null;

  const checkins  = getCheckInEntries(recent);
  const emotional = getEmotionalEntries(recent);

  // Collect candidates with priority (lower = more important)
  const cands = [];
  function add(key, text, priority) {
    if (key !== usedKey) cands.push({ key, text, priority });
  }

  // STREAK
  const streak = getStreak();
  if (streak >= 4) add('streak', INSIGHT_TEMPLATES.streak(streak), 1);

  // ENERGY RUN
  if (checkins.length >= 3) {
    const last3    = checkins.slice(-3);
    const allBad   = last3.every(e => e.energyLevel === 'drained' || e.energyLevel === 'tired');
    const allGood  = last3.every(e => e.energyLevel === 'good');
    if (allBad)  add('body_low_run',  INSIGHT_TEMPLATES.body_low_run(last3.length),  2);
    else if (allGood) add('body_good_run', INSIGHT_TEMPLATES.body_good_run(last3.length), 2);

    const tiredRate = getFieldRate(checkins, 'energyLevel', 'tired') + getFieldRate(checkins, 'energyLevel', 'drained');
    if (tiredRate >= 0.6) add('body_mostly_tired', INSIGHT_TEMPLATES.body_mostly_tired(), 3);
  }

  // HIGH STRESS
  if (checkins.length >= 3) {
    const highN = checkins.filter(e => e.stressIntensity === 'high').length;
    if (highN >= 3) add('stress_high', INSIGHT_TEMPLATES.stress_high(highN), 2);
    else if (getFieldRate(checkins, 'stressIntensity', 'low') >= 0.5) {
      add('stress_low_run', INSIGHT_TEMPLATES.stress_low_run(), 3);
    }
  }

  // MENTAL STATE
  if (checkins.length >= 3) {
    const overRate  = getFieldRate(checkins, 'mentalState', 'overstimulated');
    const foggyRate = getFieldRate(checkins, 'mentalState', 'foggy');
    const clearN    = checkins.filter(e => e.mentalState === 'clear').length;
    if (overRate  >= 0.4) add('head_overstimulated', INSIGHT_TEMPLATES.head_overstimulated(), 3);
    else if (foggyRate >= 0.4) add('head_foggy',     INSIGHT_TEMPLATES.head_foggy(),          3);
    else if (clearN    >= 3)   add('head_clear_run', INSIGHT_TEMPLATES.head_clear_run(clearN), 3);
  }

  // CROSS-SIGNAL
  if (checkins.length >= 2) {
    const tiredAndStress = checkins.filter(e =>
      (e.energyLevel === 'tired' || e.energyLevel === 'drained') && e.stressIntensity === 'high'
    ).length;
    if (tiredAndStress >= 2) add('cross_tired_stress', INSIGHT_TEMPLATES.cross_tired_stress(), 2);
    const clearCalm = checkins.filter(e => e.mentalState === 'clear' && e.emotionTone === 'calm').length;
    if (clearCalm >= 2) add('cross_clear_calm', INSIGHT_TEMPLATES.cross_clear_calm(), 3);
  }

  // EMOTIONAL BRANCH
  if (emotional.length >= 2) {
    const branch = getEmotionalBranchFrequency(recent);
    if (branch) add('emotional_frequent', INSIGHT_TEMPLATES.emotional_frequent(branch), 2);
    add('emotional_explore', INSIGHT_TEMPLATES.emotional_explore(emotional.length), 4);
  }

  // BEHAVIOUR
  const behaviour = getJournalBehaviour(recent);
  if (behaviour === 'late')    add('late_habit',    INSIGHT_TEMPLATES.late_habit(),    5);
  else if (behaviour === 'evening') add('evening_habit', INSIGHT_TEMPLATES.evening_habit(), 5);

  // TOPICS
  if (recent.length >= 5) {
    const kws = getTopicKeywords(recent);
    if (kws.length > 0) add('topic_recurring', INSIGHT_TEMPLATES.topic_recurring(kws[0]), 4);
  }

  // ENCOURAGEMENT (fallback)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const msStr = `${monthStart.getFullYear()}-${String(monthStart.getMonth()+1).padStart(2,'0')}-01`;
  const monthN = getEntriesForRange(msStr, today).length;
  if (monthN >= 5) add('milestone', INSIGHT_TEMPLATES.milestone(monthN), 6);

  if (cands.length === 0) return null;
  cands.sort((a, b) => a.priority - b.priority);
  return { key: cands[0].key, text: cands[0].text };
}

/**
 * Generates insights for a specific week.
 * weekKey: 'intention_week_YYYY-WW'
 * Returns array of { key, text }, max 3.
 */
function generateWeeklyInsights(weekKey) {
  const match = weekKey.match(/intention_week_(\d{4})-(\d{2})/);
  if (!match) return [];

  const year = parseInt(match[1]);
  const week = parseInt(match[2]);

  // Reconstruct the week's start date
  const jan4       = new Date(year, 0, 4); // Jan 4 is always in week 1
  const jan4day    = (jan4.getDay() + 6) % 7; // 0=Mon
  const weekOneStart = new Date(jan4.getTime() - jan4day * 86400000);
  const weekStart  = new Date(weekOneStart.getTime() + (week - 1) * 7 * 86400000);
  const weekEnd    = new Date(weekStart.getTime() + 6 * 86400000);

  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const entries  = getEntriesForRange(fmt(weekStart), fmt(weekEnd));
  const insights = [];
  if (entries.length < 2) return insights;

  const checkins  = getCheckInEntries(entries);
  const emotional = getEmotionalEntries(entries);

  if (checkins.length >= 2) {
    const dominant  = getWeekAverage(checkins, 'energyLevel');
    const tiredRate = getFieldRate(checkins, 'energyLevel', 'tired') + getFieldRate(checkins, 'energyLevel', 'drained');
    if (tiredRate >= 0.5) {
      const n = checkins.filter(e => e.energyLevel === 'drained' || e.energyLevel === 'tired').length;
      insights.push({ key: 'body_low_run', text: INSIGHT_TEMPLATES.body_low_run(n) });
    } else if (dominant === 'good') {
      const n = checkins.filter(e => e.energyLevel === 'good').length;
      insights.push({ key: 'body_good_run', text: INSIGHT_TEMPLATES.body_good_run(n) });
    }

    const highStress = checkins.filter(e => e.stressIntensity === 'high').length;
    if (highStress >= 2) insights.push({ key: 'stress_high', text: INSIGHT_TEMPLATES.stress_high(highStress) });

    const overCount = checkins.filter(e => e.mentalState === 'overstimulated').length;
    if (overCount >= 2) insights.push({ key: 'head_overstimulated', text: INSIGHT_TEMPLATES.head_overstimulated() });
  }

  if (emotional.length >= 1) {
    insights.push({ key: 'emotional_explore', text: INSIGHT_TEMPLATES.emotional_explore(emotional.length) });
  }

  return insights.slice(0, 3);
}

/**
 * Generates insights for a full month.
 * monthKey: 'intention_month_YYYY-MM'
 * Returns array of { key, text }, max 4.
 */
function generateMonthlyInsights(monthKey) {
  const match = monthKey.match(/intention_month_(\d{4})-(\d{2})/);
  if (!match) return [];

  const year  = parseInt(match[1]);
  const month = parseInt(match[2]) - 1;

  const startStr = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const lastDay  = new Date(year, month + 1, 0).getDate();
  const endStr   = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  const entries  = getEntriesForRange(startStr, endStr);

  if (entries.length < 5) return [];

  const insights  = [];
  const checkins  = getCheckInEntries(entries);
  const emotional = getEmotionalEntries(entries);

  // Total entries milestone
  insights.push({ key: 'milestone', text: INSIGHT_TEMPLATES.milestone(entries.length) });

  // Energy pattern
  if (checkins.length >= 5) {
    const tiredRate = getFieldRate(checkins, 'energyLevel', 'tired') + getFieldRate(checkins, 'energyLevel', 'drained');
    if (tiredRate >= 0.55) {
      insights.push({ key: 'body_mostly_tired', text: INSIGHT_TEMPLATES.body_mostly_tired() });
    } else {
      const dominant = getWeekAverage(checkins, 'energyLevel');
      if (dominant === 'good') {
        const n = checkins.filter(e => e.energyLevel === 'good').length;
        insights.push({ key: 'body_good_run', text: INSIGHT_TEMPLATES.body_good_run(n) });
      }
    }
  }

  // Emotional branch
  if (emotional.length >= 2) {
    const branch = getEmotionalBranchFrequency(entries);
    if (branch) insights.push({ key: 'emotional_frequent', text: INSIGHT_TEMPLATES.emotional_frequent(branch) });
  }

  // Repeated intention focus words
  const weeksInMonth = [];
  for (let d = new Date(year, month, 1); d.getMonth() === month; d.setDate(d.getDate() + 7)) {
    weeksInMonth.push(getWeekKey(new Date(d)));
  }
  const repeated = getRepeatedFocusWords(weeksInMonth);
  if (repeated.length > 0) {
    insights.push({ key: 'focus_repeat', text: INSIGHT_TEMPLATES.focus_repeat(repeated.slice(0, 2)) });
  }

  // Recurring topic keyword
  const kws = getTopicKeywords(entries);
  if (kws.length > 0) insights.push({ key: 'topic_recurring', text: INSIGHT_TEMPLATES.topic_recurring(kws[0]) });

  return insights.slice(0, 4);
}
