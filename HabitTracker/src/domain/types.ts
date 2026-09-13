// =========================================================
// Domain Types – Single source of truth for all data models
// =========================================================

// ----------------------------------------------------------
// USER
// ----------------------------------------------------------
export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  clerk_user_id: string | null;
  created_at: string;
  updated_at: string;
}

// ----------------------------------------------------------
// HABITS
// ----------------------------------------------------------
export type HabitFrequency = 'daily' | 'weekdays' | 'custom';
export type HabitCategory =
  | 'Health'
  | 'Fitness'
  | 'Learning'
  | 'Mindfulness'
  | 'Nutrition'
  | 'Sleep'
  | 'Creativity'
  | 'Social'
  | 'General';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  category: HabitCategory;
  frequency: HabitFrequency;
  frequency_days: number[]; // 0=Mon…6=Sun
  reminder_enabled: boolean;
  reminder_time: string | null; // 'HH:MM'
  sort_order: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateHabitPayload = Omit<Habit, 'id' | 'created_at' | 'updated_at'>;
export type UpdateHabitPayload = Partial<Omit<Habit, 'id' | 'user_id' | 'created_at'>>;

// ----------------------------------------------------------
// HABIT COMPLETIONS
// ----------------------------------------------------------
export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  completed_date: string; // 'YYYY-MM-DD'
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Map of habit_id → completed boolean for a given day */
export type DayCompletionMap = Record<string, boolean>;

/** Map of 'YYYY-MM-DD' → number of completed habits */
export type MonthCompletionMap = Record<string, number>;

// ----------------------------------------------------------
// ACHIEVEMENTS
// ----------------------------------------------------------
export interface Achievement {
  id: string;
  key?: string;
  code?: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  xp_reward: number;
  unlocked: boolean;
  unlocked_at: string | null;
  created_at?: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  // Joined
  achievement?: Achievement;
}

export interface AchievementWithStatus extends Achievement {
  unlocked: boolean;
  unlocked_at: string | null;
}

// ----------------------------------------------------------
// STATS
// ----------------------------------------------------------
export interface HabitStats {
  current_streak: number;
  longest_streak: number;
  total_completed: number;
  total_days_tracked: number;
  completion_rate: number; // 0–1
  best_streak: number;
}

export interface HabitWithCompletion extends Habit {
  completed_today: boolean;
}

/** One day's completion snapshot, used to plot the Insights consistency chart. */
export interface DailyHistoryPoint {
  date: string; // 'YYYY-MM-DD'
  completed: number;
  total: number;
  rate: number; // 0–1
}
