import { Platform } from 'react-native';
import * as Device from 'expo-device';

const rawUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5001/api';

function getBaseUrl(): string {
  const url = rawUrl.trim();
  // The 10.0.2.2 bridge is ONLY meaningful on the Android *emulator* — it's the
  // emulator's special alias for the host machine's localhost. On a real phone
  // 10.0.2.2 is unreachable, so there we must use the configured URL verbatim
  // (a LAN IP, or a deployed https URL). Rewriting it unconditionally — as this
  // used to — silently broke every request in a real-device build.
  // `Device.isDevice` is false on the emulator/simulator, true on a physical device.
  const isAndroidEmulator = Platform.OS === 'android' && !Device.isDevice;
  if (isAndroidEmulator) {
    return url
      .replace('http://localhost', 'http://10.0.2.2')
      .replace('http://127.0.0.1', 'http://10.0.2.2')
      .replace(/http:\/\/192\.168\.\d+\.\d+/, 'http://10.0.2.2');
  }
  return url;
}

const BASE = getBaseUrl();

/**
 * Typed fetch wrapper for the Express/MongoDB backend.
 * Attaches a Clerk session token as a Bearer credential — the server verifies
 * it and derives the user id itself; the client never asserts its own identity.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Timeout so the UI never hangs forever. 30s (not 10s) because a backend on a
  // free hosting tier can cold-start for ~30-50s after it has spun down from
  // inactivity — too short a timeout would abort the very first request after
  // idle and make the app look broken when the server is merely waking up.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API [${response.status}] ${url}: ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout connecting to ${url}`);
    }
    throw err;
  }
}
