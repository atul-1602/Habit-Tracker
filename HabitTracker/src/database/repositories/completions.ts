import { HabitCompletion } from '../../domain/types';
import { apiFetch } from '../apiClient';

export const CompletionsRepository = {
  async getCompletionsForDate(date: string, token: string | null): Promise<Record<string, boolean>> {
    const list = await apiFetch<HabitCompletion[]>(`/completions?date=${date}`, { method: 'GET' }, token);
    const map: Record<string, boolean> = {};
    list.forEach((c) => {
      if (c.completed) map[c.habit_id] = true;
    });
    return map;
  },

  async getMonthCompletions(year: number, month: number, token: string | null): Promise<Record<string, number>> {
    const list = await apiFetch<HabitCompletion[]>(`/completions?year=${year}&month=${month}`, { method: 'GET' }, token);
    const map: Record<string, number> = {};
    list.forEach((c) => {
      if (c.completed) {
        map[c.completed_date] = (map[c.completed_date] || 0) + 1;
      }
    });
    return map;
  },

  async toggleCompletion(habitId: string, date: string, completed: boolean, token: string | null): Promise<void> {
    await apiFetch('/completions/toggle', {
      method: 'POST',
      body: JSON.stringify({
        habit_id: habitId,
        completed_date: date,
        completed,
      }),
    }, token);
  },
};
