import { UserProfile, HabitStats, DailyHistoryPoint } from '../../domain/types';
import { apiFetch } from '../apiClient';

export const UserRepository = {
  async getProfile(token: string | null, displayName?: string): Promise<UserProfile> {
    const query = displayName ? `?display_name=${encodeURIComponent(displayName)}` : '';
    return apiFetch<UserProfile>(`/users/profile${query}`, { method: 'GET' }, token);
  },

  async updateProfile(updates: Partial<UserProfile>, token: string | null): Promise<UserProfile> {
    return apiFetch<UserProfile>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, token);
  },

  async getOverallStats(token: string | null): Promise<HabitStats> {
    return apiFetch<HabitStats>('/stats', { method: 'GET' }, token);
  },

  async getHabitStats(habitId: string, token: string | null): Promise<HabitStats> {
    return apiFetch<HabitStats>(`/stats?habit_id=${habitId}`, { method: 'GET' }, token);
  },

  async getHistory(days: number, token: string | null, habitId?: string): Promise<DailyHistoryPoint[]> {
    const habitQuery = habitId ? `&habit_id=${habitId}` : '';
    return apiFetch<DailyHistoryPoint[]>(`/stats/history?days=${days}${habitQuery}`, { method: 'GET' }, token);
  },
};
