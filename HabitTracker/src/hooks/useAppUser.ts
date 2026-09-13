/**
 * useAppUser – Safe wrapper around Clerk's useUser hook.
 *
 * This hook MUST be called unconditionally (rules of hooks).
 * When ClerkProvider is active, it returns the real Clerk user.
 * When ClerkProvider is absent (no valid key in .env), isLoaded
 * will be false and user will be null — callers should handle
 * the null case gracefully.
 */
import { useUser } from '@clerk/expo';

export type AppUser = ReturnType<typeof useUser>;

export function useAppUser(): AppUser {
  return useUser();
}
