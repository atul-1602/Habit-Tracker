import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppUser } from './useAppUser';
import { useAppAuth } from './useAppAuth';
import { useSettings } from './useSettings';
import { HabitsRepository } from '../database/repositories/habits';
import { CompletionsRepository } from '../database/repositories/completions';
import { UserRepository } from '../database/repositories/users';
import { queryKeys } from '../lib/queryClient';
import { todayISO, isHabitScheduledForDate } from '../lib/dateUtils';
import { buildEveningNotificationContent } from '../lib/notificationContent';
import {
  scheduleOrCancelEveningCheckIn,
  rescheduleInactivityNudge,
  cancelInactivityNudge,
} from './useNotifications';
import { Habit } from '../domain/types';

/**
 * Orchestrates the two "smart" local notifications — the evening
 * incomplete-habit check-in (with streak-risk framing folded in) and the
 * inactivity nudge — by fetching whatever's needed (via the existing
 * repositories/query cache, no new backend routes) and handing the result
 * to `useNotifications.ts`'s scheduling primitives.
 *
 * Call `recomputeEveningCheckIn()` after anything that could change what's
 * incomplete today: a completion toggle, habit create/update/archive, or
 * the app coming to the foreground. Call `recomputeInactivityNudge()` on
 * every app foreground (and whenever its setting is toggled).
 */
export function useSmartNotifications() {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const qc = useQueryClient();
  const { settings } = useSettings();

  // Clerk's `getToken` (and, in principle, the query client) aren't
  // guaranteed to be the same function/object reference across renders.
  // Reading them through a ref — updated on every render, but never
  // included in a dependency array — keeps `recomputeEveningCheckIn`/
  // `recomputeInactivityNudge` referentially stable across re-renders.
  // Without this, a `useEffect` elsewhere that depends on these callbacks
  // (see app/_layout.tsx's app-foreground effect) would re-run on nearly
  // every render of anything that also calls `useSettings()` — which is
  // most of the app, since flipping any setting replaces the whole
  // settings object — repeatedly re-fetching/re-scheduling and spamming
  // `console.error` (visible as a LogBox warning banner) on any transient
  // failure.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;
  const qcRef = useRef(qc);
  qcRef.current = qc;

  const recomputeEveningCheckIn = useCallback(async () => {
    const userId = user?.id;
    if (!userId) return;

    if (!settings.remindersEnabled) {
      await scheduleOrCancelEveningCheckIn(null);
      return;
    }

    const token = await getTokenRef.current();
    const today = todayISO();

    const [habits, completionMap] = await Promise.all([
      qcRef.current.fetchQuery({
        queryKey: queryKeys.habits.all(userId),
        queryFn: () => HabitsRepository.getHabits(token),
      }),
      qcRef.current.fetchQuery({
        queryKey: queryKeys.completions.day(userId, today),
        queryFn: () => CompletionsRepository.getCompletionsForDate(today, token),
      }),
    ]);

    const incomplete = (habits as Habit[]).filter(
      (h) => !h.archived && isHabitScheduledForDate(h, today) && !completionMap[h.id]
    );

    if (incomplete.length === 0) {
      await scheduleOrCancelEveningCheckIn(null);
      return;
    }

    let streaksByHabitId: Record<string, number> = {};
    if (settings.streakAlerts) {
      const results = await Promise.all(
        incomplete.map((h) =>
          UserRepository.getHabitStats(h.id, token)
            .then((s) => [h.id, s.current_streak] as const)
            // A single habit's stats failing to load shouldn't block the
            // whole notification — just treat it as "no streak" for ranking.
            .catch(() => [h.id, 0] as const)
        )
      );
      streaksByHabitId = Object.fromEntries(results);
    }

    const content = buildEveningNotificationContent(incomplete, streaksByHabitId, settings.streakAlerts);
    await scheduleOrCancelEveningCheckIn(content);
    // getToken/qc are intentionally read via refs above, not listed here —
    // see the comment on getTokenRef/qcRef for why.
  }, [user?.id, settings.remindersEnabled, settings.streakAlerts]);

  const recomputeInactivityNudge = useCallback(async () => {
    if (!user?.id) return;
    if (settings.inactivityNudgeEnabled) {
      await rescheduleInactivityNudge();
    } else {
      await cancelInactivityNudge();
    }
  }, [user?.id, settings.inactivityNudgeEnabled]);

  return { recomputeEveningCheckIn, recomputeInactivityNudge };
}
