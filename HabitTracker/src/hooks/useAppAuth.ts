/**
 * useAppAuth – Safe wrapper around Clerk's useAuth hook.
 *
 * Exposes `getToken`, used to attach a verifiable session token to every
 * API request instead of the app asserting its own identity via a header.
 */
import { useAuth } from '@clerk/expo';

export type AppAuth = ReturnType<typeof useAuth>;

export function useAppAuth(): AppAuth {
  return useAuth();
}
