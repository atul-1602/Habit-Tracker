import { Platform } from 'react-native';

const rawUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5001/api';

function getBaseUrl(): string {
  let url = rawUrl.trim();
  if (Platform.OS === 'android') {
    // Replace localhost / 127.0.0.1 / local IPs with 10.0.2.2 for Android emulator network bridge
    url = url
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

  // Add 10s timeout to prevent UI hanging indefinitely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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
