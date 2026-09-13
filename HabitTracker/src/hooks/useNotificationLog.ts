import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../lib/constants';

export interface NotificationLogEntry {
  id: string;
  title: string;
  body: string;
  habitId?: string;
  receivedAt: string; // ISO timestamp
  read: boolean;
}

const MAX_ENTRIES = 50;

// Same module-level "global state + listeners" pattern as useSettings.ts —
// AsyncStorage-backed, shared across every component that reads it (the
// Home screen's bell badge and the notifications screen both need to see
// the same list without needing a parent-level context provider).
let globalLog: NotificationLogEntry[] = [];
let globalIsLoaded = false;
let initStarted = false;
let isAsyncStorageBroken = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((l) => l());
}

function persist() {
  if (isAsyncStorageBroken) return;
  AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_LOG, JSON.stringify(globalLog)).catch((err) => {
    console.error('Failed to save notification log', err);
  });
}

function initLog() {
  if (initStarted) return;
  initStarted = true;

  Promise.race([
    AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_LOG),
    new Promise<string | null>((_, reject) => setTimeout(() => reject(new Error('AsyncStorage timeout')), 2000)),
  ])
    .then((stored) => {
      if (stored) globalLog = JSON.parse(stored);
    })
    .catch((err) => {
      if (err?.message === 'AsyncStorage timeout') {
        console.warn('[useNotificationLog] AsyncStorage timed out. Marking as broken.');
        isAsyncStorageBroken = true;
      } else {
        console.error('Failed to load notification log', err);
      }
    })
    .finally(() => {
      globalIsLoaded = true;
      notifyListeners();
    });
}

/**
 * Records a notification into the persisted log — called from
 * `NotificationBanner`'s existing `addNotificationReceivedListener`
 * subscription (see that file) so every notification the app observes
 * while its JS is running gets logged for the notifications screen.
 *
 * Note: a notification delivered while the app was fully killed won't be
 * retroactively logged (the listener only fires while JS is alive) — same
 * limitation as any purely local, non-server-backed notification history.
 */
export function appendNotificationLogEntry(entry: Omit<NotificationLogEntry, 'id' | 'receivedAt' | 'read'>) {
  const newEntry: NotificationLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    read: false,
  };
  globalLog = [newEntry, ...globalLog].slice(0, MAX_ENTRIES);
  notifyListeners();
  persist();
}

export function useNotificationLog() {
  const [entries, setEntries] = useState<NotificationLogEntry[]>(globalLog);
  const [isLoaded, setIsLoaded] = useState(globalIsLoaded);

  useEffect(() => {
    initLog();
    const listener = () => {
      setEntries(globalLog);
      setIsLoaded(globalIsLoaded);
    };
    listeners.add(listener);
    listener(); // sync on mount
    return () => { listeners.delete(listener); };
  }, []);

  const unreadCount = entries.filter((e) => !e.read).length;

  const markAllRead = () => {
    if (entries.every((e) => e.read)) return;
    globalLog = globalLog.map((e) => ({ ...e, read: true }));
    notifyListeners();
    persist();
  };

  const clearAll = () => {
    globalLog = [];
    notifyListeners();
    persist();
  };

  return { entries, unreadCount, isLoaded, markAllRead, clearAll };
}
