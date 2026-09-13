import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppUser } from './useAppUser';
import { useAppAuth } from './useAppAuth';
import { HabitsRepository } from '../database/repositories/habits';
import { CreateHabitPayload, UpdateHabitPayload, Habit } from '../domain/types';
import { queryKeys } from '../lib/queryClient';
import { scheduleHabitReminder, cancelHabitReminder } from './useNotifications';
import { useSmartNotifications } from './useSmartNotifications';

// ──────────────────────────────────────────────────────────
// useHabits – Fetch all active habits for the current user
// ──────────────────────────────────────────────────────────
export function useHabits() {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.habits.all(userId),
    queryFn: async () => HabitsRepository.getHabits(await getToken()),
    enabled: !!userId,
  });
}

// ──────────────────────────────────────────────────────────
// useHabit – Fetch a single habit by ID
// ──────────────────────────────────────────────────────────
export function useHabit(habitId: string) {
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: queryKeys.habits.detail(userId, habitId),
    queryFn: async () => HabitsRepository.getHabitById(habitId, await getToken()),
    enabled: !!habitId && !!userId,
  });
}

// ──────────────────────────────────────────────────────────
// useCreateHabit – Create a new habit with optimistic update
// ──────────────────────────────────────────────────────────
export function useCreateHabit() {
  const qc = useQueryClient();
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const { recomputeEveningCheckIn } = useSmartNotifications();
  const userId = user?.id ?? '';

  return useMutation<Habit, Error, Omit<CreateHabitPayload, 'user_id'>, { previous?: Habit[]; tempId: string }>({
    mutationFn: async (payload: Omit<CreateHabitPayload, 'user_id'>) =>
      HabitsRepository.createHabit(payload, await getToken()),

    onMutate: async (newHabit) => {
      // Cancel any outgoing fetches
      await qc.cancelQueries({ queryKey: queryKeys.habits.all(userId) });

      // Snapshot the previous value
      const previous = qc.getQueryData<Habit[]>(queryKeys.habits.all(userId));

      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        user_id: userId,
        name: (newHabit as any).name ?? '',
        emoji: (newHabit as any).emoji ?? '⚡',
        color: (newHabit as any).color ?? '#C7F464',
        category: (newHabit as any).category ?? 'Health',
        frequency: (newHabit as any).frequency ?? 'daily',
        frequency_days: (newHabit as any).frequency_days ?? [0,1,2,3,4,5,6],
        reminder_enabled: (newHabit as any).reminder_enabled ?? false,
        reminder_time: (newHabit as any).reminder_time ?? null,
        sort_order: (newHabit as any).sort_order ?? 0,
        archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Habit;

      qc.setQueryData<Habit[]>(queryKeys.habits.all(userId), old => [
        optimistic,
        ...(old ?? []),
      ]);

      return { previous, tempId };
    },

    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.previous) {
        qc.setQueryData(queryKeys.habits.all(userId), context.previous);
      }
    },

    onSuccess: (createdHabit, _vars, context) => {
      // Replace the optimistic entry with the real server record in place,
      // rather than waiting on invalidate+refetch (avoids a duplicate flash).
      qc.setQueryData<Habit[]>(queryKeys.habits.all(userId), old =>
        (old ?? []).map(h => (h.id === context.tempId ? createdHabit : h))
      );
    },

    onSettled: (newHabit) => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all(userId) });
      if (newHabit) {
        scheduleHabitReminder(newHabit as Habit).catch(e => console.error(e));
      }
      // A new habit can change whether anything's incomplete today.
      recomputeEveningCheckIn().catch(e => console.error(e));
    },
  });
}

// ──────────────────────────────────────────────────────────
// useUpdateHabit
// ──────────────────────────────────────────────────────────
export function useUpdateHabit() {
  const qc = useQueryClient();
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const { recomputeEveningCheckIn } = useSmartNotifications();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async ({ habitId, payload }: { habitId: string; payload: UpdateHabitPayload }) =>
      HabitsRepository.updateHabit(habitId, payload, await getToken()),

    onSettled: (updatedHabit, _error, { habitId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all(userId) });
      qc.invalidateQueries({ queryKey: queryKeys.habits.detail(userId, habitId) });
      if (updatedHabit) {
        scheduleHabitReminder(updatedHabit as Habit).catch(e => console.error(e));
      }
      // Editing a habit's schedule/archived state can change what's
      // incomplete today (e.g. switching it to a day it's no longer due).
      recomputeEveningCheckIn().catch(e => console.error(e));
    },
  });
}

// ──────────────────────────────────────────────────────────
// useArchiveHabit
// ──────────────────────────────────────────────────────────
export function useArchiveHabit() {
  const qc = useQueryClient();
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const { recomputeEveningCheckIn } = useSmartNotifications();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (habitId: string) => HabitsRepository.archiveHabit(habitId, await getToken()),
    onSettled: (_data, _error, habitId) => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all(userId) });
      cancelHabitReminder(habitId).catch(e => console.error(e));
      recomputeEveningCheckIn().catch(e => console.error(e));
    },
  });
}

// ──────────────────────────────────────────────────────────
// useDeleteHabit (alias for archive)
// ──────────────────────────────────────────────────────────
export function useDeleteHabit() {
  const qc = useQueryClient();
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const { recomputeEveningCheckIn } = useSmartNotifications();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async (habitId: string) => HabitsRepository.archiveHabit(habitId, await getToken()),
    onSettled: (_data, _error, habitId) => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all(userId) });
      cancelHabitReminder(habitId).catch(e => console.error(e));
      recomputeEveningCheckIn().catch(e => console.error(e));
    },
  });
}

// ──────────────────────────────────────────────────────────
// useClearAllHabits
// ──────────────────────────────────────────────────────────
export function useClearAllHabits() {
  const qc = useQueryClient();
  const { user } = useAppUser();
  const { getToken } = useAppAuth();
  const { recomputeEveningCheckIn } = useSmartNotifications();
  const userId = user?.id ?? '';

  return useMutation({
    mutationFn: async () => HabitsRepository.clearAllHabits(await getToken()),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.habits.all(userId) });
      // No habits left → nothing to check in about.
      recomputeEveningCheckIn().catch(e => console.error(e));
    },
  });
}
