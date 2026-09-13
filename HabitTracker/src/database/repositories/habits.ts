import { Habit, CreateHabitPayload, UpdateHabitPayload } from '../../domain/types';
import { apiFetch } from '../apiClient';

export const HabitsRepository = {
  async getHabits(token: string | null): Promise<Habit[]> {
    return apiFetch<Habit[]>('/habits', { method: 'GET' }, token);
  },

  async getHabitById(id: string, token: string | null): Promise<Habit | null> {
    return apiFetch<Habit>(`/habits/${id}`, { method: 'GET' }, token);
  },

  async createHabit(habit: Omit<CreateHabitPayload, 'user_id'>, token: string | null): Promise<Habit> {
    return apiFetch<Habit>('/habits', {
      method: 'POST',
      body: JSON.stringify(habit),
    }, token);
  },

  async updateHabit(id: string, updates: UpdateHabitPayload, token: string | null): Promise<Habit> {
    return apiFetch<Habit>(`/habits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }, token);
  },

  async archiveHabit(id: string, token: string | null): Promise<void> {
    await apiFetch(`/habits/${id}`, { method: 'DELETE' }, token);
  },

  async clearAllHabits(token: string | null): Promise<void> {
    const habits = await this.getHabits(token);
    await Promise.all(habits.map(h => this.archiveHabit(h.id, token)));
  },
};
