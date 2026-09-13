# Habit Tracker — Project Status & Engineering Reference

**This is a living document.** It reflects the app as actually built (not just as originally planned), and should be updated whenever we ship a feature, fix a bug, or make an architectural decision. See "How to keep this updated" at the bottom.

**Last updated:** 2026-09-13 (2nd pass — UI fixes + avatar upload)
**Original vision doc:** [`PRODUCT_CONTEXT.md`](./PRODUCT_CONTEXT.md) — written *before* implementation started. Several of its decisions (notably: local-first SQLite) were superseded during build; see §2 for what was actually built and why this document, not that one, is the source of truth for current state.

---

## 1. What this app is

A React Native (Expo) mobile habit tracker. Users sign up/sign in (Clerk), create habits with an emoji/color/category/frequency/reminder, mark them done day-to-day, and see streaks, stats, and achievements. Data is stored server-side (MongoDB via a small Express API), not locally — see §2 for why this differs from the original plan.

**Current state: MVP is functionally working end-to-end** — signup, sign-in, forgot-password, and the full habit CRUD + completion-tracking + stats API surface are all built and verified (see §9, Testing). Several secondary screens (analytics, habit detail history) currently render **mock/hardcoded data** instead of real historical data — see §8 for the exact list. This is the top of the backlog once we start "features & optimization."

---

## 2. Tech stack (as built)

| Layer | Choice | Note |
|---|---|---|
| App framework | Expo SDK 57 (`~57.0.15`), Expo Router (file-based routing) | |
| Language | TypeScript | |
| UI | React Native 0.86.2 + React 19.2.3, NativeWind 4 (Tailwind for RN), a small hand-rolled `src/components/ui` kit | |
| Icons | `lucide-react-native` | |
| Auth | **Clerk** (`@clerk/expo` — using the `/legacy` API surface, see §5) | |
| Server state / caching | **TanStack React Query v5** | |
| Backend | **Express + MongoDB (Mongoose)**, `backend/server.js` | ⚠️ Deviates from `PRODUCT_CONTEXT.md`'s "local-first SQLite" plan — the app talks to a remote-ish REST API, not an on-device DB. This was an early architectural decision made before this session; it is not something we changed. Worth a conscious call before adding features: keep this backend-first architecture, or is local-first still a goal? |
| Local persistence | `AsyncStorage` — used only for app *settings* (theme, notification prefs, onboarding-seen flag) and the Clerk token cache (via `expo-secure-store`), **not** for habit data | |
| Notifications | `expo-notifications` (local scheduled reminders only, no push server) | |
| File export | `expo-file-system` + `expo-sharing` (JSON backup export) | |
| Profile picture | `expo-image-picker` + `expo-image-manipulator` (resize/compress client-side, stored as a data URI in `avatar_url`) | Added 2026-09-13 |
| Reminder time picker | `@react-native-community/datetimepicker` | Added 2026-09-13 (6th pass) |
| Root view background control | `expo-system-ui` — `setBackgroundColorAsync` fixes the white-flash-between-screens bug live in Expo Go; its config-plugin form (app.json) only applies in a real prebuild | Added 2026-09-13 (15th pass) |

Full dependency list is in [`package.json`](package.json).

---

## 3. Architecture

```
┌─────────────────────────┐        ┌──────────────────────┐        ┌──────────────────┐
│   Expo / React Native    │        │   Clerk (auth)        │        │   MongoDB Atlas    │
│   app  (this repo)       │◄──────►│   credible-chow-2828   │        │   (habit data)     │
│                          │  JWT   │   .clerk.accounts.dev │        └────────▲──────────┘
│  screens → hooks         │        └──────────────────────┘                 │
│  (React Query)           │                                                  │
│    → repositories        │         Bearer <session JWT>                    │
│    → apiClient.ts        │───────────────────────────────────────────────► │
│                          │                                    Express API   │
└─────────────────────────┘                                    (backend/)     │
                                                                 verifies JWT  │
                                                                 via           │
                                                                 @clerk/backend│
                                                                 └─────────────┘
```

- **The app never trusts its own claimed identity.** Every backend call sends `Authorization: Bearer <Clerk session JWT>`; the backend calls `verifyToken()` (`@clerk/backend`) and derives `req.userId` from the verified token — the client cannot spoof another user's data.
- **Data flow (frontend):** Screen component → a hook in `src/hooks/` (wraps React Query) → a repository in `src/database/repositories/` → `apiClient.ts` (`fetch` wrapper, attaches token, points at `EXPO_PUBLIC_API_BASE_URL`) → Express route in `backend/server.js` → Mongoose model in `backend/models.js`.

---

## 4. Repository layout

```
HabitTracker/
├── app/                        # Expo Router screens (file-based routing)
│   ├── (auth)/                 # sign-in, sign-up, forgot-password, onboarding, _layout
│   ├── (tabs)/                 # index (Home), habits, add, calendar, analytics, profile, _layout
│   ├── create-habit.tsx, edit-habit/[id].tsx, habit/[id].tsx
│   ├── achievements.tsx, backup.tsx, settings.tsx, help.tsx, privacy.tsx, about.tsx
│   ├── onboarding.tsx           # real post-signup onboarding carousel
│   ├── index.tsx                # ⚠️ dead code — see §8
│   └── _layout.tsx               # ClerkProvider, QueryClientProvider, AuthGuard (redirect logic)
├── src/
│   ├── components/ui/           # Button, Card, HabitCard, ProgressBar, ProgressRing, StatCard, Text, ToggleSwitch, HeatmapGrid
│   ├── hooks/                   # useHabits, useCompletions, useAchievements, useStats, useSettings, useNotifications, useAppUser, useUser, useAppAuth
│   ├── database/
│   │   ├── apiClient.ts         # fetch wrapper: base URL, Bearer token, 10s timeout
│   │   └── repositories/        # habits, completions, users, achievements — one file per REST resource
│   ├── domain/types.ts          # single source of truth for shared TS types
│   └── lib/                     # constants.ts, dateUtils.ts, queryClient.ts, clerkErrors.ts
├── backend/
│   ├── server.js                 # Express app, all routes, requireAuth middleware, rate limiting
│   ├── models.js                  # Mongoose schemas: UserProfile, Habit, HabitCompletion, Achievement
│   ├── scripts/test-flow.js        # end-to-end auth+API regression test (see §9)
│   └── .env / .env.example
├── .env / .env.example            # EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, EXPO_PUBLIC_API_BASE_URL
└── app.json                       # Expo config
```

---

## 5. Authentication (Clerk) — current setup & hard-won lessons

**Clerk project in use:** `credible-chow-2828.clerk.accounts.dev` (both `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env` and `CLERK_SECRET_KEY` in `backend/.env` must always point at the **same** Clerk project — a mismatch is a silent, hard-to-diagnose bug we hit and fixed this session; `test-flow.js` now catches it automatically).

**Why `@clerk/expo/legacy` and not `@clerk/expo`:** the installed `@clerk/expo` re-exports `@clerk/react`'s newer *signals-based* `useSignIn`/`useSignUp` by default, which have a completely different shape (no `isLoaded`, `setActive`, `.create()`) from what this codebase is written against. All three auth screens import from `@clerk/expo/legacy` specifically for the classic resource-based API (`signIn.create()`, `signUp.create()`, `setActive({session})`, etc.). **If you ever see `isLoaded` come back `undefined`, check this import first.**

**Current Clerk instance policy (as configured in the Clerk Dashboard):**
- Sign-up fields collected: email + password only (no phone, no username, no first/last name as native Clerk fields — the user's entered name is stored in `unsafeMetadata.fullName` instead, since the "name" attribute was disabled on this instance)
- Password policy: **minimum 15 characters**, no other complexity rules, HIBP (breach) check enforced — mirrored client-side as `MIN_PASSWORD_LENGTH` in `src/lib/constants.ts`, checked automatically by `test-flow.js`'s preflight so a future Dashboard policy change is caught before it surprises a user
- Bot/CAPTCHA sign-up protection: **disabled** (must stay disabled — Expo/React Native cannot render Clerk's Smart CAPTCHA widget at all)
- Session token (JWT) lifetime: **60 seconds** (Clerk's default; not configured, not something to "fix" — see the note below)
- MFA: not required instance-wide, but Clerk may still ask for an **email-code step-up** ("second factor") when it sees a client/device it's never encountered before (fraud protection, not a bug) — `sign-in.tsx` handles this status gracefully (clear message) but there is **no UI to actually complete it**. This is an open backlog item (§10) if it starts affecting real users on new devices.

**Token lifetime note:** session JWTs live only 60 seconds, but the app never caches a token — every API call does `await getToken()` immediately before use (`useAppAuth()` → Clerk's `useAuth().getToken()`), which transparently mints a fresh token as needed. Nothing to change here; this is correct, standard Clerk usage.

**Screens:**
- `app/(auth)/sign-up.tsx` — email + password + confirm, then a 6-digit email verification code (`prepareEmailAddressVerification` / `attemptEmailAddressVerification`), then `setActive()` → `/onboarding`.
- `app/(auth)/sign-in.tsx` — email + password, `setActive()` → `/(tabs)`. Has a working "Forgot password?" link.
- `app/(auth)/forgot-password.tsx` — **built this session.** Two-step: (1) enter email → `signIn.create({strategy:'reset_password_email_code', identifier})`; (2) enter the emailed code + new password → `signIn.attemptFirstFactor(...)` then `signIn.resetPassword({password})` → signs the user in directly.
- Shared: `src/lib/clerkErrors.ts` (`parseClerkError`) and `src/lib/constants.ts` (`MIN_PASSWORD_LENGTH`) — single sources of truth used by all three screens; don't re-duplicate these inline again.

---

## 6. Backend API reference

Base URL: `EXPO_PUBLIC_API_BASE_URL` (client) → `backend/server.js`, default port `5001`. All routes below are prefixed `/api` and require `Authorization: Bearer <token>` (via `requireAuth` middleware) unless noted. Rate limit: 120 req/min per IP on `/api/*`.

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/health` | — | No auth. `{status, db}` |
| GET | `/api/users/profile` | — | Auto-creates a profile document on first call |
| PUT | `/api/users/profile` | `{display_name?, avatar_url?}` | Only these 2 fields are mutable |
| GET | `/api/habits` | — | Excludes archived |
| GET | `/api/habits/:id` | — | 404 if not owned by caller |
| POST | `/api/habits` | `{name, emoji, color, category, frequency, frequency_days?, reminder_enabled?, reminder_time?, sort_order?}` | |
| PUT | `/api/habits/:id` | any mutable subset of the above + `archived` | |
| DELETE | `/api/habits/:id` | — | Soft-delete: sets `archived: true`, does not remove the row |
| GET | `/api/completions` | query: `?date=YYYY-MM-DD` or `?month=&year=` | |
| POST | `/api/completions/toggle` | `{habit_id, completed_date, completed}` | Verifies habit ownership before writing; upserts on `completed: true`, deletes the row on `false` |
| GET | `/api/stats` | query: `?habit_id=` optional | `{current_streak, longest_streak, total_completed, completion_rate, total_days_tracked}` |
| GET | `/api/stats/history` | query: `?days=N` (1-365, default 7), optional `?habit_id=` | `[{date, completed, total, rate}]` ascending. Without `habit_id`: overall history (powers the Insights sparkline + heatmap), `total` = current active habit count for every day in range (same simplification `/api/stats` makes). With `habit_id`: scoped to that one habit, `total` fixed at 1 so `rate` is a plain 0/1 "was it done that day" (powers habit detail's `WeekBars`); 404 if the habit isn't owned by the caller |
| GET | `/api/achievements` | — | Auto-seeds the 4 default achievement definitions on first call per user |

**Data models** (`backend/models.js`, Mongoose): `UserProfile`, `Habit`, `HabitCompletion` (unique index on `user_id+habit_id+completed_date`), `Achievement` (unique index on `user_id+code`). TypeScript equivalents live in `src/domain/types.ts` — keep both in sync when changing a shape.

---

## 7. Frontend structure — screens, hooks, components

### Screens (`app/`)
| Screen | Purpose |
|---|---|
| `(tabs)/index.tsx` | Home/Today — greeting, streak banner, progress ring, today's habit list w/ toggle |
| `(tabs)/habits.tsx` | ⚠️ Static placeholder, not wired to real data — hidden from the tab bar already (`href: null`). Dead-ish; candidate for removal or completion. |
| `(tabs)/add.tsx` | Redirect stub → `/create-habit` (exists only to anchor the tab bar's center FAB) |
| `(tabs)/calendar.tsx` | Month grid + per-day habit checklist, real data |
| `(tabs)/analytics.tsx` | ⚠️ Several **mock-data** elements — see §8 |
| `(tabs)/profile.tsx` | Avatar, name, level/XP, streak stats, menu → achievements/analytics/settings, sign out |
| `create-habit.tsx` / `edit-habit/[id].tsx` | Habit form (shared shape), create vs. pre-filled update |
| `habit/[id].tsx` | Habit detail — real stats, but ⚠️ some hardcoded visuals — see §8 |
| `onboarding.tsx` | Real 3-step post-signup carousel → notification permission → first habit |
| `achievements.tsx` | Grid of unlock status, real data |
| `backup.tsx` | JSON export (share sheet) + "Clear All Data" |
| `settings.tsx` | Theme, accent color, notification toggles, links to backup/privacy/help/about |
| `help.tsx` / `privacy.tsx` / `about.tsx` | Static content, no data |
| `index.tsx` (root) | ⚠️ Dead code — see §8 |

### Hooks (`src/hooks/`)
`useHabits` (CRUD, optimistic updates, schedules/cancels reminders), `useCompletions` (day/month/toggle, optimistic), `useAchievements`, `useStats` (overall + per-habit), `useSettings` (AsyncStorage-backed, pub/sub, not React Query), `useNotifications` (permission request + schedule/cancel reminder — plain async functions, not stateful hooks), `useAppUser`/`useUser` (Clerk user + our profile), `useAppAuth` (Clerk `useAuth` wrapper, source of `getToken()` for every repository call).

### Components (`src/components/ui/`)
`Button`, `Card`, `HabitCard`, `ProgressBar`, `ProgressRing`, `StatCard`, `Text`, `ToggleSwitch` — small, real, data-agnostic. `HeatmapGrid` currently renders **deterministic mock data**, not real history (§8).

### Shared libs (`src/lib/`)
`constants.ts` (categories/colors/emoji, XP math, `MIN_PASSWORD_LENGTH`, `STORAGE_KEYS`, `TABLES`), `dateUtils.ts` (pure date helpers, no external date lib), `queryClient.ts` (React Query defaults + centralized `queryKeys` factory), `clerkErrors.ts` (shared Clerk error → message parser).

---

## 8. Known issues / technical debt (found during this session's audit)

These are **not urgent bugs** — the app works — but are exactly the kind of thing to weigh before "adding new features and optimization":

1. **`app/index.tsx` is dead code.** It's a second, separate onboarding/splash screen at the root route, but `AuthGuard` in `app/_layout.tsx` redirects away from `/` immediately based on auth+onboarding state in all cases — this screen is effectively unreachable. Decide: delete it, or repurpose it.
2. **`app/(tabs)/habits.tsx` is a static placeholder**, not a real habit list, and is already hidden from the tab bar (`href: null`). Either finish it or remove the route entirely.
3. **`useDeleteHabit()` is just an alias for `useArchiveHabit()`** — there is no real hard-delete anywhere in the app or API. Fine if intentional (soft-delete only), worth being explicit about it if not.
4. ~~Analytics screen mock data~~ — **fully fixed 2026-09-13 (3rd pass).** All three spots now use real data: the consistency sparkline and Week/Month/Year toggle (2nd pass), plus the `HeatmapGrid` (now fed a real 5-Monday-aligned-week window via `/api/stats/history`) and the per-habit "Habits Performance" rows (extracted into `HabitPerformanceRow`, each calling `useHabitStats(habit.id)` for its own real rate instead of sharing the global one).
5. **Habit detail screen (`habit/[id].tsx`)**: ~~`WeekBars` heights were a hardcoded array~~ — **fixed 2026-09-13 (3rd pass)**, now uses real per-habit daily history (`useStatsHistory(7, habitId)`) with correct actual weekday labels for the rolling 7-day window. Still open: the mini month-calendar only marks "day < today" as filled, not real per-day completion for this specific habit.
6. ~~`app.json` sets `userInterfaceStyle: "light"` despite the app being all-dark~~ — **fixed 2026-09-13 (15th pass)**: this was the direct cause of a real white-flash-between-screens bug once it started actually manifesting — see the changelog entry. Still open: no iOS `bundleIdentifier` set. (The `expo-notifications` plugin icon/color config was fixed in the 4th pass — that part of this item was already resolved.)
7. **Sign-in has no UI to complete a second-factor (email-code step-up)** if Clerk challenges an unrecognized device — currently shows a clear error but the user is stuck (see §5).
8. **No `SafeAreaProvider` anywhere in the app** — every screen instead hardcodes `paddingTop: 56` (etc.) on its container. `react-native-safe-area-context` is installed (an Expo Router dependency) but never wrapped around the app, so `useSafeAreaInsets()` won't work if reached for — noticed while building `NotificationBanner` (2026-09-13, 4th pass), which was written to match the existing fixed-offset convention instead. Worth deciding: add a real `SafeAreaProvider` + switch screens to dynamic insets (more correct across devices/notches), or keep the fixed-offset convention intentionally for simplicity.
9. **Architecture deviates from the original `PRODUCT_CONTEXT.md` plan** (SQLite/local-first → MongoDB/Express backend). Not a bug, but worth a conscious "are we keeping this" conversation before investing further, since it affects offline support, an explicit original goal.
10. **Systemic text-clipping risk app-wide (found 2026-09-13, 13th pass)**: the shared `<Text>` component (`src/components/ui/Text.tsx`) always applies a NativeWind class carrying `line-height: 24px` (its default `variant="body"` → `text-base`) unless a screen's own `style` explicitly overrides `lineHeight` too — just setting a larger `fontSize` isn't enough, since `fontSize` and `lineHeight` are independent properties and the className's line-height still wins for the one it sets. Confirmed and fixed for the Consistency Score card's `bigStat`/emoji (analytics.tsx); a repo-wide grep for `fontSize` ≥ 20 without an adjacent `lineHeight` turns up hits in nearly every screen — genuinely widespread, but too broad to mass-fix without visual verification per screen. See §10 for the recommended remediation path.

---

## 9. Testing infrastructure

**`backend/scripts/test-flow.js`** — an end-to-end regression test built this session. Run with:
```
node backend/scripts/test-flow.js
```
(requires the backend running — `npm run server`)

It exercises, against the **real** Clerk project and backend (using Clerk's dev-mode test conventions — `+clerk_test` emails and the fixed `424242` OTP, so no real email/SMS is sent and it's safe to run repeatedly):
1. **Preflight** — key presence, same-instance alignment, CAPTCHA state, required-attributes-vs-app-collects diff, password-policy-vs-client-validation diff
2. **Full sign-up** — create → email verify → session created
3. **Session → JWT** exchange (what the app actually sends the backend)
4. **Every backend endpoint** (health, profile, habits CRUD, completions, stats, achievements) + negative auth tests (401 for missing/garbage token)
5. **Sign-in** including completing Clerk's device-trust step-up challenge if presented
6. **Forgot-password** — request code → verify → set new password → proves the new password works and the old one is genuinely rejected

Currently: **41/41 checks passing.** Re-run this after any Clerk Dashboard change, key rotation, or backend route change — it's the fastest way to catch a regression before it reaches the device.

There is currently **no automated test coverage for the frontend** (no Jest/RNTL setup, no component tests) — worth considering as we add features.

---

## 10. Backlog / open items

- Build second-factor (email-code) UI for sign-in, if new-device sign-ins become common for real users
- Habit detail's mini month-calendar still doesn't reflect real per-day completion for that specific habit (marks "day < today" as filled, unconditionally)
- Tapping a delivered habit-reminder notification doesn't deep-link to that habit, despite `data: { habitId }` being attached — no response listener wired up yet
- ~~Decide the fate of `app/index.tsx` and `(tabs)/habits.tsx`~~ — both removed (16th pass)
- ~~Reconcile `userInterfaceStyle` config vs. all-dark UI~~ — fixed (15th pass), now `"dark"` to match reality
- Set a real Android package name / iOS bundle identifier before any store submission — still `com.anonymous.HabitTracker` (Expo's placeholder), no iOS bundle identifier set at all
- Add frontend test coverage
- Revisit the backend-vs-local-first architecture decision if offline support matters going forward
- `habit/[id].tsx`, `edit-habit/[id].tsx`, and `create-habit.tsx` still use plain `router.back()` — likely the same "lands on Home" issue as §12's 18th pass, but each is reachable from more than one place (Home *and* Calendar, or via a dynamic `id`), so fixing it needs passing along an explicit origin rather than a single hardcoded target like the simpler screens got
- **Audit large-`fontSize` text styles app-wide for the line-height clipping issue (§8.10)**, one screen at a time with visual confirmation on a device. The durable root fix: change `Text.tsx` to skip applying the variant's Tailwind text-size class whenever the caller's `style` already sets its own `fontSize` (so inline styles never fight a conflicting className line-height) — safer than hand-adding `lineHeight` to every affected style individually, but needs a visual pass across the app either way

---

## 11. Environment reference

| Var | Where | Purpose |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env` | Must match `backend/.env`'s `CLERK_SECRET_KEY` project |
| `EXPO_PUBLIC_API_BASE_URL` | `.env` | `http://10.0.2.2:5001/api` for Android emulator (auto-remapped from `localhost` in `apiClient.ts` if set otherwise) |
| `CLERK_SECRET_KEY` | `backend/.env` | Never expose to client |
| `MONGODB_URI` | `backend/.env` | Atlas connection string |
| `PORT` | `backend/.env` | Default 5001 |
| `CORS_ORIGIN` | `backend/.env` | Only matters for web/browser clients |

Restart required after changing any `EXPO_PUBLIC_*` var (`npx expo start -c`) or backend env var (restart `npm run server`) — none of these hot-reload.

---

## 12. Session change log

Append a dated entry here each time we do meaningful work, newest at the top. Keep entries short — what changed and why, not a full transcript.

### 2026-09-14 (19th pass) — Repo unification: this project now lives in one repo, connected to GitHub
Found (and fixed) a structural git problem: the actual app lived in a separate, **disconnected** nested git repo (`HabitTracker/.git`, auto-created when the project was scaffolded) sitting inside an **outer** repo (`~/Desktop/Habit-Tracker/`) that was the one actually wired to GitHub (`github.com/atul-1602/Habit-Tracker`) — but that outer repo only contained the original `PRODUCT_CONTEXT.md` planning doc and a stray, empty `package-lock.json` from an `npm install` run in the wrong folder (no `package.json` ever existed there). Every fix and feature built this whole session lived only in the inner repo's uncommitted working tree, connected to no remote at all.
- Moved `PRODUCT_CONTEXT.md` into this folder (git detected it as a rename, preserving its history in the diff); deleted the stray outer `package-lock.json`; removed the inner repo's own `.git` (its only history was the trivial auto-generated scaffold commit — nothing of this session's real work was ever committed there, so nothing was lost); committed everything as one unified history in the outer, GitHub-connected repo.
- **Along the way, found and repaired real git corruption in the (now-removed) inner repo**: `refs/heads/main` had gone missing (the file itself, not just the commit), and the index had partially reset — `git status` briefly showed the entire project as "deleted" even though every file was still intact on disk. Root cause unconfirmed (this folder is under `~/Desktop/`, and macOS's iCloud Desktop & Documents sync is a known, plausible culprit for exactly this kind of partial-sync git metadata issue) — but fully recoverable, since the actual commit object was still present in `.git/objects`: restored the ref with `git update-ref`, confirmed via `git cat-file`/`git show` that the recovered commit matched exactly, then re-staged (`git add -A`) to resync the index with the real (fully intact) working tree before proceeding with the unification above.
- **Verified after the dust settled**: typecheck clean, regression suite 44/44, outer repo status fully clean after the commit (nothing missed, nothing extra).
- **Not done**: nothing has been pushed to GitHub yet — that's a deliberate, separate step, done only when explicitly asked.
- **Worth doing if this recurs**: if `git status` in this repo ever again reports files as unexpectedly deleted/reset without you having touched them, don't panic and don't run anything destructive — check `.git/refs/heads/<branch>` and `git fsck --unreachable --dangling` first; the underlying commit objects are very likely still recoverable exactly like this time.

### 2026-09-13 (18th pass) — Back button from root-level screens landed on Home instead of their real parent
Achievements, Settings, Backup, Help, Privacy, About, and Notifications all live at the app's root (siblings of the `(tabs)` group, not inside it) and all used generic `router.back()`. Reported symptom: pressing back from Achievements or Settings landed on the Home tab instead of resuming Profile — the screen the user actually came from.
- New `src/hooks/useBackTo.ts`: makes a screen's back action — **both** its own on-screen button and Android's hardware back button/gesture (`BackHandler`, a documented no-op on iOS so safe everywhere) — explicitly target a fixed parent route, instead of trusting the stack's default pop target.
- Applied with each screen's *real* parent, not a blanket target: Achievements/Settings/Notifications → their actual entry point (Profile, Profile, Home); Backup/Help/Privacy/About → **Settings** specifically, not skipped straight to Profile, since that's genuinely one level further down the chain (Profile → Settings → Backup).
- Deliberately left `habit/[id].tsx`, `edit-habit/[id].tsx`, and `create-habit.tsx` untouched — they're reachable from more than one place (Home *and* Calendar, or with a dynamic `id`), so a single hardcoded target would be wrong some of the time. Flagged in §10 rather than guessed at.

### 2026-09-13 (17th pass) — FAB was visibly off-center in the tab bar
`AddHabitFAB` is passed as the "add" tab's `tabBarButton`, which replaces the tab bar's own slot wrapper entirely — the other 4 tabs get centered within their equal-width slot by the library's default wrapper, but a custom `tabBarButton` doesn't get that for free. The fixed 60×60 button was rendering left-aligned within its slot instead of centered, next to siblings that were. Fixed by wrapping it in a `flex: 1, alignItems: 'center', justifyContent: 'center'` container matching the other tabs' slot behavior.

### 2026-09-13 (16th pass) — Production-readiness cleanup
- **Removed dead/dangerous files**: `app/index.tsx` (confirmed unreachable — `AuthGuard` redirects away from the root route in every case before it could render), `app/(tabs)/habits.tsx` (an abandoned early prototype — different styling approach than the rest of the app, static fake data, a dead button, not reachable from any UI, only hidden via `href: null`), `backend/seed.js` (unreferenced by any script or client code, and dangerous: unconditionally wipes every collection with no scoping/confirmation/env-guard), and a stale untracked `dist/` web-export build artifact from before this session started.
- **Gated debug `console.log` calls behind `__DEV__`** (root layout's key-validity log, and the four auth screens' raw-error dumps) — they're still there for local debugging, just silent in a production/release build. Left `console.error`/`console.warn` calls alone (legitimate error surfacing) and left all backend `console.log`s alone (server-side operational logging, never shipped to the client bundle).
- Removed one other genuinely-unused import found along the way (`Text` in `app/_layout.tsx`).
- **Verified**: typecheck clean, full regression suite 44/44, and a full Metro bundle export (3999 modules, no errors) to confirm the route-file removals didn't break anything structurally.
- **`POST /api/seed`** (+ its `autoSeedUserData` helper, + the now-unused `seedLimiter`) — unlike `seed.js` this one was safe (properly authenticated/scoped/rate-limited), just genuinely dead: nothing in the app's UI ever called it. User confirmed: remove it. Done — verified it now 404s (not 401) with no auth, confirming the route itself is gone, not just unreachable.
- **Found, not changed**: `app.json`'s `android.package` is still `com.anonymous.HabitTracker` — Expo's default placeholder. This (and the still-missing iOS `bundleIdentifier`, already tracked in §8/§10) needs a real reverse-domain identifier before any store submission — these are effectively permanent once published, so this needs the user's actual identifier, not a guessed one.
- **Not touched**: a local, git-ignored `android/` native project directory exists on disk (confirmed untracked — `git ls-files android` is empty) — harmless either way since it's not part of the repo, but flagged in case it's stale from an earlier prebuild and no longer needed.

### 2026-09-13 (15th pass) — White flash between screens/tabs
Root cause was exactly the config/reality mismatch flagged as a known issue back in the 1st-pass audit: `app.json` had `userInterfaceStyle: "light"` on an app that's entirely hardcoded dark. The native root window/scene background follows that setting, defaulting to white during the brief gap between one screen unmounting and the next screen's own dark background painting — most visible with the new tab-fade animation (14th pass) since a cross-fade lingers on that gap longer than a hard cut did.
- **`app.json`**: `userInterfaceStyle` → `"dark"`, added top-level `backgroundColor: "#111111"`, added the `expo-system-ui` plugin — this is the correct static config for when this becomes a real standalone/EAS build, but **does nothing in Expo Go** (no dev-client here — a static config-plugin change only applies through a native prebuild, same limitation already learned the hard way with custom notification sounds).
- **What actually fixes it today, in Expo Go**: `expo-system-ui`'s runtime API, `SystemUI.setBackgroundColorAsync('#111111')`, called once in `app/_layout.tsx`'s root component — this sets the native root view color live, no rebuild needed.
- **Belt-and-suspenders**: added `sceneStyle: { backgroundColor: '#111111' }` to the tabs navigator and `contentStyle: { backgroundColor: '#111111' }` to the `(auth)` stack navigator, so the native `Screen` surface itself defaults dark too, independent of the root-window fix above.

### 2026-09-13 (14th pass) — Tab-change animation + screen entrance polish
- **Tab-change animation**: discovered Expo Router 57 no longer wraps `@react-navigation/bottom-tabs` as a separate package — it vendors its own copy internally (`expo-router/build/react-navigation/bottom-tabs`), which still supports the same `animation: 'none' | 'fade' | 'shift'` screenOption. Set `animation: 'fade'` on the tab navigator's `screenOptions` (`app/(tabs)/_layout.tsx`) — native-thread-driven, no extra library needed.
- **Screen entrance polish**: raw `ScrollView` scrolling is already OS-driven and there's no heavy per-scroll JS work anywhere in the app to blame for jank — but the *hard, instant pop* of content when switching tabs is the more likely real source of a "not smooth" feeling. Added `src/components/ui/FadeInView.tsx` (fade + slight upward slide on mount, ~260ms, `useNativeDriver: true`) and wrapped the root container of all 4 real tab screens (Home, Calendar, Insights, Profile) with it — deliberately using the same plain RN `Animated` API already established elsewhere in this app (`NotificationBanner`, `ToggleSwitch`, `onboarding.tsx`) rather than introducing Reanimated for the first time, for consistency.
- **Ruled out, not fixed**: checked whether Reanimated's Babel plugin (a common real cause of app-wide jank when misconfigured) was set up correctly — `babel-preset-expo` auto-detects and includes it since the package is installed, confirmed via its source; no misconfiguration found there.
- **Honest caveat for the user**: this app currently runs via Expo Go (dev mode), which has real, inherent JS-bridge/dev-tooling overhead no code change here can remove — a production/EAS build will feel measurably smoother regardless of these changes.

### 2026-09-13 (13th pass) — Found a systemic text-clipping root cause; fixed the reported instance
The Consistency Score's "33%" and mood emoji were visually clipped at the top/bottom. Root cause: the shared `<Text>` component (`src/components/ui/Text.tsx`) always applies a NativeWind class per its `variant` prop, defaulting to `variant="body"` → Tailwind's `text-base`, which carries `line-height: 24px`. Any screen that then sets a **larger custom `fontSize` via the `style` prop without also setting `lineHeight`** ends up with glyphs taller than their line box — clipped top/bottom, worse on Android and especially visible on bold numerals and color emoji.
- **Fixed**: `bigStat` (40px) and the mood emoji (28px) in `app/(tabs)/analytics.tsx` now set explicit `lineHeight`; `smileWrap` also given a fixed 48×48 size instead of auto-sizing from padding alone.
- **Not fixed — flagged instead**: a grep for `fontSize: [20-99]` without an adjacent `lineHeight` turned up hits in nearly every screen in the app (`sign-up.tsx`, `sign-in.tsx`, `profile.tsx`, `HabitCard.tsx`, `StatCard.tsx`, `ProgressRing.tsx`, and more — see §8). This is systemic, not a one-off, but mass-editing dozens of unverified styles without being able to visually confirm each one on a device carries real regression risk — left as a clearly-documented backlog item (§8/§10) rather than blind-fixed. The more durable fix would be at the root: make `Text.tsx` skip applying the variant's Tailwind text-size class whenever the caller's own `style` already sets a `fontSize`, so inline styles never have to fight a conflicting className line-height at all.

### 2026-09-13 (12th pass) — Consistency sparkline was visually flat
The Insights sparkline was a fixed 220×60px SVG — after its 6px padding, only ~48px of actual vertical range was available to plot real variation, so it looked flat/cramped regardless of the underlying data. Grew it to a 300×110 internal coordinate space and switched to `width="100%"` + `viewBox` (rather than a hardcoded pixel width) so it also properly fills the card's actual width on any screen size instead of a fixed 220px that didn't match the container.

### 2026-09-13 (10th pass) — Fixed a real re-render bug from the 9th pass + built the missing notifications screen
- **Bug found and fixed**: `useSmartNotifications`'s callbacks depended on `getToken`/the query client directly — Clerk's `getToken` isn't guaranteed to be the same reference across renders, so `app/_layout.tsx`'s app-foreground effect (which depends on those callbacks) was re-firing on nearly every navigation, re-fetching and re-scheduling far more than intended. This was very likely the actual cause of a recurring "notification UI" complaint that looked like the earlier LogBox issue resurfacing but wasn't (that fix — `index.ts`/`package.json`'s `"main"` — was confirmed still correctly in place). Fixed by reading `getToken`/the query client through refs instead, so the callbacks are now stable and only regenerate when the user or the relevant settings actually change.
- **Built the missing notifications screen**: the Home screen's bell icon had no `onPress` and no screen existed for it. Added `src/hooks/useNotificationLog.ts` (same AsyncStorage-backed global-state pattern as `useSettings.ts`) that logs every notification the app observes via `NotificationBanner`'s existing `addNotificationReceivedListener` (no second subscription needed), capped at 50 entries. New `app/notifications.tsx` lists them (icon varies by content — flame for streak alerts, heart for the inactivity nudge, bell otherwise), marks all read on open, and can clear all. The bell's badge dot is now real (`unreadCount > 0`) instead of always-on.
- **Known limitation, stated honestly**: a notification delivered while the app was fully killed won't retroactively appear in this log — the listener only fires while the app's JS is running. Same limitation any purely local (non-server-tracked) notification history has.
- New date helper: `formatRelativeTime()` in `src/lib/dateUtils.ts` ("Just now" / "5m ago" / "3d ago" / short date beyond a week).

### 2026-09-13 (9th pass) — Smart local notifications: evening check-in, streak-risk alerts, inactivity nudge
Three new notification types, all local (`expo-notifications`, no backend/push changes), sitting alongside the existing per-habit reminder (untouched):

- **Evening check-in** — one notification a day (default 8:00 PM), only if at least one habit scheduled for today is still incomplete. Names the habit if it's just one, counts them if more ("3 habits still open today").
- **Streak-risk alert** — folded into the *same* evening slot rather than a competing second notification: if an incomplete habit's current streak is ≥3 days, that message wins outright ("12-day streak at risk! 🔥 ... log it before midnight") instead of the generic count.
- **Inactivity nudge** — a one-off "we miss you" reminder, always rescheduled 3 days out on every app foreground — so it only ever actually fires if the user genuinely doesn't open the app for 3 straight days in a row.
- **Reused, didn't duplicate, existing settings UI**: `settings.tsx` already had "Reminders" and "Streak Alerts" toggles wired to nothing — relabeled "Reminders" → "Evening Check-in" (its real behavior now) and wired both to the new logic, added one new toggle ("Bring Me Back") for the inactivity nudge. `motivationalQuotes` is untouched — a separate, unrelated concept not part of this feature.
- **No new backend routes** — per-habit streaks reuse the existing `GET /api/stats?habit_id=` (confirmed no bulk all-habits-streaks endpoint exists, but the per-habit one already does the job via `Promise.all` across a user's small habit count); habits/completions reuse the existing repositories via `queryClient.fetchQuery` (cache-aware — respects staleness, doesn't force a network call when data's already fresh, e.g. repeated app-foreground events).
- **New files**: `src/lib/notificationContent.ts` (pure message-building logic, no hooks/IO — easy to reason about independently) and `src/hooks/useSmartNotifications.ts` (the orchestration hook: fetches what's needed, calls the pure logic, hands the result to `useNotifications.ts`'s new scheduling primitives — `scheduleOrCancelEveningCheckIn`, `rescheduleInactivityNudge`, `cancelInactivityNudge`, all using fixed well-known identifiers rather than AsyncStorage-tracked ones, since cancelling an identifier that was never scheduled is already a documented no-op).
- **Recompute wired into every place that can change the answer**: completion toggle (`useCompletions.ts`, only for *today's* date — a past-day toggle from the calendar doesn't affect today's evening check), habit create/update/archive/delete/clear-all (`useHabits.ts`), and app foreground including cold start (`app/_layout.tsx`'s `AuthGuard`, via `AppState`). Toggling a setting off also cancels its notification immediately, not just on the next natural recompute.
- **Manual testing note for next time**: to verify without waiting for 8 PM or 3 real days, temporarily lower `DEFAULT_EVENING_HOUR`/`DEFAULT_INACTIVITY_DAYS` in `useNotifications.ts` locally (not shipped as a real test-mode toggle — kept out of production code deliberately).

### 2026-09-13 (8th pass) — Reminders were firing every day, ignoring the habit's actual schedule
- While explaining how reminders work, found a real correctness bug: `scheduleHabitReminder` used a plain daily-repeating trigger (`{hour, minute, repeats: true}`) regardless of `habit.frequency`/`frequency_days` — a "weekdays" or "custom" habit's reminder fired on **every single day**, including days the habit isn't even scheduled for (e.g., weekends for a weekdays-only habit). Fixed by scheduling one `WEEKLY`-type trigger per day actually in `frequency_days` (each with its own identifier, `habit-reminder-{id}-{day}`), converting this app's Monday-first day convention to `expo-notifications`' Apple-style 1-7/Sunday-first convention — verified the mapping standalone across all 7 days before wiring it in. `cancelHabitReminder` now cancels all 7 possible per-day identifiers (safe/no-op for ones never scheduled, per the library's own docs), so changing a habit's days or frequency never leaves a stale reminder behind.
- **Still open (not fixed this pass):** tapping a delivered notification doesn't deep-link to that specific habit, even though `data: { habitId }` is attached — there's no `addNotificationResponseReceivedListener` anywhere yet. Worth adding if reminders become a heavily-used feature.

### 2026-09-13 (7th pass) — Found the *real* cause of the white notification banner (4th pass's fix was the wrong layer)
- The plain white bottom banner was reported as unfixed even after the 4th-pass `NotificationBanner` change. Root cause, confirmed by reading `expo-notifications`' own source: it fires a `console.warn` **at import time** stating its functionality isn't fully supported in **Expo Go** — this project has no `expo-dev-client` installed, so that's how it's being run. That warning renders as React Native's own **LogBox** overlay — a native, dev-only warning banner completely outside our component tree, unstylable by anything we render in JS. That's why it stayed a plain white bar regardless of the app's dark theme, and why suppressing our own notification-handler config (the 4th pass's fix) had no effect on it — it was the wrong layer entirely.
- **Real fix:** `index.ts` (previously dead code — it imported a deleted `./App` and was never actually used, since `package.json`'s `"main"` pointed straight at `"expo-router/entry"`) is now the app's real entry point. It calls `LogBox.ignoreLogs([...])` for that specific warning, then `require('expo-router/entry')` — deliberately a `require()`, not a static `import`, since ES imports are hoisted above any other code in a module regardless of source position, which would've run the router (and every route file that imports `expo-notifications`) *before* the ignore pattern was registered. `package.json`'s `"main"` now points at `"index.ts"`. Verified the new entry resolves and bundles cleanly (3995 modules, no errors) via `expo export:embed`.
- The 4th pass's `NotificationBanner` + suppressed native foreground banner is **still valid and unrelated** — that's for when an actual local notification (a habit reminder) fires while the app is open; this pass's fix is for a dev-only warning banner that had nothing to do with real notification content.
- **Note for next session:** a full Metro cache clear (`npx expo start -c`) is needed after this change for the new entry point to take effect — `"main"` and entry-file changes don't hot-reload.

### 2026-09-13 (6th pass) — Reminder time is now actually customizable; schedule/reminder shown on HabitCard
- **Reminder time was hardcoded/unchangeable** — `create-habit.tsx`/`edit-habit/[id].tsx` had a `reminderTime` state defaulting to `'07:00'` with zero UI to ever change it; the "reminder" row only toggled on/off. Installed `@react-native-community/datetimepicker` and rebuilt the row: a `ToggleSwitch` for enable/disable (enabling auto-opens the picker), and tapping the time text (when enabled) reopens it to change. Uses the modern non-deprecated `onValueChange`/`onDismiss` API. Same fix applied to both the create and edit screens.
- **`HabitCard` now shows repeat schedule + reminder time**, matching the reference screenshot's ask — e.g. "Daily" or "Mon, Wed, Fri" plus a small 🔔 chip with the time when a reminder is set. New `habitFrequencyLabel()` helper in `src/lib/constants.ts`; new `timeStringToDate`/`dateToTimeString` helpers in `src/lib/dateUtils.ts` (also used by the time picker above). Home screen (`(tabs)/index.tsx`) now passes `frequency`/`frequencyDays`/`reminderEnabled`/`reminderTime` through — `HabitCard` is only used there currently.

### 2026-09-13 (5th pass) — Habits no longer appear before they existed; Custom days starts empty
- **`isHabitScheduledForDate` now also checks `habit.created_at`**: a habit created today was incorrectly showing on past calendar dates (and counting toward those days' completion ratios) since only day-of-week was checked. Now a habit never appears before the date it was actually created — verified standalone across past/creation-day/future/no-`created_at` cases before wiring in.
- **"Custom" repeat mode no longer pre-selects all 7 days** (`app/create-habit.tsx`) — starts empty, forcing a deliberate choice. Added matching validation (Save disabled + alert) if Custom is chosen with zero days picked, since that would silently create a habit that's never scheduled anywhere; applied the same guard to `app/edit-habit/[id].tsx` for consistency, plus an inline "Pick at least one day above" hint on both screens.

### 2026-09-13 (4th pass) — Notification banner UI + calendar behavior clarified
- **Foreground notification UI was the native Android heads-up banner** (plain white, default icon, overlapping the tab bar) — not a custom app component, so it couldn't be restyled directly. Fixed by: (1) configuring the `expo-notifications` plugin in `app.json` with a proper icon (`android-icon-monochrome.png`) + brand color for the real system notification (tray/lock-screen, when the app is backgrounded — genuinely native OS UI, now at least themed), and (2) suppressing the foreground banner (`shouldShowBanner: false`) in favor of a new custom `<NotificationBanner>` (`src/components/ui/NotificationBanner.tsx`) — a dark-themed, slide-down toast mounted once near the root (`app/_layout.tsx`) that listens for the same event and renders fully in our own styling, positioned clear of the tab bar, auto-dismissing after ~4.5s with a manual close button.
- **Calendar "fetch that day's habits" behavior confirmed already correct** (from the 2nd pass's scheduling fix) — no code change needed here, just verified: `useCompletions(selectedISO)` fetches real per-date completion state from the DB, `scheduledHabits` filters to only habits actually scheduled that day, and there's already a distinct empty state ("No habits scheduled for this day.") vs. "No habits yet." Explained the mechanism back rather than re-implementing something already working.

### 2026-09-13 (3rd pass) — Closed out the remaining Insights/habit-detail mock data
- **`/api/stats/history`** now accepts an optional `?habit_id=` to scope the daily history to one habit (404 if not owned) — reused for two things below instead of adding two new endpoints
- **Habit detail `WeekBars`**: replaced the hardcoded `[0.2,0,1,1,0.5,1,0]` array with real per-habit last-7-days data (`useStatsHistory(7, habitId)`), including correct actual weekday letters for the rolling window (previously fixed `M,T,W,T,F,S,S` labels regardless of which days they really were)
- **Insights "Habits Performance" list**: extracted `HabitPerformanceRow` (in `analytics.tsx`) so each row calls `useHabitStats(habit.id)` for its own real completion rate, instead of every row sharing the same global `stats.completion_rate`
- **Insights `HeatmapGrid`**: was rendering a deterministic fake seed pattern; the component's own `data` prop existed but was never wired up. Now `analytics.tsx` fetches a real, Monday-aligned 5-week window (`useStatsHistory(mondayFirstDayIndex(today)+29)`), reshapes it into the `[dayIndex][weekIndex]` grid the component expects (`buildHeatmapData`), and the still-in-progress current week is padded with empty cells rather than needing fake data. Verified the date-alignment math standalone across multiple days-of-week before trusting it.
- Extended `test-flow.js` with `habit_id`-scoped history checks (ownership 404 included) — 44 checks now, still 0 failing

**New/changed files:** `app/(tabs)/analytics.tsx`, `app/habit/[id].tsx`, `src/components/ui/HeatmapGrid.tsx`, `backend/server.js` (`/api/stats/history` habit_id support)

**Backlog now fully closed from the original audit, except:** habit detail's mini month-calendar (still "day < today = filled", not real per-day data for that habit) and the second-factor sign-in UI.

### 2026-09-13 (2nd pass) — Home/Calendar/Insights fixes + profile picture upload
- **Home "View All"** now navigates to Insights (`/(tabs)/analytics`) — was a dead button
- **Tab bar FAB** now floats above the bar (larger, `top: -24`, ring border matching the screen background) instead of sitting inline with the other tab icons
- **Real habit scheduling, finally used**: added `isHabitScheduledForDate()` (`src/lib/dateUtils.ts`) and applied it to both the **Calendar** day-detail list/heatmap-ratio and the **Home** "Today's Habits" list — a "weekdays"/"custom" habit now only appears (and counts toward progress) on the days it's actually scheduled for, instead of showing on every day regardless of frequency. This was a real, previously-unused piece of the data model — see backlog note below.
- **Calendar heatmap-toggle bug fixed**: toggling a habit's completion for any day now also invalidates the month view, so the heatmap dots update immediately (previously required a remount)
- **Insights "Consistency Score" chart is now real data**, not a flat mock line: new backend endpoint `GET /api/stats/history?days=N` returns real daily completion history; the Week/Month/Year toggle now actually changes what's plotted (7/30/365 days) instead of being UI-only
- **Insights share button wired up** — shares a text summary of streak/consistency/total via the native Share sheet
- **Profile picture upload built**: `expo-image-picker` + `expo-image-manipulator` (resize to 512×512, JPEG compress) → stored as a data URI in the existing `avatar_url` field (already supported end-to-end by the backend/DB, just never wired to UI). Backend JSON body limit raised 100kb → 5mb to allow this.
- Extended `test-flow.js` to cover the new `/api/stats/history` endpoint (42 checks now, still 0 failing)

**New/changed files:** `app/(tabs)/index.tsx`, `app/(tabs)/calendar.tsx`, `app/(tabs)/analytics.tsx`, `app/(tabs)/profile.tsx`, `app/(tabs)/_layout.tsx`, `src/lib/dateUtils.ts`, `src/hooks/useStats.ts`, `src/hooks/useCompletions.ts`, `src/database/repositories/users.ts`, `src/domain/types.ts`, `src/lib/queryClient.ts`, `backend/server.js` (new route + body limit), `app.json` (image-picker plugin config)

**Still open from this batch:** per-habit progress bars on Insights still reuse the global completion rate rather than each habit's own (pre-existing issue, not touched this round — flagged in §8/§10).

### 2026-09-13 — Auth fully fixed + forgot-password built + this document created
- Fixed signup: wrong Clerk hook API (`@clerk/expo` signals API → switched to `@clerk/expo/legacy`), invalid `firstName` param (moved to `unsafeMetadata`), dead `/onboarding` redirect route, removed nonexistent `signUp.reset()` call
- Fixed backend 401s: Clerk publishable/secret keys were pointing at two different Clerk projects — aligned to `credible-chow-2828`
- Fixed password UX mismatch: Clerk requires 15+ chars, app only validated/advertised 8 → added `MIN_PASSWORD_LENGTH` constant, used everywhere
- Fixed sign-in's silent dead-end on any non-"complete" status (e.g. device-trust step-up) → now shows an honest, actionable message
- Built `backend/scripts/test-flow.js`, a full end-to-end regression test (now 41 checks)
- Built the entire forgot-password flow (`app/(auth)/forgot-password.tsx`) — previously a dead "Forgot password?" button with no handler and no screen
- Extracted `src/lib/clerkErrors.ts` and `MIN_PASSWORD_LENGTH` (in `src/lib/constants.ts`) as shared code across all three auth screens
- Audited the full frontend (screens, hooks, components, backend routes, data models) and documented current state + technical debt in this file

---

## How to keep this updated

- **After any meaningful change** (new feature, bug fix, architectural decision, dependency change): add a dated entry to §12, and update whichever of §6–§10 it affects (API table, screens table, known-issues list, backlog).
- **Before starting new feature work**, skim §8 (known issues) and §10 (backlog) — some "new features" may really be "finish this existing mock."
- If you (or a future session) find this document has drifted from reality, fix the document — don't just note the drift and move on.
