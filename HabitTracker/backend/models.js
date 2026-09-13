const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, unique: true, index: true },
    display_name: { type: String, default: 'Habit Tracker User' },
    avatar_url: { type: String },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const UserProfileModel = mongoose.model('UserProfile', UserProfileSchema);

const HabitSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    emoji: { type: String, default: '⚡' },
    color: { type: String, default: '#C7F464' },
    category: { type: String, default: 'Health' },
    frequency: { type: String, default: 'daily' },
    frequency_days: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    reminder_enabled: { type: Boolean, default: false },
    reminder_time: { type: String, default: null },
    sort_order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

const HabitModel = mongoose.model('Habit', HabitSchema);

const HabitCompletionSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    habit_id: { type: String, required: true, index: true },
    completed_date: { type: String, required: true, index: true },
    completed: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

HabitCompletionSchema.index({ user_id: 1, habit_id: 1, completed_date: 1 }, { unique: true });

const HabitCompletionModel = mongoose.model('HabitCompletion', HabitCompletionSchema);

const AchievementSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    emoji: { type: String, required: true },
    color: { type: String, required: true },
    unlocked: { type: Boolean, default: false },
    unlocked_at: { type: Date, default: null },
    xp_reward: { type: Number, default: 50 },
  },
  { timestamps: true }
);

AchievementSchema.index({ user_id: 1, code: 1 }, { unique: true });

const AchievementModel = mongoose.model('Achievement', AchievementSchema);

module.exports = { UserProfileModel, HabitModel, HabitCompletionModel, AchievementModel };
