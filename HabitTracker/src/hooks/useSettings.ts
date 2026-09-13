import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  theme: 'Dark' | 'Light' | 'System';
  accentColor: string;
  remindersEnabled: boolean;
  motivationalQuotes: boolean;
  streakAlerts: boolean;
  inactivityNudgeEnabled: boolean;
  hasCompletedOnboarding: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'Dark',
  accentColor: '#C7F464',
  remindersEnabled: true,
  motivationalQuotes: true,
  streakAlerts: false,
  inactivityNudgeEnabled: true,
  hasCompletedOnboarding: false,
};

const SETTINGS_STORAGE_KEY = '@app_settings';

// Global State for settings
let globalSettings: AppSettings = DEFAULT_SETTINGS;
let globalIsLoaded = false;
let initStarted = false;
let isAsyncStorageBroken = false;
const listeners = new Set<() => void>();

const initSettings = () => {
  if (initStarted) return;
  initStarted = true;
  
  Promise.race([
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
    new Promise<string | null>((_, reject) => setTimeout(() => reject(new Error('AsyncStorage timeout')), 2000))
  ])
    .then(stored => {
      if (stored) {
        globalSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    })
    .catch(err => {
      if (err?.message === 'AsyncStorage timeout') {
        console.warn('[useSettings] AsyncStorage timed out. Marking as broken.');
        isAsyncStorageBroken = true;
      } else {
        console.error('Failed to load settings', err);
      }
    })
    .finally(() => {
      globalIsLoaded = true;
      listeners.forEach(l => l());
    });
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(globalSettings);
  const [isLoaded, setIsLoaded] = useState(globalIsLoaded);

  useEffect(() => {
    initSettings();
    const listener = () => {
      setSettings(globalSettings);
      setIsLoaded(globalIsLoaded);
    };
    listeners.add(listener);
    listener(); // sync on mount
    return () => { listeners.delete(listener); };
  }, []);

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    try {
      const newSettings = { ...globalSettings, [key]: value };
      globalSettings = newSettings;
      // Notify all components to re-render immediately
      listeners.forEach(l => l());
      
      if (!isAsyncStorageBroken) {
        await Promise.race([
          AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings)),
          new Promise((_, reject) => setTimeout(() => reject(new Error('AsyncStorage timeout')), 2000))
        ]);
      }
    } catch (error: any) {
      if (error?.message === 'AsyncStorage timeout') {
        isAsyncStorageBroken = true;
      }
      console.error('Failed to save settings', error);
    }
  };

  return { settings, updateSetting, isLoaded };
}
