import { Habit } from '../domain/types';

export interface NotificationContent {
  title: string;
  body: string;
}

const DEFAULT_STREAK_THRESHOLD = 3;

/**
 * Builds the evening check-in notification's content, or `null` if nothing
 * needs saying (the caller already filtered `incompleteHabits` down to
 * habits that are both scheduled for today and not yet completed).
 *
 * Pure function — no hooks, no I/O — so it's easy to reason about/test on
 * its own. The actual data fetching (habits, completions, streaks) and OS
 * scheduling live in `src/hooks/useSmartNotifications.ts` and
 * `src/hooks/useNotifications.ts` respectively.
 *
 * Priority: if streak alerts are enabled and any incomplete habit has a
 * streak at or above the threshold, that message wins outright (more
 * specific and higher-stakes than a generic "N habits open" — never send
 * both for the same evening slot).
 */
export function buildEveningNotificationContent(
  incompleteHabits: Habit[],
  streaksByHabitId: Record<string, number>,
  streakAlertsEnabled: boolean,
  streakThreshold: number = DEFAULT_STREAK_THRESHOLD
): NotificationContent | null {
  if (incompleteHabits.length === 0) return null;

  if (streakAlertsEnabled) {
    const atRisk = incompleteHabits
      .filter((h) => (streaksByHabitId[h.id] ?? 0) >= streakThreshold)
      .sort((a, b) => (streaksByHabitId[b.id] ?? 0) - (streaksByHabitId[a.id] ?? 0))[0];

    if (atRisk) {
      const streak = streaksByHabitId[atRisk.id];
      return {
        title: `${streak}-day streak at risk! 🔥`,
        body: `Your ${atRisk.emoji} ${atRisk.name} streak is on the line — log it before midnight.`,
      };
    }
  }

  if (incompleteHabits.length === 1) {
    const h = incompleteHabits[0];
    return {
      title: 'Still time today',
      body: `You haven't logged ${h.emoji} ${h.name} today.`,
    };
  }

  return {
    title: 'Still time today',
    body: `${incompleteHabits.length} habits still open today.`,
  };
}
