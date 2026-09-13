const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('@clerk/backend');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const { UserProfileModel, HabitModel, HabitCompletionModel, AchievementModel } = require('./models');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY is not defined in backend/.env — all requests will be rejected.');
}

// ── CORS ──────────────────────────────────────────────────────
// Native apps aren't subject to CORS, so this only matters for browser-based
// clients (Expo web). Restrict to an explicit allowlist in production.
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: isProd ? corsOrigins : true,
  })
);
// Default body limit (100kb) is too small for a base64-encoded avatar image.
app.use(express.json({ limit: '5mb' }));

// ── Rate limiting ─────────────────────────────────────────────
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// ── MongoDB connection ────────────────────────────────────────
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

  mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB disconnected'));
} else {
  console.warn('⚠️ MONGODB_URI is not defined in backend/.env');
}

// Reject requests while the DB connection isn't ready, instead of a confusing 500.
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database unavailable, please try again shortly.' });
  }
  next();
});

// ── Auth middleware ───────────────────────────────────────────
// Verifies the Clerk session token sent as `Authorization: Bearer <token>`
// and derives the trusted user id from it. The client can no longer assert
// its own identity via a header.
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token || !CLERK_SECRET_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    req.userId = payload.sub;
    next();
  } catch (err) {
    // Log the real reason in development. A common cause is an instance
    // mismatch: the backend CLERK_SECRET_KEY belongs to a different Clerk
    // app than the publishable key the mobile app uses, so the token
    // signature can never validate.
    if (!isProd) {
      console.error('[requireAuth] token verification failed:', err?.message || err);
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function sendError(res, status, err, publicMessage) {
  console.error(err);
  res.status(status).json({ error: isProd ? publicMessage || 'Something went wrong' : err.message });
}

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable',
  });
});

// --- USER PROFILE ROUTES ---
app.get('/api/users/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    let profile = await UserProfileModel.findOne({ user_id: userId });
    const queryName = typeof req.query.display_name === 'string' ? req.query.display_name : undefined;

    if (!profile) {
      const displayName = queryName || 'Habit Tracker User';
      profile = await UserProfileModel.create({ user_id: userId, display_name: displayName });
    } else if (profile.display_name === 'Habit Tracker User' && queryName && queryName !== 'Habit Tracker User') {
      profile.display_name = queryName;
      await profile.save();
    }
    res.json({ ...profile.toObject(), id: profile._id.toString() });
  } catch (err) {
    sendError(res, 500, err);
  }
});

const MUTABLE_PROFILE_FIELDS = ['display_name', 'avatar_url'];

app.put('/api/users/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const updates = {};
    for (const field of MUTABLE_PROFILE_FIELDS) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const profile = await UserProfileModel.findOneAndUpdate(
      { user_id: userId },
      { $set: updates },
      { new: true, upsert: true }
    );
    res.json({ ...profile.toObject(), id: profile._id.toString() });
  } catch (err) {
    sendError(res, 500, err);
  }
});

// --- HABITS ROUTES ---
app.get('/api/habits', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const habits = await HabitModel.find({ user_id: userId, archived: false }).sort({ sort_order: 1, created_at: -1 });
    const formatted = habits.map((h) => ({ ...h.toObject(), id: h._id.toString() }));
    res.json(formatted);
  } catch (err) {
    sendError(res, 500, err);
  }
});

app.get('/api/habits/:id', requireAuth, async (req, res) => {
  try {
    const habit = await HabitModel.findOne({ _id: req.params.id, user_id: req.userId });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json({ ...habit.toObject(), id: habit._id.toString() });
  } catch (err) {
    sendError(res, 500, err);
  }
});

const MUTABLE_HABIT_FIELDS = [
  'name',
  'emoji',
  'color',
  'category',
  'frequency',
  'frequency_days',
  'reminder_enabled',
  'reminder_time',
  'sort_order',
  'archived',
];

function pickMutableHabitFields(body) {
  const out = {};
  for (const field of MUTABLE_HABIT_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

app.post('/api/habits', requireAuth, async (req, res) => {
  try {
    const payload = pickMutableHabitFields(req.body);
    const newHabit = await HabitModel.create({ ...payload, user_id: req.userId });
    res.json({ ...newHabit.toObject(), id: newHabit._id.toString() });
  } catch (err) {
    sendError(res, 500, err);
  }
});

app.put('/api/habits/:id', requireAuth, async (req, res) => {
  try {
    const payload = pickMutableHabitFields(req.body);
    const habit = await HabitModel.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      payload,
      { new: true }
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json({ ...habit.toObject(), id: habit._id.toString() });
  } catch (err) {
    sendError(res, 500, err);
  }
});

app.delete('/api/habits/:id', requireAuth, async (req, res) => {
  try {
    const habit = await HabitModel.findOneAndUpdate(
      { _id: req.params.id, user_id: req.userId },
      { archived: true },
      { new: true }
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    res.json({ success: true, habit });
  } catch (err) {
    sendError(res, 500, err);
  }
});

// --- COMPLETIONS ROUTES ---
app.get('/api/completions', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { date, month, year } = req.query;

    let query = { user_id: userId, completed: true };

    if (date) {
      query.completed_date = date;
    } else if (month !== undefined && year !== undefined) {
      const monthNum = Number(month);
      const yearNum = Number(year);
      if (!Number.isInteger(monthNum) || monthNum < 0 || monthNum > 11 || !Number.isInteger(yearNum) || yearNum < 1970 || yearNum > 9999) {
        return res.status(400).json({ error: 'Invalid month/year' });
      }
      const monthStr = String(monthNum + 1).padStart(2, '0');
      const prefix = `${yearNum}-${monthStr}`;
      query.completed_date = { $regex: `^${prefix}` };
    }

    const completions = await HabitCompletionModel.find(query);
    const formatted = completions.map((c) => ({ ...c.toObject(), id: c._id.toString() }));
    res.json(formatted);
  } catch (err) {
    sendError(res, 500, err);
  }
});

app.post('/api/completions/toggle', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { habit_id, completed_date, completed } = req.body;

    if (typeof habit_id !== 'string' || !/^[a-f0-9]{24}$/i.test(habit_id)) {
      return res.status(400).json({ error: 'Invalid habit_id' });
    }
    if (typeof completed_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(completed_date)) {
      return res.status(400).json({ error: 'Invalid completed_date' });
    }

    // Ownership check — the habit must belong to the caller.
    const habit = await HabitModel.findOne({ _id: habit_id, user_id: userId });
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    if (completed) {
      const comp = await HabitCompletionModel.findOneAndUpdate(
        { user_id: userId, habit_id, completed_date },
        { completed: true },
        { upsert: true, new: true }
      );
      res.json({ ...comp.toObject(), id: comp._id.toString() });
    } else {
      await HabitCompletionModel.deleteOne({ user_id: userId, habit_id, completed_date });
      res.json({ success: true });
    }
  } catch (err) {
    sendError(res, 500, err);
  }
});

// --- STATS ROUTES ---

/**
 * Calculate current and longest streak from a sorted array of YYYY-MM-DD date strings.
 */
function calculateStreaks(dates) {
  if (!dates.length) return { current: 0, longest: 0 };

  const unique = [...new Set(dates)].sort();
  let longest = 1;
  let current = 1;
  let tempStreak = 1;

  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      tempStreak++;
      if (tempStreak > longest) longest = tempStreak;
    } else {
      tempStreak = 1;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = new Date(unique[unique.length - 1]);
  const daysSinceLast = (today - lastDate) / (1000 * 60 * 60 * 24);
  current = daysSinceLast <= 1 ? tempStreak : 0;

  return { current, longest };
}

app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { habit_id } = req.query;

    const habitsCount = habit_id
      ? 1
      : await HabitModel.countDocuments({ user_id: userId, archived: false });

    let completionQuery = { user_id: userId, completed: true };
    if (habit_id) completionQuery.habit_id = habit_id;

    const completions = await HabitCompletionModel.find(completionQuery).select('completed_date');
    const totalCompleted = completions.length;

    const dates = completions.map((c) => c.completed_date);
    const uniqueDates = [...new Set(dates)];
    const totalDaysTracked = uniqueDates.length;

    const { current: currentStreak, longest: longestStreak } = calculateStreaks(dates);

    const completionRate =
      habitsCount > 0 && totalDaysTracked > 0
        ? Math.min(totalCompleted / (habitsCount * totalDaysTracked), 1)
        : 0;

    res.json({
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_completed: totalCompleted,
      completion_rate: completionRate,
      total_days_tracked: totalDaysTracked,
    });
  } catch (err) {
    sendError(res, 500, err);
  }
});

/**
 * Daily completion history for the last N days — powers the Insights
 * screen's consistency chart/heatmap and a single habit's "This Week" bars.
 * Denominator (habit count) uses the user's CURRENT active habit count for
 * every day in the range, same simplification `/api/stats` already makes —
 * we don't keep a historical record of which habits existed/were archived
 * on a given past day.
 *
 * Optional `?habit_id=` scopes the whole thing to one habit: `total` is
 * fixed at 1 and `rate` becomes a plain 0/1 "was it done that day".
 */
app.get('/api/stats/history', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 365);
    const habitId = typeof req.query.habit_id === 'string' && req.query.habit_id ? req.query.habit_id : null;

    let habitsCount;
    if (habitId) {
      const owned = await HabitModel.exists({ _id: habitId, user_id: userId });
      if (!owned) return res.status(404).json({ error: 'Habit not found' });
      habitsCount = 1;
    } else {
      habitsCount = await HabitModel.countDocuments({ user_id: userId, archived: false });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (days - 1));
    const startDateStr = startDate.toISOString().split('T')[0];

    const completionQuery = {
      user_id: userId,
      completed: true,
      completed_date: { $gte: startDateStr },
    };
    if (habitId) completionQuery.habit_id = habitId;

    const completions = await HabitCompletionModel.find(completionQuery).select('completed_date');

    const countByDate = {};
    for (const c of completions) {
      countByDate[c.completed_date] = (countByDate[c.completed_date] || 0) + 1;
    }

    const history = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const completed = countByDate[dateStr] || 0;
      history.push({
        date: dateStr,
        completed,
        total: habitsCount,
        rate: habitsCount > 0 ? Math.min(completed / habitsCount, 1) : 0,
      });
    }

    res.json(history);
  } catch (err) {
    sendError(res, 500, err);
  }
});

// --- ACHIEVEMENTS ROUTES ---
const DEFAULT_ACHIEVEMENTS = [
  { code: 'first_habit', title: 'First Step', description: 'Created your first habit', emoji: '🌱', color: '#C7F464', xp_reward: 50 },
  { code: 'streak_3', title: 'On Fire', description: 'Reached a 3-day streak', emoji: '🔥', color: '#FF7849', xp_reward: 100 },
  { code: 'streak_7', title: 'Unstoppable', description: 'Reached a 7-day streak', emoji: '⚡', color: '#FFD93D', xp_reward: 200 },
  { code: 'total_10', title: 'Habit Master', description: 'Completed 10 habits total', emoji: '🏆', color: '#A855F7', xp_reward: 300 },
];

app.get('/api/achievements', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    let userAchievements = await AchievementModel.find({ user_id: userId });

    if (userAchievements.length === 0) {
      const toCreate = DEFAULT_ACHIEVEMENTS.map((a) => ({ ...a, user_id: userId }));
      userAchievements = await AchievementModel.insertMany(toCreate, { ordered: false }).catch(() =>
        AchievementModel.find({ user_id: userId })
      );
    }

    const formatted = userAchievements.map((a) => ({ ...a.toObject(), id: a._id.toString() }));
    res.json(formatted);
  } catch (err) {
    sendError(res, 500, err);
  }
});

// ── Fallback error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  sendError(res, 500, err);
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️ Server is already running on http://localhost:${PORT}`);
  } else {
    console.error('Server error:', err);
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});
