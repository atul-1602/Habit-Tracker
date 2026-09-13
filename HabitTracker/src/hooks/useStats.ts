import { useQuery } from '@tanstack/react-query';
import { useAppUser } from './useAppUser';
import { useAppAuth } from './useAppAuth';
import { UserRepository } from '../database/repositories/users';
import { queryKeys } from '../lib/queryClient';
import { HabitStats, DailyHistoryPoint } from '../domain/types';

// ──────────────────────────────────────────────────────────
// useStats – Overall user stats (streak, completion rate, etc.)
// ──────────────────────────────────────────────────────────
export function useStats() {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery<HabitStats>({
    queryKey: queryKeys.completions.stats(userId),
    queryFn: async () => UserRepository.getOverallStats(await getToken()),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ──────────────────────────────────────────────────────────
// useHabitStats – Stats for a specific habit
// ──────────────────────────────────────────────────────────
export function useHabitStats(habitId: string) {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery<HabitStats>({
    queryKey: queryKeys.completions.habitStats(userId, habitId),
    queryFn: async () => UserRepository.getHabitStats(habitId, await getToken()),
    enabled: !!userId && !!habitId,
  });
}

// ──────────────────────────────────────────────────────────
// useStatsHistory – Daily completion history for the last `days` days,
// used to plot the Insights screen's consistency chart.
// ──────────────────────────────────────────────────────────
export function useStatsHistory(days: number, habitId?: string) {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery<DailyHistoryPoint[]>({
    queryKey: queryKeys.completions.history(userId, days, habitId),
    queryFn: async () => UserRepository.getHistory(days, await getToken(), habitId),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
