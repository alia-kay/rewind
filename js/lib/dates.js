/**
 * dates.js
 * Date utilities: formatting, ISO week numbers, period keys, calendar helpers.
 *
 * Exports (global functions):
 *   todayStr()                    → "YYYY-MM-DD" for today
 *   formatDateNice(dateStr)       → "Wednesday, April 4"
 *   formatDateShort(date)         → "Apr 4"
 *   getWeekNumber(date)           → ISO week number (1–53)
 *   getWeekStart(date)            → Date of the Monday starting that week
 *   getWeekKey(date)              → "intention_week_YYYY-WW"
 *   getMonthKey(year, month)      → "intention_month_YYYY-MM"
 *   getWeeksForMonth(year, month) → [{weekKey, label, weekStart}]
 *   getReviewKey(type, intentionKey) → "review_week_…" or "review_month_…"
 */

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateNice(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatDateShort(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** ISO 8601 week number */
function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

/** Monday of the ISO week containing d */
function getWeekStart(d) {
  const date = new Date(d);
  const day  = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

function getWeekKey(d) {
  return `intention_week_${d.getFullYear()}-${String(getWeekNumber(d)).padStart(2, '0')}`;
}

function getMonthKey(year, month) {
  return `intention_month_${year}-${String(month + 1).padStart(2, '0')}`;
}

/** All unique ISO weeks whose Monday falls within the given calendar month */
function getWeeksForMonth(year, month) {
  const weeks = [];
  const seen = new Set();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const wk = getWeekKey(date);
    if (!seen.has(wk)) {
      seen.add(wk);
      const ws = getWeekStart(date);
      weeks.push({ weekKey: wk, label: formatDateShort(ws), weekStart: ws });
    }
  }
  return weeks;
}

/** Converts "intention_week_YYYY-WW" → "review_week_YYYY-WW" */
function getReviewKey(type, intentionKey) {
  const suffix = intentionKey.replace(`intention_${type}_`, '');
  return `review_${type}_${suffix}`;
}

/** Build calendar cells array (nulls for empty leading slots, then 1…daysInMonth).
 *  Starts on Monday (offset = (firstDow + 6) % 7). */
function buildCalendarCells(year, month) {
  const firstDowRaw = new Date(year, month, 1).getDay();
  const firstDow    = (firstDowRaw + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}
