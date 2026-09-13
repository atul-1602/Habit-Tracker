// ──────────────────────────────────────────────────────────────
// App-Wide Constants
// ──────────────────────────────────────────────────────────────

// Must match Clerk Dashboard → User & Authentication → Email, Phone,
// Username → Password → "Minimum length". Validating client-side to this
// value (in sign-up and reset-password) avoids a round-trip to Clerk just
// to learn the password was too short.
export const MIN_PASSWORD_LENGTH = 15;

export const HABIT_CATEGORIES = [
  'Health', 'Fitness', 'Learning', 'Mindfulness',
  'Nutrition', 'Sleep', 'Creativity', 'Social', 'General',
] as const;

export const HABIT_COLORS = [
  '#FF7849', '#A855F7', '#5AC8FA', '#FF5DA2',
  '#FFD93D', '#C7F464', '#FF6B6B', '#4ECDC4',
] as const;

export const HABIT_EMOJIS = [
  '🏃', '📚', '💧', '🧘', '💪', '🥗', '😴',
  '🎯', '🎸', '🧠', '🌿', '🚴', '✍️', '🎨',
  '🏊', '☕', '🧹', '📝', '🎮', '🌅',
] as const;

export const WEEK_DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
export const WEEK_DAYS_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const WEEK_DAYS_FULL = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const;

/**
 * Human-readable repeat schedule for a habit, e.g. "Daily", "Weekdays", or
 * "Mon, Wed, Fri" for a custom schedule. Used anywhere a habit's schedule
 * needs to be shown at a glance (HabitCard, habit detail, etc).
 */
export function habitFrequencyLabel(frequency: string, frequencyDays: number[]): string {
  if (frequency === 'daily' || frequencyDays.length === 7) return 'Daily';
  if (frequency === 'weekdays') return 'Weekdays';
  if (frequencyDays.length === 0) return 'Custom';
  return frequencyDays
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEK_DAYS_ABBR[d])
    .join(', ');
}

// XP per action
export const XP_REWARDS = {
  COMPLETE_HABIT: 10,
  DAILY_ALL_COMPLETE: 50,
  HABIT_CREATED: 5,
} as const;

// Level thresholds: level = floor(sqrt(xp / 100)) + 1
export function xpForNextLevel(currentLevel: number): number {
  return Math.pow(currentLevel, 2) * 100;
}
export function xpForCurrentLevel(currentLevel: number): number {
  return Math.pow(currentLevel - 1, 2) * 100;
}
export function xpProgressInLevel(xp: number, level: number): number {
  const levelStart = xpForCurrentLevel(level);
  const levelEnd = xpForNextLevel(level);
  return (xp - levelStart) / (levelEnd - levelStart);
}

// AsyncStorage keys
export const STORAGE_KEYS = {
  ONBOARDING_COMPLETE: '@habit_tracker/onboarding_complete',
  LAST_STREAK_CHECK: '@habit_tracker/last_streak_check',
  NOTIFICATION_LOG: '@habit_tracker/notification_log',
} as const;

// Database collection/table names (single source of truth)
export const TABLES = {
  HABITS: 'habits',
  COMPLETIONS: 'habit_completions',
  PROFILES: 'user_profiles',
  ACHIEVEMENTS: 'achievements',
  USER_ACHIEVEMENTS: 'user_achievements',
} as const;
