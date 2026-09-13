import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Habit } from '../domain/types';
import { NotificationContent } from '../lib/notificationContent';

// Configure how notifications behave when the app is in the foreground.
// The native OS banner (Android's default heads-up style) can't be themed
// and was rendering poorly / overlapping the tab bar — it's suppressed here
// in favor of `<NotificationBanner>`, an app-themed in-app toast mounted
// near the root (see app/_layout.tsx) that listens for the same event.
// `shouldShowList: true` still keeps the notification in the system
// tray/history for later reference.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C7F464',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } else {
    console.log('Must use physical device for Push Notifications');
  }
  return false;
}

// One notification identifier per app weekday (0=Mon…6=Sun, matching
// `Habit.frequency_days`) so a "weekdays"/"custom" habit's reminder only
// fires on the days it's actually scheduled for — not a plain daily
// repeat, which would also fire on days the habit isn't due at all.
function reminderIdentifier(habitId: string, appDayIndex: number): string {
  return `habit-reminder-${habitId}-${appDayIndex}`;
}

// expo-notifications' WEEKLY trigger uses Apple's 1-7 convention (1=Sunday)
// — convert from this app's Monday-first 0-6 convention.
function toExpoWeekday(appDayIndex: number): number {
  return ((appDayIndex + 1) % 7) + 1;
}

export async function scheduleHabitReminder(habit: Habit) {
  if (!habit.reminder_enabled || !habit.reminder_time) {
    return cancelHabitReminder(habit.id);
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Cancel every possible day's reminder first (not just the ones about to
  // be scheduled) so changing a habit's days — or its frequency entirely —
  // never leaves a stale reminder firing on a day it's no longer due.
  await cancelHabitReminder(habit.id);

  const [hours, minutes] = habit.reminder_time.split(':').map(Number);

  await Promise.all(
    habit.frequency_days.map((appDayIndex) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for your habit!',
          body: `Don't forget to complete: ${habit.emoji} ${habit.name}`,
          sound: true,
          data: { habitId: habit.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: toExpoWeekday(appDayIndex),
          hour: hours,
          minute: minutes,
        },
        identifier: reminderIdentifier(habit.id, appDayIndex),
      })
    )
  );
}

export async function cancelHabitReminder(habitId: string) {
  await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map((appDayIndex) =>
      Notifications.cancelScheduledNotificationAsync(reminderIdentifier(habitId, appDayIndex))
    )
  );
}

// ──────────────────────────────────────────────────────────────
// Smart notifications — evening check-in & inactivity nudge
//
// These use fixed, well-known identifiers (rather than random ones stored
// in AsyncStorage) precisely so they can always be found and replaced/
// cancelled outright: `scheduleNotificationAsync` with an identifier that's
// already scheduled simply replaces it, and cancelling an identifier that
// was never scheduled is a documented no-op (see `cancelHabitReminder`
// above, which relies on the same guarantee). No extra bookkeeping needed.
//
// The data-fetching/decision logic (which habits are incomplete, whether a
// streak is at risk) lives in `useSmartNotifications.ts` — this file only
// talks to `expo-notifications` directly, per this app's convention of
// keeping that the single place that does so.
// ──────────────────────────────────────────────────────────────
const EVENING_CHECKIN_ID = 'evening-checkin';
const INACTIVITY_NUDGE_ID = 'inactivity-nudge';
const DEFAULT_EVENING_HOUR = 20; // 8:00 PM
const DEFAULT_INACTIVITY_DAYS = 3;

/**
 * (Re)schedules the once-a-day evening check-in with fresh content, or
 * cancels it outright if `content` is `null` (e.g. everything's already
 * complete, the user has no habits, or the setting is off).
 */
export async function scheduleOrCancelEveningCheckIn(
  content: NotificationContent | null,
  hour: number = DEFAULT_EVENING_HOUR,
  minute: number = 0
): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(EVENING_CHECKIN_ID);
  if (!content) return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: { ...content, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
    identifier: EVENING_CHECKIN_ID,
  });
}

/**
 * Cancels + reschedules a one-off "come back" nudge `days` from now. Meant
 * to be called on every app foreground: since it's cancelled and pushed out
 * again each time, it only ever actually fires if the user genuinely
 * doesn't open the app for `days` straight — there's no server or
 * background polling involved.
 */
export async function rescheduleInactivityNudge(days: number = DEFAULT_INACTIVITY_DAYS): Promise<void> {
  await cancelInactivityNudge();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'We miss you!',
      body: "Haven't seen you in a few days — your habits are waiting.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: days * 24 * 60 * 60,
    },
    identifier: INACTIVITY_NUDGE_ID,
  });
}

export async function cancelInactivityNudge(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(INACTIVITY_NUDGE_ID);
}
