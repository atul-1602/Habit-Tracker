import { Achievement } from '../../domain/types';
import { apiFetch } from '../apiClient';

export const AchievementsRepository = {
  async getAchievements(token: string | null): Promise<Achievement[]> {
    return apiFetch<Achievement[]>('/achievements', { method: 'GET' }, token);
  },
};
