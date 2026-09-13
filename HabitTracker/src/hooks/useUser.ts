import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppUser } from './useAppUser';
import { useAppAuth } from './useAppAuth';
import { UserRepository } from '../database/repositories/users';
import { queryKeys } from '../lib/queryClient';
import { UserProfile } from '../domain/types';

// ──────────────────────────────────────────────────────────
// useUserProfile – Current user's profile from database
// ──────────────────────────────────────────────────────────
export function useUserProfile() {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';
  const displayName = user?.fullName || user?.firstName || user?.username || '';

  return useQuery({
    queryKey: queryKeys.user.profile(userId),
    queryFn: async (): Promise<UserProfile> => {
      return UserRepository.getProfile(await getToken(), displayName);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // Profile changes rarely, cache 2 min
  });
}

// ──────────────────────────────────────────────────────────
// useUpdateProfile – Update display name or avatar
// ──────────────────────────────────────────────────────────
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) =>
      UserRepository.updateProfile(updates, await getToken()),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user.profile(userId) });
    },
  });
}
