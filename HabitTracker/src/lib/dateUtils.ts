// ──────────────────────────────────────────────────────────────
// Date Utilities – centralised, no moment.js dependency
// ──────────────────────────────────────────────────────────────

/** Returns today's date as 'YYYY-MM-DD' */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Formats a Date object as 'YYYY-MM-DD' */
export function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Parses an ISO date string to a Date at midnight local time */
export function fromISO(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Returns start of month as 'YYYY-MM-DD' */
export function startOfMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/** Returns end of month as 'YYYY-MM-DD' */
export function endOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** Formats time 'HH:MM' to '7:00 AM' display format */
export function formatTime(time: string | null): string {
  if (!time) return 'No reminder';
  const [hourStr, minStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const min = minStr ?? '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${min} ${ampm}`;
}

/** Converts 'HH:MM' into a Date (today's date, that time) — the shape the
 * native time picker (`@react-native-community/datetimepicker`) expects. */
export function timeStringToDate(time: string): Date {
  const [hourStr, minStr] = time.split(':');
  const d = new Date();
  d.setHours(parseInt(hourStr, 10) || 0, parseInt(minStr, 10) || 0, 0, 0);
  return d;
}

/** Converts a Date back into 'HH:MM', the format habits are stored in. */
export function dateToTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Returns an array of the last N dates as ISO strings (newest first) */
export function lastNDates(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return toISO(d);
  });
}

/** Gets short weekday name for a given ISO date */
export function weekdayShort(isoDate: string): string {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return DAYS[fromISO(isoDate).getDay()];
}

/**
 * Monday-first day-of-week index (0=Mon…6=Sun) for a given ISO date —
 * matches the convention used by `Habit.frequency_days`, `WEEK_DAYS_SHORT`,
 * and `buildCalendarGrid`.
 */
export function mondayFirstDayIndex(isoDate: string): number {
  const jsDay = fromISO(isoDate).getDay(); // 0=Sun…6=Sat
  return (jsDay + 6) % 7;
}

/**
 * Whether a habit is scheduled on a given date: it must (1) already have
 * existed as of that date — a habit created today shouldn't retroactively
 * appear on past dates before it existed — and (2) match its
 * `frequency_days` for that day-of-week (already fully populated for every
 * frequency mode at creation time — see app/create-habit.tsx — so a simple
 * membership check covers daily, weekdays, and custom schedules alike).
 */
export function isHabitScheduledForDate(
  habit: { frequency_days: number[]; created_at?: string },
  isoDate: string
): boolean {
  if (habit.created_at) {
    const createdDateISO = habit.created_at.split('T')[0];
    if (isoDate < createdDateISO) return false;
  }
  return habit.frequency_days.includes(mondayFirstDayIndex(isoDate));
}

/** Generates a calendar grid (null = empty cell, number = day) for a month */
export function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay + 6) % 7; // Shift so Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Returns 'YYYY-MM-DD' for a specific day in a month */
export function dayToISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function monthName(month: number): string {
  return MONTH_NAMES[month];
}

/** Format date as 'May 21, 2025' */
export function formatDate(isoDate: string): string {
  const d = fromISO(isoDate);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Formats a full ISO timestamp (e.g. Date.toISOString()) as 'Just now',
 * '5m ago', '3h ago', '2d ago', or a short date once it's over a week old. */
export function formatRelativeTime(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const d = new Date(isoTimestamp);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}
