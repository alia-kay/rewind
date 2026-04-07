/**
 * stateDetection.js
 * Maps the 4 journal check-in answers to a prompt category.
 *
 * Exports:
 *   detectCategory(energy, mental, emotion, stress) → category string
 *   getContextualIntroMessage(emotion, mental, stress) → string
 */

/**
 * Priority-ordered category detection from check-in answers.
 * Falls back to 'grounding' if nothing else matches.
 */
function detectCategory(energy, mental, emotion, stress) {
  if (energy === 'drained' && mental === 'overstimulated' && stress === 'high') return 'grounding';
  if (emotion === 'anxious' || emotion === 'overwhelmed') return 'anxiety';
  if (emotion === 'sad') return 'emotional';
  if (emotion === 'irritated') return 'frustrated';
  if (emotion === 'hopeful') return 'growth';
  if ((energy === 'tired' || energy === 'drained') && mental === 'foggy') return 'foggy';
  if ((emotion === 'calm' || emotion === 'good') && mental === 'clear' && stress === 'low') return 'growth';
  // Secondary fallbacks
  if (energy === 'drained') return 'grounding';
  if (mental === 'foggy') return 'foggy';
  if (mental === 'clear' || energy === 'good') return 'growth';
  return 'grounding';
}

/** One-line contextual message shown on the transition screen before prompts */
function getContextualIntroMessage(emotion, mental, stress) {
  if (stress === 'high')                                  return "Let's slow things down a bit.";
  if (emotion === 'anxious' || emotion === 'overwhelmed') return "Let's unpack what's on your mind.";
  if (mental === 'clear')                                 return "You seem clear tonight — let's build on that.";
  return "Take a moment for yourself.";
}
