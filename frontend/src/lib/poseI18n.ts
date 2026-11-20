import type { Pose } from '../api/client';
import type { Language } from '../i18n';

/**
 * Returns the localized "how to do" steps for a pose.
 */
export function getPoseSteps(pose: Pose, lang: Language): string[] {
  if (lang === 'en') return pose.how_to_en ?? pose.how_to;
  if (lang === 'hi') return pose.how_to_hi ?? pose.how_to;
  return pose.how_to; // hinglish default
}

/**
 * Returns the localized caution text for a pose.
 */
export function getPoseCaution(pose: Pose, lang: Language): string {
  if (lang === 'en') return pose.caution_en ?? pose.caution;
  if (lang === 'hi') return pose.caution_hi ?? pose.caution;
  return pose.caution; // hinglish default
}

/**
 * Returns the primary display name. English → English name. Hindi → Hindi name. Hinglish → hinglish_name.
 */
export function getPoseName(pose: Pose, lang: Language): string {
  if (lang === 'en') return pose.english_name;
  if (lang === 'hi') return pose.hindi_name;
  return pose.hinglish_name ?? `${pose.english_name} (${pose.hindi_name})`;
}

/**
 * Returns the secondary/subtitle name shown below the primary name.
 */
export function getPoseSubtitle(pose: Pose, lang: Language): string {
  if (lang === 'en') return pose.hindi_name;
  if (lang === 'hi') return pose.english_name;
  return pose.hindi_name; // hinglish: show Hindi name as subtitle
}
