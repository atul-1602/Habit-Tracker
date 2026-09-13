import { LogBox } from 'react-native';

// `expo-notifications` warns, at import time, that its remote/push
// functionality isn't supported when running inside Expo Go (this app has
// no expo-dev-client installed, so that's how it's being run). This app
// only ever schedules LOCAL reminders — it never touches push tokens — so
// the warning doesn't reflect an actual limitation here. It's dev-only
// (never appears in a real standalone/EAS build), but its native LogBox
// overlay rendered as a plain, unstyled white bar overlapping the tab bar,
// which looked like broken in-app UI rather than what it actually is: a
// React Native developer-tools warning outside our component tree
// entirely (nothing we render in JS can restyle or replace it).
//
// This must run before `expo-router/entry` — and this file must be the
// app's actual entry point (see package.json's "main") — so the ignore
// pattern is registered before any route under app/ (which may import
// expo-notifications) gets required by Expo Router's file-based routing.
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

// A static `import` here would be hoisted above the ignoreLogs() call
// above (ES imports always execute before any other top-level code in a
// module, regardless of source position) — defeating the whole point.
// `require()` runs in true sequential order, so this only executes (and
// only then requires every route file under app/) after the ignore
// pattern is already registered.
require('expo-router/entry');
