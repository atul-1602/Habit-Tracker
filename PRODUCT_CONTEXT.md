# Habit Tracker — Master Product & Engineering Context

**Purpose:** This document is the single source of truth for building the Habit Tracker React Native app.

---

# 1. Product Vision
Build a **modern, premium, minimal-but-playful Habit Tracker mobile app**.
The product is focused specifically on habit tracking. The architecture should be clean enough to later expand toward a broader ecosystem, but the first release must remain focused and simple.
The app should feel: Premium, Modern, Clean, Minimal, Slightly funky/playful, Fast and responsive, Dark-first.

# 2. Core Product Principles
1. **Local-first:** Works without a backend.
2. **Fast:** Opening and marking complete feels instant.
3. **Low friction:** Few taps.
4. **Visual feedback:** Satisfying progress/streaks.
5. **Reusable architecture:** Clean separation.
6. **Scalable foundation:** Easy to extend.
7. **Accessibility:** Contrast, targets, labels.
8. **Consistent design:** Use tokens.

# 3. Technology Stack
- React Native
- Expo
- TypeScript
- Expo Router
- NativeWind
- React 19.x
- Local persistence (SQLite)
- Lucide React Native

# 4. Design Direction
**Background:** Primary `#111111`, Surface `#1C1C1F`, Elevated `#27272A`
**Text:** Primary `#FFFFFF`, Secondary `#B5B5B5`, Muted `#707070`
**Accent:** Lime `#C7F464`, Purple `#A855F7`, Orange `#FF7849`, Sky `#5AC8FA`, Pink `#FF5DA2`, Yellow `#FFD93D`
**Typography:** Inter
**Spacing:** `4, 8, 12, 16, 20, 24, 32, 40, 48`
**Radius:** Small(4), Medium, Large, XL, Pill(999)
**Icons:** Lucide

# 5. Primary User Experience
1. Open app
2. See today's progress
3. See today's habits
4. Mark habits complete
5. Receive visual feedback
6. See progress improve
7. Return tomorrow

# 6. Initial App Areas
- **Home / Today:** Main dashboard
- **Habits:** Management (Create/Edit)
- **Analytics / Progress:** History, streaks, trends
- **Settings:** Theme, Data, App preferences

# 7. Onboarding
Short and useful. Explain value, create first habit, enter dashboard.

# 8. Habit Domain Model
```ts
Habit { id, name, description, icon, color, frequency, target, unit, reminderEnabled, reminderTime, startDate, archived, createdAt, updatedAt }
```

# 9. Habit Frequency
Daily, selected weekdays, weekly targets.

# 10. Habit Completion
```ts
HabitCompletion { id, habitId, date, value, completed, createdAt, updatedAt }
```

# 11. Streak Logic
Domain/business logic. Current, best, history, missed days. Unscheduled days are not failures.

# 12. Daily Progress
Calculated from scheduled habits.

# 13. Data Architecture
UI -> Hooks / View Models -> Domain / Use Cases -> Repositories -> SQLite

# 14. Suggested Project Structure
```
app/
  (tabs)/
  habits/
src/
  components/
  features/
  domain/
  database/
  hooks/
  theme/
  utils/
```

# 15. Design System Requirements
Colors, Typography, Spacing, Radius, Shadows, Components (Button, Card, Badge, ProgressBar, etc.)

# 16. Home Screen UX
Greeting -> Today's Progress -> Today's Habits -> Streak/Quick Stats

# 17. Habit Card
Icon, name, frequency, completion state. Tap to update state immediately.

# 18. Create/Edit Habit
Name (required), description, icon, color, frequency, scheduled days. Immediate feedback.

# 19. Analytics
Completion history, percentage, streaks, heatmap, trends.

# 20. Empty States
Explain missing, why it matters, CTA.

# 21. Loading & Error States
Handle elegantly. Loading should be short.

# 22. Persistence
SQLite with migrations.

# 23. Notifications
Future capability. Keep data model ready.

# 24. Theme
Dark mode primary. Semantic tokens (theme.colors.background).

# 25. Accessibility
Touch targets, labels, contrast, reduced-motion.

# 26. Performance
Fast initial render, smooth scrolling, stable list keys, efficient queries.

# 27. State Management
Local state, hooks, repository. No heavy global state unless needed.

# 28. Validation & Testing
Unit tests for domain logic (frequency, streak, progress). UI tests for critical flows.

# 29. Development Order
Phase 0: Foundation
Phase 1: Navigation & Shell
Phase 2: Habit Core
Phase 3: Daily Tracking
Phase 4: Analytics
Phase 5: Polish
Phase 6: Future Features
