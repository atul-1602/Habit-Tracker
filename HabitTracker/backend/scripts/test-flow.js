#!/usr/bin/env node
/**
 * End-to-end auth + API regression test.
 *
 * Exercises the exact same path the mobile app takes — Clerk sign-up,
 * email verification, sign-in, and every backend endpoint — using Clerk's
 * built-in test-mode conventions (dev-only, no real email/SMS sent):
 *   - an email local-part containing "+clerk_test" always accepts the
 *     fixed OTP code "424242"
 *   - a phone number in the reserved 555-01xx test range behaves the same
 *
 * Run: node backend/scripts/test-flow.js
 * Requires: backend/.env (CLERK_SECRET_KEY) and ../.env (client publishable
 * key) to be filled in, and the backend server already running.
 *
 * Exit code 0 = everything passed. Non-zero = at least one step failed;
 * scroll up to the first ✗ for the root cause.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', '..');

function loadEnvFile(p) {
  const out = {};
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const clientEnv = loadEnvFile(path.join(ROOT, '.env'));
const backendEnv = loadEnvFile(path.join(ROOT, 'backend', '.env'));

const PUBLISHABLE_KEY = clientEnv.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const SECRET_KEY = backendEnv.CLERK_SECRET_KEY;
const API_BASE = (backendEnv.PORT ? `http://localhost:${backendEnv.PORT}` : 'http://localhost:5001') + '/api';
const HEALTH_URL = API_BASE.replace(/\/api$/, '/health');

let passed = 0;
let failed = 0;
const failures = [];

function ok(label, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    failures.push({ label, detail });
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function decodeFrontendApi(pk) {
  if (!pk || !pk.startsWith('pk_test_') && !pk.startsWith('pk_live_')) return null;
  const b64 = pk.split('_').slice(2).join('_');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  try {
    return Buffer.from(padded, 'base64').toString('utf8').replace(/\$$/, '');
  } catch {
    return null;
  }
}

async function main() {
  // ── 0. Preflight: keys present & from the same Clerk instance ──────────
  section('Preflight: environment & key alignment');
  ok('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is set (.env)', !!PUBLISHABLE_KEY);
  ok('CLERK_SECRET_KEY is set (backend/.env)', !!SECRET_KEY);
  if (!PUBLISHABLE_KEY || !SECRET_KEY) {
    return finish();
  }

  const frontendApi = decodeFrontendApi(PUBLISHABLE_KEY);
  ok('Publishable key decodes to a frontend API host', !!frontendApi, PUBLISHABLE_KEY);
  if (!frontendApi) return finish();
  console.log(`    frontend API: ${frontendApi}`);

  let secretInstanceId = null;
  try {
    const r = await fetch('https://api.clerk.com/v1/instance', {
      headers: { Authorization: `Bearer ${SECRET_KEY}` },
    });
    const j = await r.json();
    secretInstanceId = j.id;
  } catch (e) {
    ok('Secret key is valid (Clerk Backend API reachable)', false, e.message);
    return finish();
  }
  ok('Secret key is valid (Clerk Backend API reachable)', !!secretInstanceId);

  // dev_browser token for talking to the Frontend API directly
  const devBrowser = await fetch(
    `https://${frontendApi}/v1/dev_browser?_clerk_js_version=5.0.0`,
    { method: 'POST', headers: { Origin: 'http://localhost' } }
  ).then((r) => r.json());
  const devToken = devBrowser.token;
  ok('Obtained a dev-browser token from the Frontend API', !!devToken);

  const env = await fetch(
    `https://${frontendApi}/v1/environment?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
    { headers: { Origin: 'http://localhost' } }
  ).then((r) => r.json());

  const attrs = env?.user_settings?.attributes || {};
  const signUpCfg = env?.user_settings?.sign_up || {};

  ok(
    'Bot sign-up protection (CAPTCHA) is disabled',
    signUpCfg.captcha_enabled === false,
    signUpCfg.captcha_enabled === true
      ? 'Enable-to-disable: Clerk Dashboard → Attack Protection → turn OFF "Bot sign-up protection"'
      : undefined
  );

  const requiredAttrs = Object.entries(attrs)
    .filter(([, v]) => v.enabled && v.required)
    .map(([k]) => k);
  const APP_COLLECTS = ['email_address', 'password']; // fields sign-up screen actually sends
  const uncollectedRequired = requiredAttrs.filter((a) => !APP_COLLECTS.includes(a));
  ok(
    'Every required sign-up attribute is actually collected by the app',
    uncollectedRequired.length === 0,
    uncollectedRequired.length
      ? `Clerk requires [${uncollectedRequired.join(', ')}] but the sign-up screen only sends [${APP_COLLECTS.join(', ')}]. ` +
        `Disable "Required" for these in Clerk Dashboard → User & Authentication → Email, Phone, Username (or add UI to collect them).`
      : undefined
  );

  const needsPhone = requiredAttrs.includes('phone_number');

  // Keep in sync with MIN_PASSWORD_LENGTH in app/(auth)/sign-up.tsx — that
  // constant exists specifically so the client rejects a too-short password
  // before ever calling Clerk. If Clerk's policy tightens, this check fails
  // loudly instead of users seeing a raw Clerk error on submit.
  const APP_MIN_PASSWORD_LENGTH = 15;
  const clerkMinPasswordLength = env?.user_settings?.password_settings?.min_length || 0;
  ok(
    `App's client-side password minimum (${APP_MIN_PASSWORD_LENGTH}) meets Clerk's policy (${clerkMinPasswordLength})`,
    APP_MIN_PASSWORD_LENGTH >= clerkMinPasswordLength,
    `Update MIN_PASSWORD_LENGTH in app/(auth)/sign-up.tsx to ${clerkMinPasswordLength}`
  );

  if (uncollectedRequired.length > 0) {
    console.log(
      '\n⚠ Skipping the live sign-up/sign-in/API test — the app cannot currently complete signup ' +
      'until the attribute mismatch above is fixed in the Clerk Dashboard.'
    );
    return finish();
  }

  // ── 1. Sign-up flow (mirrors app/(auth)/sign-up.tsx) ────────────────────
  section('Sign-up flow (Clerk Frontend API, test-mode)');

  const stamp = Date.now();
  const testEmail = `habittracker.e2e+clerk_test${stamp}@example.com`;
  // Must satisfy the live Clerk instance's password policy (currently a
  // 15-char minimum, checked in preflight above) AND not appear in any
  // known breach corpus (Clerk enforces HIBP by default) — so this is
  // randomly generated per run rather than a fixed literal.
  const testPassword = `Xq7${crypto.randomBytes(12).toString('hex')}!`;
  const testPhone = '+15555550100'; // Clerk reserved test range

  const signUpBody = new URLSearchParams({
    email_address: testEmail,
    password: testPassword,
  });
  if (needsPhone) signUpBody.set('phone_number', testPhone);

  const signUpRes = await fetch(
    `https://${frontendApi}/v1/client/sign_ups?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: signUpBody,
    }
  ).then((r) => r.json());

  const signUpId = signUpRes?.response?.id;
  ok('signUp.create() succeeds', !!signUpId, JSON.stringify(signUpRes?.errors || signUpRes));
  if (!signUpId) return finish();

  // Prepare + attempt email verification (test emails accept the fixed code)
  await fetch(
    `https://${frontendApi}/v1/client/sign_ups/${signUpId}/prepare_verification?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ strategy: 'email_code' }),
    }
  ).then((r) => r.json());

  let attempt = await fetch(
    `https://${frontendApi}/v1/client/sign_ups/${signUpId}/attempt_verification?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ strategy: 'email_code', code: '424242' }),
    }
  ).then((r) => r.json());

  ok(
    'Email verification (424242 test code) is accepted',
    !attempt?.errors,
    JSON.stringify(attempt?.errors)
  );

  let signUpStatus = attempt?.response?.status;

  if (needsPhone && signUpStatus === 'missing_requirements') {
    await fetch(
      `https://${frontendApi}/v1/client/sign_ups/${signUpId}/prepare_verification?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
      {
        method: 'POST',
        headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ strategy: 'phone_code' }),
      }
    ).then((r) => r.json());

    attempt = await fetch(
      `https://${frontendApi}/v1/client/sign_ups/${signUpId}/attempt_verification?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
      {
        method: 'POST',
        headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ strategy: 'phone_code', code: '424242' }),
      }
    ).then((r) => r.json());
    ok('Phone verification (424242 test code) is accepted', !attempt?.errors, JSON.stringify(attempt?.errors));
    signUpStatus = attempt?.response?.status;
  }

  ok(`Sign-up reaches status "complete"`, signUpStatus === 'complete', `got "${signUpStatus}"`);

  const createdSessionId = attempt?.response?.created_session_id;
  ok('A session was created on sign-up', !!createdSessionId);

  // ── 2. Exchange session for a backend-verifiable JWT ────────────────────
  section('Session token issuance (what the mobile app sends to the backend)');

  const clientSessionsRes = await fetch(
    `https://${frontendApi}/v1/client?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
    { headers: { Origin: 'http://localhost' } }
  ).then((r) => r.json());

  const sessionId = clientSessionsRes?.response?.last_active_session_id || createdSessionId;
  ok('Client has an active session', !!sessionId);

  let sessionToken = null;
  if (sessionId) {
    const tokenRes = await fetch(
      `https://${frontendApi}/v1/client/sessions/${sessionId}/tokens?_clerk_js_version=5.0.0&__dev_session=${devToken}`,
      { method: 'POST', headers: { Origin: 'http://localhost' } }
    ).then((r) => r.json());
    sessionToken = tokenRes?.jwt;
  }
  ok('Obtained a session JWT (Bearer token)', !!sessionToken);

  if (!sessionToken) return finish();

  // ── 3. Backend API surface, exactly as the app calls it ─────────────────
  section('Backend API — authenticated (Authorization: Bearer <token>)');

  async function call(method, endpoint, body) {
    // API_BASE already ends in "/api" — strip a leading "/api" from the
    // endpoint if a call site included one, so both styles work and can
    // never silently double up into "/api/api/...".
    const path = endpoint.replace(/^\/api(?=\/|$)/, '');
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* no body */ }
    return { status: res.status, json };
  }

  const health = await fetch(HEALTH_URL).then((r) => r.json()).catch((e) => ({ error: e.message }));
  ok('GET /health responds', health.status === 'ok', JSON.stringify(health));

  const profile1 = await call('GET', '/users/profile');
  ok('GET /api/users/profile → 200 (auto-creates profile)', profile1.status === 200, JSON.stringify(profile1.json));

  const profileUpdate = await call('PUT', '/api/users/profile', { display_name: 'E2E Test User' });
  ok('PUT /api/users/profile → 200', profileUpdate.status === 200 && profileUpdate.json?.display_name === 'E2E Test User', JSON.stringify(profileUpdate.json));

  const habitsEmpty = await call('GET', '/api/habits');
  ok('GET /api/habits → 200 (empty array for new user)', habitsEmpty.status === 200 && Array.isArray(habitsEmpty.json), JSON.stringify(habitsEmpty.json));

  const createHabit = await call('POST', '/api/habits', {
    name: 'E2E Test Habit',
    emoji: '🧪',
    color: '#C7F464',
    category: 'General',
    frequency: 'daily',
  });
  ok('POST /api/habits → 200 (creates habit)', createHabit.status === 200 && !!createHabit.json?.id, JSON.stringify(createHabit.json));
  const habitId = createHabit.json?.id;

  const getHabit = habitId ? await call('GET', `/api/habits/${habitId}`) : { status: 0 };
  ok('GET /api/habits/:id → 200', getHabit.status === 200, JSON.stringify(getHabit.json));

  const updateHabit = habitId ? await call('PUT', `/api/habits/${habitId}`, { name: 'E2E Test Habit (renamed)' }) : { status: 0 };
  ok('PUT /api/habits/:id → 200 (updates habit)', updateHabit.status === 200 && updateHabit.json?.name === 'E2E Test Habit (renamed)', JSON.stringify(updateHabit.json));

  const todayStr = new Date().toISOString().split('T')[0];
  const toggleOn = habitId
    ? await call('POST', '/api/completions/toggle', { habit_id: habitId, completed_date: todayStr, completed: true })
    : { status: 0 };
  ok('POST /api/completions/toggle (complete) → 200', toggleOn.status === 200, JSON.stringify(toggleOn.json));

  const getCompletions = await call('GET', `/api/completions?date=${todayStr}`);
  ok('GET /api/completions?date=... → 200', getCompletions.status === 200 && Array.isArray(getCompletions.json) && getCompletions.json.length >= 1, JSON.stringify(getCompletions.json));

  const toggleOff = habitId
    ? await call('POST', '/api/completions/toggle', { habit_id: habitId, completed_date: todayStr, completed: false })
    : { status: 0 };
  ok('POST /api/completions/toggle (uncomplete) → 200', toggleOff.status === 200, JSON.stringify(toggleOff.json));

  const stats = await call('GET', '/api/stats');
  ok('GET /api/stats → 200', stats.status === 200 && typeof stats.json?.current_streak === 'number', JSON.stringify(stats.json));

  const history = await call('GET', '/stats/history?days=7');
  ok(
    'GET /api/stats/history?days=7 → 200 (7 daily points)',
    history.status === 200 && Array.isArray(history.json) && history.json.length === 7 && typeof history.json[0]?.rate === 'number',
    JSON.stringify(history.json)
  );

  const habitHistory = habitId ? await call('GET', `/stats/history?days=7&habit_id=${habitId}`) : { status: 0 };
  ok(
    'GET /api/stats/history?habit_id=... → 200, scoped to one habit (total=1)',
    habitHistory.status === 200 && Array.isArray(habitHistory.json) && habitHistory.json.every((d) => d.total === 1),
    JSON.stringify(habitHistory.json)
  );

  const otherUsersHabitHistory = await call('GET', '/stats/history?days=7&habit_id=000000000000000000000000');
  ok(
    "GET /api/stats/history?habit_id=<not owned/nonexistent> → 404",
    otherUsersHabitHistory.status === 404
  );

  const achievements = await call('GET', '/api/achievements');
  ok('GET /api/achievements → 200 (seeds defaults)', achievements.status === 200 && Array.isArray(achievements.json) && achievements.json.length > 0, JSON.stringify(achievements.json));

  const archiveHabit = habitId ? await call('DELETE', `/api/habits/${habitId}`) : { status: 0 };
  ok('DELETE /api/habits/:id → 200 (archives habit)', archiveHabit.status === 200, JSON.stringify(archiveHabit.json));

  const habitsAfterArchive = await call('GET', '/api/habits');
  ok('GET /api/habits excludes archived habit', habitsAfterArchive.status === 200 && !(habitsAfterArchive.json || []).some((h) => h.id === habitId), JSON.stringify(habitsAfterArchive.json));

  // ── 4. Auth must actually be enforced ───────────────────────────────────
  section('Backend API — unauthenticated requests are rejected');

  const noAuth = await fetch(`${API_BASE}/habits`).then((r) => ({ status: r.status }));
  ok('GET /api/habits without a token → 401', noAuth.status === 401);

  const badAuth = await fetch(`${API_BASE}/habits`, { headers: { Authorization: 'Bearer not-a-real-token' } }).then((r) => ({ status: r.status }));
  ok('GET /api/habits with a garbage token → 401', badAuth.status === 401);

  // ── 5. Sign-in flow (mirrors app/(auth)/sign-in.tsx) ────────────────────
  section('Sign-in flow (separate client/session, same credentials)');

  const devBrowser2 = await fetch(
    `https://${frontendApi}/v1/dev_browser?_clerk_js_version=5.0.0`,
    { method: 'POST', headers: { Origin: 'http://localhost' } }
  ).then((r) => r.json());
  const devToken2 = devBrowser2.token;

  let signInRes = await fetch(
    `https://${frontendApi}/v1/client/sign_ins?_clerk_js_version=5.0.0&__dev_session=${devToken2}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ identifier: testEmail, password: testPassword, strategy: 'password' }),
    }
  ).then((r) => r.json());

  ok('signIn.create() with the same email/password succeeds (first factor)', !!signInRes?.response?.id, JSON.stringify(signInRes?.errors));

  const signInId = signInRes?.response?.id;
  let signInStatus = signInRes?.response?.status;

  // A brand-new script-created client looks like an unrecognized device to
  // Clerk, which can ask for an email-code step-up (this is Clerk's fraud
  // protection reacting to an unfamiliar client — see the write-up above,
  // not a bug in the app). Complete it the same way sign-up's verification
  // step does, so this check proves real end-to-end success either way
  // instead of special-casing the status away.
  if (signInStatus === 'needs_second_factor' && signInId) {
    const supportsEmailCode = (signInRes?.response?.supported_second_factors || []).some((f) => f.strategy === 'email_code');
    ok('  (device-trust step-up requested: supports email_code)', supportsEmailCode, JSON.stringify(signInRes?.response?.supported_second_factors));

    if (supportsEmailCode) {
      await fetch(
        `https://${frontendApi}/v1/client/sign_ins/${signInId}/prepare_second_factor?_clerk_js_version=5.0.0&__dev_session=${devToken2}`,
        {
          method: 'POST',
          headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ strategy: 'email_code' }),
        }
      ).then((r) => r.json());

      signInRes = await fetch(
        `https://${frontendApi}/v1/client/sign_ins/${signInId}/attempt_second_factor?_clerk_js_version=5.0.0&__dev_session=${devToken2}`,
        {
          method: 'POST',
          headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ strategy: 'email_code', code: '424242' }),
        }
      ).then((r) => r.json());
      ok('  step-up email code (424242 test code) is accepted', !signInRes?.errors, JSON.stringify(signInRes?.errors));
      signInStatus = signInRes?.response?.status;
    }
  }

  ok('Sign-in reaches status "complete"', signInStatus === 'complete', `got "${signInStatus}"`);

  // ── 6. Forgot-password flow (mirrors app/(auth)/forgot-password.tsx) ────
  section('Forgot-password flow (request code → verify → set new password)');

  const devBrowser3 = await fetch(
    `https://${frontendApi}/v1/dev_browser?_clerk_js_version=5.0.0`,
    { method: 'POST', headers: { Origin: 'http://localhost' } }
  ).then((r) => r.json());
  const devToken3 = devBrowser3.token;

  const resetRequestRes = await fetch(
    `https://${frontendApi}/v1/client/sign_ins?_clerk_js_version=5.0.0&__dev_session=${devToken3}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ identifier: testEmail, strategy: 'reset_password_email_code' }),
    }
  ).then((r) => r.json());

  const resetSignInId = resetRequestRes?.response?.id;
  ok('signIn.create({ strategy: reset_password_email_code }) sends a code', !!resetSignInId, JSON.stringify(resetRequestRes?.errors));
  if (!resetSignInId) return finish(testEmail);

  const newTestPassword = `Zr9${crypto.randomBytes(12).toString('hex')}!`;

  const resetAttempt = await fetch(
    `https://${frontendApi}/v1/client/sign_ins/${resetSignInId}/attempt_first_factor?_clerk_js_version=5.0.0&__dev_session=${devToken3}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ strategy: 'reset_password_email_code', code: '424242' }),
    }
  ).then((r) => r.json());
  ok('Reset code (424242 test code) is accepted', !resetAttempt?.errors, JSON.stringify(resetAttempt?.errors));
  ok(
    'Sign-in reaches status "needs_new_password"',
    resetAttempt?.response?.status === 'needs_new_password',
    `got "${resetAttempt?.response?.status}"`
  );

  const resetComplete = await fetch(
    `https://${frontendApi}/v1/client/sign_ins/${resetSignInId}/reset_password?_clerk_js_version=5.0.0&__dev_session=${devToken3}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ password: newTestPassword, sign_out_of_other_sessions: 'true' }),
    }
  ).then((r) => r.json());
  ok('signIn.resetPassword() completes and creates a session', resetComplete?.response?.status === 'complete', JSON.stringify(resetComplete?.errors || resetComplete?.response?.status));
  ok('A session was created by the password reset', !!resetComplete?.response?.created_session_id);

  // Prove the NEW password actually works and the OLD one no longer does.
  const devToken4 = (await fetch(`https://${frontendApi}/v1/dev_browser?_clerk_js_version=5.0.0`, { method: 'POST', headers: { Origin: 'http://localhost' } }).then((r) => r.json())).token;
  const signInWithNewPassword = await fetch(
    `https://${frontendApi}/v1/client/sign_ins?_clerk_js_version=5.0.0&__dev_session=${devToken4}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ identifier: testEmail, password: newTestPassword, strategy: 'password' }),
    }
  ).then((r) => r.json());
  ok(
    'Signing in with the NEW password succeeds (first factor)',
    signInWithNewPassword?.response?.first_factor_verification?.status === 'verified',
    JSON.stringify(signInWithNewPassword?.errors)
  );

  const devToken5 = (await fetch(`https://${frontendApi}/v1/dev_browser?_clerk_js_version=5.0.0`, { method: 'POST', headers: { Origin: 'http://localhost' } }).then((r) => r.json())).token;
  const signInWithOldPassword = await fetch(
    `https://${frontendApi}/v1/client/sign_ins?_clerk_js_version=5.0.0&__dev_session=${devToken5}`,
    {
      method: 'POST',
      headers: { Origin: 'http://localhost', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ identifier: testEmail, password: testPassword, strategy: 'password' }),
    }
  ).then((r) => r.json());
  ok(
    'Signing in with the OLD password now fails',
    signInWithOldPassword?.response?.first_factor_verification?.status !== 'verified',
    'old password still works — reset did not take effect'
  );

  finish(testEmail);
}

function finish(testEmail) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULT: ${passed} passed, ${failed} failed`);
  if (testEmail) console.log(`(test account: ${testEmail} — safe to ignore/delete in Clerk Dashboard)`);
  if (failed > 0) {
    console.log('\nFirst thing to fix:');
    console.log(`  ✗ ${failures[0].label}`);
    if (failures[0].detail) console.log(`    ${failures[0].detail}`);
  }
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('\nFATAL:', e);
  process.exit(1);
});
