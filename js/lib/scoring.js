/**
 * scoring.js
 * Activity recommendation scoring engine and intention boost logic.
 *
 * Exports:
 *   ACTIVITIES          — full activity library array (18 built-in)
 *   QUESTIONS           — 5-question quiz definition
 *   TIME_HOURS          — time value → hours map
 *   WHY_MAP             — contextual "why" strings per activity
 *   ENERGY_LABELS       — energy value → display label
 *   INTENTION_KEYWORD_RULES — rules for intention → activity boost
 *   EMOJI_GRID          — 24 emoji for AddActivity modal
 *   scoreActivity(activity, answers, boosts)
 *   getRecommendations(answers, customList, boosts, disabled, hidden, intentionBoosts)
 *   generateWhy(activity, answers)
 *   getBestWhen(activity)
 *   getJournalBoosts(journalText)
 *   getIntentionBoosts()
 */

const QUESTIONS = [
  {
    id: 'energy',
    q: "How's your body feeling right now?",
    options: [
      { value: 'drained',  emoji: '🪫', label: 'Completely drained' },
      { value: 'tired',    emoji: '😴', label: 'Tired but okay' },
      { value: 'neutral',  emoji: '😐', label: 'Neutral' },
      { value: 'good',     emoji: '✨', label: 'Surprisingly good' },
    ],
  },
  {
    id: 'mental',
    q: "How's your head tonight?",
    options: [
      { value: 'overstimulated', emoji: '🌀', label: "Overstimulated / can't stop thinking" },
      { value: 'foggy',          emoji: '🌫️',  label: 'Foggy and kind of blank' },
      { value: 'clear',          emoji: '🙂', label: 'Clear enough' },
    ],
  },
  {
    id: 'social',
    q: 'Do you want to include your husband?',
    options: [
      { value: 'together', emoji: '💑', label: "Yes, let's do something together" },
      { value: 'solo',     emoji: '👤', label: 'I need some solo time' },
      { value: 'either',   emoji: '🤷', label: 'Either works for me' },
    ],
  },
  {
    id: 'creative',
    q: 'Any urge to make or create something?',
    options: [
      { value: 'hands',   emoji: '🎨', label: 'Yes — I want to use my hands' },
      { value: 'absorb',  emoji: '📖', label: 'No — I want to absorb something' },
      { value: 'zoneout', emoji: '🌀', label: 'I just want to zone out a little' },
    ],
  },
  {
    id: 'time',
    q: 'How much time do you have?',
    options: [
      { value: '1hr', emoji: '⚡',  label: 'About 1 hour' },
      { value: '2hr', emoji: '🌙',  label: 'About 2 hours' },
      { value: '3hr', emoji: '🌌',  label: 'The full 3 hours' },
    ],
  },
];

const ACTIVITIES = [
  {
    id: 'series', name: 'Watch a series', emoji: '📺',
    description: "Sink into a show you love — or finally start one you've been saving. A great series is one of life's quiet pleasures.",
    starter: "Try something comforting you've already seen before, or start a buzzy new drama. The rule: something you're actually excited about, not just whatever's queued.",
    social: ['solo', 'together', 'either'], creative: ['zoneout', 'absorb'],
    energy: ['drained', 'tired', 'neutral', 'good'], mental: ['foggy', 'clear'], minTime: 0.75,
    picks: [
      { title: 'Fleabag',         note: 'Short, brilliant, painfully funny. Two seasons, done.' },
      { title: 'The Bear',        note: 'Intense and beautiful. Each episode is under 30 min.' },
      { title: 'Severance',       note: 'Wildly original — impossible to stop watching.' },
      { title: 'The White Lotus', note: 'Gorgeous, sharp, great for watching with someone.' },
      { title: 'Beef',            note: 'Only 10 episodes. Funny, dark, deeply human.' },
    ],
  },
  {
    id: 'fiction', name: 'Read fiction', emoji: '📚',
    description: "Disappear into another world entirely. Fiction is one of the best ways to quiet an active mind and feed a dormant one.",
    starter: "Grab whatever you're in the middle of, or pick a short story collection if you can't commit. Even 30 pages is a real gift to yourself.",
    social: ['solo', 'either'], creative: ['absorb'],
    energy: ['drained', 'tired', 'neutral', 'good'], mental: ['foggy', 'overstimulated', 'clear'], minTime: 0.5,
  },
  {
    id: 'nonfiction', name: 'Read non-fiction', emoji: '🧠',
    description: "One chapter of something you're genuinely curious about — not self-help you feel obligated to read, but something that actually interests you.",
    starter: "Keep it to one chapter and let yourself stop when you're full. Non-fiction is best without pressure.",
    social: ['solo', 'either'], creative: ['absorb'],
    energy: ['neutral', 'good'], mental: ['clear'], minTime: 0.5,
  },
  {
    id: 'clay', name: 'Make something with clay', emoji: '🏺',
    description: "Therapeutic, tactile, completely absorbing. Working with your hands is one of the fastest ways out of your head.",
    starter: "No plan needed — just start with a small pinch pot and let your hands figure it out. The process is the whole point.",
    social: ['solo', 'either'], creative: ['hands'],
    energy: ['tired', 'neutral', 'good'], mental: ['overstimulated', 'clear'], minTime: 0.5,
  },
  {
    id: 'podcast', name: 'Listen to a podcast', emoji: '🎧',
    description: "Something interesting or funny in your ears while you do literally nothing else. Guilt-free, low-effort, and often surprisingly comforting.",
    starter: "Try a long-form interview: Conan O'Brien Needs a Friend, Armchair Expert, or Lex Fridman. Or whatever comfort topic you love.",
    social: ['solo', 'either'], creative: ['absorb', 'zoneout'],
    energy: ['drained', 'tired', 'neutral', 'good'], mental: ['foggy', 'clear'], minTime: 0.5,
  },
  {
    id: 'interview', name: 'Watch a long interview', emoji: '🎙️',
    description: "Long-form conversation with someone fascinating feels like eavesdropping on the best dinner party. Absorbing without being demanding.",
    starter: "YouTube: Hot Ones, Diary of a CEO, or 80,000 Hours podcast videos. Pick someone who genuinely interests you, not just someone you feel you should watch.",
    social: ['solo', 'either'], creative: ['absorb'],
    energy: ['tired', 'neutral', 'good'], mental: ['foggy', 'clear'], minTime: 0.75,
  },
  {
    id: 'husband-games', name: 'Watch your husband play video games', emoji: '🎮',
    description: "Cozy up together with zero pressure to participate. Just vibes, easy commentary, and quiet company.",
    starter: "Get your snacks sorted and ask him to pick something cinematic or story-driven — games are so much better to watch that way.",
    social: ['together', 'either'], creative: ['zoneout'],
    energy: ['drained', 'tired', 'neutral'], mental: ['foggy', 'overstimulated'], minTime: 0.5,
  },
  {
    id: 'board-games', name: 'Play a board game', emoji: '🎲',
    description: "Actual quality time with your husband — laughing, competing a little, being genuinely playful together. Underrated as a date night.",
    starter: "Keep it light: Ticket to Ride, Codenames, Exploding Kittens, or even just a card game. Set a timer so it doesn't drag.",
    social: ['together'], creative: ['absorb', 'hands'],
    energy: ['neutral', 'good'], mental: ['clear'], minTime: 1,
  },
  {
    id: 'movie', name: 'Watch a movie with your husband', emoji: '🎬',
    description: "A proper movie night — not half-watching while on your phones, but actually sitting down together with snacks for something good.",
    starter: "Take turns picking. Go for something 90–100 minutes max — comedy or thriller tend to hold attention best after a long day.",
    social: ['together'], creative: ['absorb', 'zoneout'],
    energy: ['drained', 'tired', 'neutral', 'good'], mental: ['foggy', 'clear'], minTime: 1.5,
    picks: [
      { title: 'Knives Out',                         note: 'Clever, funny, extremely watchable. Both of you will enjoy it.' },
      { title: 'Past Lives',                         note: 'Quiet and beautiful. Perfect for a calm evening together.' },
      { title: 'Everything Everywhere All at Once',  note: 'Wild, emotional, impossible to predict.' },
      { title: 'The Banshees of Inisherin',          note: 'Strange and sad in the best way — great conversation starter.' },
      { title: 'A Quiet Place',                      note: 'Tense and short. Great for when you want something gripping.' },
    ],
  },
  {
    id: 'yoga', name: 'Gentle yoga or stretching', emoji: '🧘‍♀️',
    description: "Your body has been in mom-mode all day. A slow, gentle stretch session will unwind the tension you didn't even know you were carrying.",
    starter: "Search YouTube for 'evening yoga for tired moms' or 'yin yoga 30 minutes.' Adriene Mishler's channel is free and perfect for this.",
    social: ['solo', 'either'], creative: ['zoneout', 'absorb'],
    energy: ['drained', 'tired', 'neutral'], mental: ['overstimulated', 'foggy', 'clear'], minTime: 0.5,
  },
  {
    id: 'journal', name: 'Journal with a prompt', emoji: '✍️',
    description: "Five focused minutes to empty your head onto paper. You don't need to be a 'journal person' — just let the words come without editing.",
    starter: '"What am I actually feeling right now?" / "What was one beautiful thing today?" / "What do I need more of this week?" Pick one and go.',
    social: ['solo', 'either'], creative: ['hands'],
    energy: ['drained', 'tired', 'neutral', 'good'], mental: ['overstimulated', 'foggy', 'clear'], minTime: 0.25,
  },
  {
    id: 'doodle', name: 'Sketchbook doodling', emoji: '🎨',
    description: "No goal, no skill required — just a pen and paper. Doodling is meditative in the best way: your hands stay busy, your mind slows down.",
    starter: "Fill a page with one repeated shape, draw something in front of you, or follow your pen wherever it goes. Put on music. Disappear.",
    social: ['solo', 'either'], creative: ['hands'],
    energy: ['tired', 'neutral', 'good'], mental: ['overstimulated', 'clear'], minTime: 0.5,
  },
  {
    id: 'learn', name: 'Learn something tiny', emoji: '🌱',
    description: "A short Duolingo session, a YouTube explainer, a Wikipedia spiral on something that genuinely interests you. Feed your brain in a good way.",
    starter: "One thing only: five minutes of Duolingo, one explainer video you've been meaning to watch, or a single Brilliant lesson. Start small.",
    social: ['solo', 'either'], creative: ['absorb'],
    energy: ['tired', 'neutral', 'good'], mental: ['clear'], minTime: 0.25,
  },
  {
    id: 'bath', name: 'Long bath + podcast or audiobook', emoji: '🛁',
    description: "The most restorative combination: warm water, something interesting in your ears, and no one who needs anything from you.",
    starter: "Run it hot, bring a drink, and queue up your podcast before you get in. Lock the door. Minimum 30 minutes — you've earned it.",
    social: ['solo', 'either'], creative: ['absorb', 'zoneout'],
    energy: ['drained', 'tired'], mental: ['overstimulated', 'foggy', 'clear'], minTime: 0.5,
  },
  {
    id: 'baking', name: 'Bake or cook something enjoyable', emoji: '🍪',
    description: "Not meal prep — something you actually want to eat. Warm cookies, a little pasta, a fancy snack board. The making is the point.",
    starter: "Keep it simple: brown butter cookies, fancy avocado toast, or just make yourself a proper warm drink and snack situation. Put music on.",
    social: ['solo', 'together', 'either'], creative: ['hands'],
    energy: ['neutral', 'good'], mental: ['clear', 'foggy'], minTime: 0.75,
  },
  {
    id: 'documentary', name: 'Watch a documentary', emoji: '🎥',
    description: "The best kind of screen time — you finish it feeling like you went somewhere and actually learned something.",
    starter: "Netflix and Apple TV are full of great ones. Try something on nature, food, a fascinating person, or a place you've always wanted to visit.",
    social: ['solo', 'together', 'either'], creative: ['absorb'],
    energy: ['tired', 'neutral', 'good'], mental: ['foggy', 'clear'], minTime: 1,
  },
  {
    id: 'walk', name: 'An evening walk', emoji: '🚶‍♀️',
    description: "Fresh air, movement, a change of scene. Sometimes getting outside — even just around the block — completely resets your evening.",
    starter: "Put on a podcast or your favorite playlist, grab a jacket, and walk for 20–30 minutes. No destination needed. Just move.",
    social: ['solo', 'together', 'either'], creative: ['zoneout', 'absorb'],
    energy: ['tired', 'neutral', 'good'], mental: ['overstimulated', 'foggy', 'clear'], minTime: 0.5,
  },
  {
    id: 'write', name: 'Write something', emoji: '📝',
    description: "A journal entry, a letter, a memory you want to keep. Writing for yourself — no audience, no purpose — is quietly restorative.",
    starter: "Try writing a letter to your toddler they'll read someday. Describe what they're like right now: a laugh, a word they mispronounce, a thing they love.",
    social: ['solo', 'either'], creative: ['hands', 'absorb'],
    energy: ['tired', 'neutral', 'good'], mental: ['clear', 'overstimulated'], minTime: 0.5,
  },
];

const TIME_HOURS = { '1hr': 1, '2hr': 2, '3hr': 3 };

const ENERGY_LABELS = {
  drained: 'completely drained',
  tired:   'tired but okay',
  neutral: 'feeling neutral',
  good:    'surprisingly good',
};

const EMOJI_GRID = [
  '📖','🛁','🎨','🧵','🎲','🎵','🌿','✍️',
  '🍵','🧘','🎬','🎧','🌙','🖊️','🍪','🧩',
  '💌','🏃','🪴','🎹','📷','🗺️','🧁','🕯️',
];

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreActivity(activity, answers, boosts = null) {
  const { energy, mental, social, creative, time } = answers;
  const timeHours = TIME_HOURS[time];
  let score = 0;

  if (activity.minTime > timeHours) return -999;
  if (!activity.energy.includes(energy)) return -999;

  if (social === 'together' && !activity.social.includes('together') && !activity.social.includes('either')) return -999;
  if (social === 'solo' && activity.social.length === 1 && activity.social[0] === 'together') return -999;

  if (energy === 'drained') {
    if (['board-games','baking','write','learn','documentary','nonfiction','walk'].includes(activity.id)) return -999;
    if (['bath','yoga','series','podcast','fiction','journal','husband-games'].includes(activity.id)) score += 20;
  }

  if (activity.mental.includes(mental)) score += 12; else score -= 18;

  if (mental === 'overstimulated') {
    if (['clay','yoga','doodle','bath','journal'].includes(activity.id))              score += 28;
    if (['nonfiction','learn','board-games','interview'].includes(activity.id))       score -= 20;
  }
  if (mental === 'foggy') {
    if (['podcast','husband-games','series','bath','yoga'].includes(activity.id))     score += 22;
    if (['nonfiction','learn','write','clay','doodle','board-games'].includes(activity.id)) score -= 16;
  }
  if (mental === 'clear') {
    if (['nonfiction','learn','write','documentary','board-games','baking'].includes(activity.id)) score += 15;
  }

  if (activity.creative.includes(creative)) score += 22; else score -= 12;

  if (creative === 'hands') {
    if (['clay','baking','doodle','write','journal'].includes(activity.id)) score += 22;
  }
  if (creative === 'absorb') {
    if (['fiction','nonfiction','podcast','interview','documentary','learn'].includes(activity.id)) score += 18;
  }
  if (creative === 'zoneout') {
    if (['series','husband-games','yoga','bath','podcast','walk','movie'].includes(activity.id)) score += 18;
    if (['clay','write','journal','doodle','learn','baking'].includes(activity.id))              score -= 12;
  }

  if (social === 'together') {
    if (['movie','board-games','husband-games','baking','documentary','walk','series'].includes(activity.id)) score += 14;
  }
  if (social === 'solo') {
    if (['bath','fiction','podcast','journal','clay','doodle','yoga'].includes(activity.id)) score += 6;
  }

  if (boosts) {
    if (boosts.solo     > 0 && (activity.social.includes('solo')    || activity.social.includes('either'))) score += boosts.solo;
    if (boosts.together > 0 && (activity.social.includes('together')|| activity.social.includes('either'))) score += boosts.together;
    if (boosts.hands    > 0 && activity.creative.includes('hands'))                                          score += boosts.hands;
    if (boosts.lowStim  > 0 && ['bath','yoga','fiction','journal','podcast','series'].includes(activity.id)) score += boosts.lowStim;
  }

  return score;
}

function getRecommendations(answers, customList = [], boosts = null, disabled = new Set(), hidden = new Set(), intentionBoosts = null) {
  try {
    return [...ACTIVITIES.filter(a => !hidden.has(a.id)), ...customList]
      .filter(a => !disabled.has(a.id))
      .map(a => {
        let score = scoreActivity(a, answers, boosts);
        if (score > -999 && intentionBoosts && intentionBoosts.idBoosts[a.id]) {
          score += intentionBoosts.idBoosts[a.id];
        }
        return { ...a, score };
      })
      .filter(a => a.score > -999)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  } catch (e) {
    console.warn('[scoring] getRecommendations failed, returning unscored list', e);
    return [...ACTIVITIES.filter(a => !hidden.has(a.id)), ...customList]
      .filter(a => !disabled.has(a.id))
      .slice(0, 3);
  }
}

// ── Why text ──────────────────────────────────────────────────────────────────

const WHY_MAP = {
  clay:           { overstimulated: "Your mind is buzzing — working with your hands will quiet it faster than any screen can.", foggy: "Clay doesn't need you to think. Just feel the material and let your hands figure it out.", default: "There's something about making a physical thing that screens can never replicate." },
  yoga:           { drained: "You're drained — your body needs gentle movement more than rest alone. This will help you sleep better too.", overstimulated: "Movement and breath are the fastest reset for an overstimulated nervous system.", default: "Your body carried a lot today. Give it the gentle release it's been waiting for." },
  bath:           { drained: "You're running on empty. Warm water and zero demands is exactly the right prescription tonight.", overstimulated: "Hot water has a way of dissolving thoughts that have been running too fast.", default: "A bath with something good in your ears hits different when you actually need it." },
  series:         { foggy: "When your brain is foggy, something episodic is perfect — low commitment, easy to follow.", drained: "You don't have to do anything. Just let it play.", together: "Side by side on the couch with something good on — honestly one of the best evenings.", default: "A good show is one of the simplest pleasures. You don't have to justify it." },
  podcast:        { overstimulated: "Audio-only gives your eyes a rest while your ears have somewhere gentle to go.", foggy: "A good podcast carries you along without requiring anything back from you.", default: "Put something good in your ears and let someone else do the thinking for a while." },
  'husband-games':{ overstimulated: "Being near someone without having to talk is sometimes exactly what you need when you're overstimulated.", foggy: "Easy, low-demand company. Together without needing to perform.", default: "Quiet company and zero pressure to participate. Sometimes that's the perfect evening." },
  'board-games':  { good: "You have the energy to be fully present and actually have fun with this.", clear: "Your head is clear enough to actually enjoy a game — and laugh about it.", default: "Real quality time — laughing and being playful together. Underrated as a date night." },
  movie:          { together: "A proper movie night is a small act of choosing each other for the evening.", drained: "You don't need to do anything — just show up with snacks and let the story carry you.", default: "Sometimes the best evening is a good film and someone next to you on the couch." },
  fiction:        { overstimulated: "Fiction pulls you into someone else's world entirely — one of the best escapes from an overactive mind.", foggy: "A story will carry you when you can't generate your own momentum.", drained: "Reading is gentle enough for even a depleted evening. Let the story do the work.", default: "Disappearing into a book is one of the oldest forms of rest." },
  documentary:    { clear: "You have the headspace to actually absorb something interesting tonight.", foggy: "A good documentary does all the work — you just follow along.", together: "Watching something real and interesting together is quietly good for a relationship.", default: "You'll finish it feeling like you actually went somewhere." },
  journal:        { overstimulated: "Getting the noise in your head onto paper is one of the fastest ways to actually quiet it.", foggy: "Sometimes you don't know what you're feeling until you write it down.", default: "Five minutes with a prompt can clear mental clutter that otherwise follows you to bed." },
  doodle:         { overstimulated: "Your hands work, your brain gets to slow down. Doodling is a surprisingly fast route to calm.", default: "No rules, no goal — just the quiet pleasure of putting marks on paper." },
  learn:          { clear: "You have the clarity tonight to actually absorb something and enjoy it.", good: "You have the energy for it, and your brain will thank you.", default: "A tiny bit of intentional learning for yourself — not work, not parenting. Just you." },
  baking:         { good: "You have the energy for it, and you get to eat something warm at the end.", together: "Cooking together is underrated couple time: side by side, music on, something delicious coming.", clear: "You have the headspace to enjoy the process — which is half the point.", default: "Making something you'll eat is one of the more satisfying ways to spend an evening hour." },
  walk:           { overstimulated: "Getting outside and moving is one of the fastest resets for an overstimulated mind.", together: "An evening walk together is a quiet, underrated way to reconnect.", default: "Sometimes fresh air and a change of scene is all you need to feel like yourself again." },
  write:          { overstimulated: "Writing slows the noise down. Getting things out of your head and onto the page actually works.", clear: "You have the clarity tonight to write something real — maybe something you'll want to keep.", default: "Writing for yourself — no audience, no purpose — is quietly restorative." },
  nonfiction:     { clear: "Your head is clear enough to actually absorb something and enjoy it.", good: "You have the energy tonight to actually retain what you read.", default: "One chapter of something genuinely interesting feels like a gift to yourself." },
  interview:      { foggy: "A good long-form conversation pulls you in without demanding anything back.", default: "Let someone fascinating think out loud while you listen. It's oddly comforting." },
};

function generateWhy(activity, answers) {
  const { energy, mental, social } = answers;
  const m = WHY_MAP[activity.id];
  if (!m) return "This feels right for where you are tonight.";
  return m[mental] || m[energy] || m[social] || m['default'] || "This feels right for where you are tonight.";
}

function getBestWhen(activity) {
  const points = [];
  const { energy: e, mental: m, social: s } = activity;

  if (e.includes('drained') && e.includes('tired') && !e.includes('good') && !e.includes('neutral')) {
    points.push("You're physically drained or running on empty");
  } else if (!e.includes('drained') && !e.includes('tired')) {
    points.push("You have some energy and the headspace to engage");
  } else {
    points.push("Most energy levels — tired to surprisingly good");
  }

  if (m.includes('overstimulated') && !m.includes('clear')) {
    points.push("Your mind is buzzing and you need to slow down");
  } else if (!m.includes('overstimulated') && m.includes('clear') && !m.includes('foggy')) {
    points.push("Your head is clear enough to fully enjoy it");
  } else if (m.length === 1 && m[0] === 'foggy') {
    points.push("You're feeling blank or low on motivation");
  } else {
    points.push("Any headspace — foggy, clear, or somewhere in between");
  }

  const soloOk     = s.includes('solo')    || s.includes('either');
  const togetherOk = s.includes('together') || s.includes('either');
  if (soloOk && togetherOk)  points.push("Solo or with your husband — either works");
  else if (togetherOk)       points.push("You want to spend the evening with your husband");
  else                       points.push("You want some uninterrupted time to yourself");

  return points;
}

// ── Journal keyword boosts ────────────────────────────────────────────────────

function getJournalBoosts(journalText) {
  const text = (journalText || '').toLowerCase();
  let solo = 0, together = 0, hands = 0, lowStim = 0;
  const influences = [];

  if (/exhausted|drained|tired|overwhelmed|depleted/.test(text)) {
    solo += 15; lowStim += 15;
    influences.push("You mentioned feeling drained — we leaned toward gentler, solo activities.");
  }
  if (/lonely|miss|husband|together|just us/.test(text)) {
    together += 15;
    influences.push("You mentioned wanting connection — we leaned toward activities you can share.");
  }
  if (/creative|make|build|craft|hands|create/.test(text)) {
    hands += 15;
    influences.push("You mentioned wanting to create — we boosted hands-on activities.");
  }
  if (/quiet|peace|calm|breathe|stillness|rest/.test(text)) {
    lowStim += 15;
    influences.push("You mentioned needing quiet — we weighted toward calmer activities.");
  }

  return { solo, together, hands, lowStim, influence: influences.length > 0 ? influences.join(' · ') : null };
}

// ── Intention keyword boosts ──────────────────────────────────────────────────

const INTENTION_KEYWORD_RULES = [
  { pattern: /creativit|creat|make|art|draw|writ|craft/, ids: ['clay','doodle','write','baking','journal'],           theme: 'creativity' },
  { pattern: /movement|sport|activ|exercise|body|walk|yoga/, ids: ['yoga','walk'],                                    theme: 'movement' },
  { pattern: /growth|learn|read|knowledge|understand|improv/, ids: ['nonfiction','podcast','learn','interview','documentary'], theme: 'learning' },
  { pattern: /connection|people|together|husband|social|family/, ids: ['board-games','movie','husband-games','baking','walk'], theme: 'connection' },
  { pattern: /rest|slow|quiet|calm|recharge|peace|unwind/, ids: ['bath','yoga','fiction','podcast','series'],         theme: 'rest' },
  { pattern: /presence|mindful|aware|here|ground/, ids: ['journal','yoga','walk','bath'],                             theme: 'presence' },
];

function getIntentionBoosts() {
  const now = new Date();
  const weekKey  = getWeekKey(now);
  const monthKey = getMonthKey(now.getFullYear(), now.getMonth());

  const weekInt  = getIntention(weekKey);
  const monthInt = getIntention(monthKey);

  if (!weekInt && !monthInt) return null;

  const textParts = [];
  if (weekInt)  { if (weekInt.sentence)  textParts.push(weekInt.sentence);  (weekInt.items  || []).forEach(it => textParts.push(it.text || '')); (weekInt.focusWords  || []).forEach(w => textParts.push(w)); }
  if (monthInt) { if (monthInt.sentence) textParts.push(monthInt.sentence); (monthInt.items || []).forEach(it => textParts.push(it.text || '')); (monthInt.focusWords || []).forEach(w => textParts.push(w)); }

  const text = textParts.join(' ').toLowerCase();
  if (!text.trim()) return null;

  const idBoosts = {};
  const firedThemes = [];

  INTENTION_KEYWORD_RULES.forEach(rule => {
    if (rule.pattern.test(text)) {
      firedThemes.push(rule.theme);
      rule.ids.forEach(id => { idBoosts[id] = (idBoosts[id] || 0) + 12; });
    }
  });

  const focusWords = [...(weekInt?.focusWords || []), ...(monthInt?.focusWords || [])];
  if (Object.keys(idBoosts).length === 0) return null;
  return { idBoosts, themes: firedThemes, focusWords };
}
