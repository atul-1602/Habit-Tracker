import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 30 seconds
      staleTime: 30 * 1000,
      // Keep unused data in cache for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests once before showing error
      retry: 1,
      // Refetch when app comes to foreground
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

// ── Query Key Factory ────────────────────────────────────────
// Centralised keys prevent typos and allow precise invalidation
export const queryKeys = {
  habits: {
    all: (userId: string) => ['habits', userId] as const,
    detail: (userId: string, habitId: string) => ['habits', userId, habitId] as const,
  },
  completions: {
    day: (userId: string, date: string) => ['completions', userId, 'day', date] as const,
    month: (userId: string, year: number, month: number) =>
      ['completions', userId, 'month', year, month] as const,
    stats: (userId: string) => ['completions', userId, 'stats'] as const,
    habitStats: (userId: string, habitId: string) =>
      ['completions', userId, 'stats', habitId] as const,
    history: (userId: string, days: number, habitId?: string) =>
      ['completions', userId, 'history', days, habitId ?? 'all'] as const,
  },
  user: {
    profile: (userId: string) => ['user', userId, 'profile'] as const,
  },
  achievements: {
    all: () => ['achievements'] as const,
    withStatus: (userId: string) => ['achievements', userId, 'status'] as const,
  },
};
