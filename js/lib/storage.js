/**
 * storage.js
 * Centralised localStorage access layer.
 * All reads and writes go through these functions — no component touches localStorage directly.
 *
 * Key constants are defined here as STORAGE_KEYS so they never drift.
 * Every function wraps its operation in try/catch; failures return null/empty values.
 */

const STORAGE_KEYS = {
  JOURNAL_PREFIX:   'journal_',
  RECENT_PROMPTS:   'journal_recent_prompts',
  CUSTOM_ACTIVITIES:'tonight-custom',
  DISABLED:         'tonight-disabled',
  HIDDEN:           'tonight-hidden',
  QUIZ_ANSWERS:     'tonight-answers',
  INTENTION_PREFIX: 'intention_',
  REVIEW_PREFIX:    'review_',
};

// ── Journal entries ───────────────────────────────────────────────────────────

function getJournalEntry(dateStr) {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.JOURNAL_PREFIX + dateStr);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.warn('[storage] Failed to read journal entry for', dateStr, e);
    return null;
  }
}

function saveJournalEntry(entry) {
  try {
    localStorage.setItem(STORAGE_KEYS.JOURNAL_PREFIX + entry.date, JSON.stringify(entry));
  } catch (e) {
    console.warn('[storage] Failed to save journal entry', e);
  }
}

function deleteJournalEntry(dateStr) {
  try {
    localStorage.removeItem(STORAGE_KEYS.JOURNAL_PREFIX + dateStr);
  } catch (e) {
    console.warn('[storage] Failed to delete journal entry', e);
  }
}

/** Returns all date strings that have journal entries */
function getAllJournalDates() {
  const dates = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEYS.JOURNAL_PREFIX)) {
        dates.push(k.slice(STORAGE_KEYS.JOURNAL_PREFIX.length));
      }
    }
  } catch (e) {
    console.warn('[storage] Failed to enumerate journal dates', e);
  }
  return dates;
}

/** Returns a {dateStr: entry} map for all entries in a given year+month */
function getJournalEntriesForMonth(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  const result = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEYS.JOURNAL_PREFIX)) {
        const dateStr = k.slice(STORAGE_KEYS.JOURNAL_PREFIX.length);
        if (dateStr.startsWith(prefix)) {
          try {
            const entry = JSON.parse(localStorage.getItem(k));
            if (entry) result[dateStr] = entry;
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('[storage] Failed to load entries for month', e);
  }
  return result;
}

function clearAllJournalEntries() {
  try {
    const keys = getAllJournalDates().map(d => STORAGE_KEYS.JOURNAL_PREFIX + d);
    keys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[storage] Failed to clear journal entries', e);
  }
}

/** Looks back up to 7 days for the most recent journal entry */
function getRecentJournalEntry() {
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDateKey(d);
    const entry = getJournalEntry(dateStr);
    if (entry) return entry;
  }
  return null;
}

// ── Prompt deduplication ──────────────────────────────────────────────────────

function getRecentPrompts() {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.RECENT_PROMPTS);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveRecentPrompts(prompts) {
  try {
    localStorage.setItem(STORAGE_KEYS.RECENT_PROMPTS, JSON.stringify(prompts));
  } catch (e) {
    console.warn('[storage] Failed to save recent prompts', e);
  }
}

// ── Custom activities ─────────────────────────────────────────────────────────

function getCustomActivities() {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.CUSTOM_ACTIVITIES);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function saveCustomActivities(list) {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ACTIVITIES, JSON.stringify(list));
  } catch (e) {
    console.warn('[storage] Failed to save custom activities', e);
  }
}

// ── Activity preferences ──────────────────────────────────────────────────────

function getDisabledActivities() {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.DISABLED);
    return new Set(s ? JSON.parse(s) : []);
  } catch {
    return new Set();
  }
}

function saveDisabledActivities(setObj) {
  try {
    localStorage.setItem(STORAGE_KEYS.DISABLED, JSON.stringify([...setObj]));
  } catch (e) {
    console.warn('[storage] Failed to save disabled activities', e);
  }
}

function getHiddenActivities() {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.HIDDEN);
    return new Set(s ? JSON.parse(s) : []);
  } catch {
    return new Set();
  }
}

function saveHiddenActivities(setObj) {
  try {
    localStorage.setItem(STORAGE_KEYS.HIDDEN, JSON.stringify([...setObj]));
  } catch (e) {
    console.warn('[storage] Failed to save hidden activities', e);
  }
}

// ── Quiz answers (returning-user fallback) ────────────────────────────────────

function getQuizAnswers() {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.QUIZ_ANSWERS);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function saveQuizAnswers(answers) {
  try {
    localStorage.setItem(STORAGE_KEYS.QUIZ_ANSWERS, JSON.stringify(answers));
  } catch {}
}

// ── Intentions ────────────────────────────────────────────────────────────────

function getIntention(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function saveIntention(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[storage] Failed to save intention', e);
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

function getReview(key) {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function saveReview(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[storage] Failed to save review', e);
  }
}

// ── Utility used by storage only ─────────────────────────────────────────────

function formatDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
