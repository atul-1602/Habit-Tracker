import { useQuery } from '@tanstack/react-query';
import { useAppUser } from './useAppUser';
import { useAppAuth } from './useAppAuth';
import { AchievementsRepository } from '../database/repositories/achievements';
import { queryKeys } from '../lib/queryClient';

// ──────────────────────────────────────────────────────────
// useAchievements – All achievements with locked/unlocked status
// ──────────────────────────────────────────────────────────
export function useAchievements() {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.achievements.withStatus(userId),
    queryFn: async () => AchievementsRepository.getAchievements(await getToken()),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Achievements change rarely
  });
}
