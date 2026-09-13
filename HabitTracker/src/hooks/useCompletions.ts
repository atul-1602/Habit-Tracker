import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppUser } from './useAppUser';
import { useAppAuth } from './useAppAuth';
import { useSmartNotifications } from './useSmartNotifications';
import { CompletionsRepository } from '../database/repositories/completions';
import { queryKeys } from '../lib/queryClient';
import { todayISO } from '../lib/dateUtils';

// ──────────────────────────────────────────────────────────
// useCompletions – Habit completion map for a specific date
// ──────────────────────────────────────────────────────────
export function useCompletions(date: string = todayISO()) {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.completions.day(userId, date),
    queryFn: async () => CompletionsRepository.getCompletionsForDate(date, await getToken()),
    enabled: !!userId,
  });
}

// ──────────────────────────────────────────────────────────
// useMonthCompletions – Map of 'YYYY-MM-DD' → count for calendar
// ──────────────────────────────────────────────────────────
export function useMonthCompletions(year: number, month: number) {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.completions.month(userId, year, month),
    queryFn: async () => CompletionsRepository.getMonthCompletions(year, month, await getToken()),
    enabled: !!userId,
  });
}

// ──────────────────────────────────────────────────────────
// useToggleCompletion – Toggle a habit completion with optimistic update
// ──────────────────────────────────────────────────────────
export function useToggleCompletion(date: string = todayISO()) {
  const qc = useQueryClient();
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const { recomputeEveningCheckIn } = useSmartNotifications();
  const userId = user?.id ?? '';

  return useMutation<void, Error, { habitId: string; completed: boolean }>({
    mutationFn: async ({ habitId, completed }: { habitId: string; completed: boolean }) =>
      CompletionsRepository.toggleCompletion(habitId, date, completed, await getToken()),

    onMutate: async ({ habitId, completed }) => {
      const key = queryKeys.completions.day(userId, date);
      await qc.cancelQueries({ queryKey: key });

      const previous = qc.getQueryData<Record<string, boolean>>(key);

      // Optimistic update
      qc.setQueryData<Record<string, boolean>>(key, old => ({
        ...old,
        [habitId]: completed,
      }));

      return { previous };
    },

    onError: (_err: unknown, _vars: unknown, context: any) => {
      if (context?.previous) {
        qc.setQueryData(queryKeys.completions.day(userId, date), context.previous);
      }
    },

    onSettled: () => {
      // Invalidate stats too, since streak might have changed
      qc.invalidateQueries({ queryKey: queryKeys.completions.day(userId, date) });
      qc.invalidateQueries({ queryKey: queryKeys.completions.stats(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
      // Also invalidate any cached month view(s) containing this date, so the
      // calendar's heatmap dots reflect a toggle made from the day-detail list
      // (e.g. toggling a habit for a past day didn't previously update the
      // month grid until a full remount).
      qc.invalidateQueries({ queryKey: ['completions', userId, 'month'] });

      // Only *today's* completions affect the evening check-in — toggling a
      // past/future day from the calendar doesn't change what's incomplete
      // right now.
      if (date === todayISO()) {
        recomputeEveningCheckIn().catch((e) => console.error(e));
      }
    },
  });
}
