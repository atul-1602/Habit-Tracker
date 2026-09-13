import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/expo';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, AppState } from 'react-native';
import '../global.css';
import { queryClient } from '../src/lib/queryClient';
import { NotificationBanner } from '../src/components/ui/NotificationBanner';
import { useSmartNotifications } from '../src/hooks/useSmartNotifications';

// ──────────────────────────────────────────────────────────
// Clerk token cache (SecureStore for mobile security)
// ──────────────────────────────────────────────────────────
// Track if SecureStore is completely broken (hanging) to prevent infinite deadlocks
let isSecureStoreBroken = false;

const tokenCache = {
  async getToken(key: string) {
    if (isSecureStoreBroken) return null;
    try {
      // Add a 2-second timeout to prevent SecureStore from hanging forever on some Android devices
      const token = await Promise.race([
        SecureStore.getItemAsync(key),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SecureStore timeout')), 2000))
      ]);
      return token as string | null;
    } catch (e: any) {
      if (e?.message === 'SecureStore timeout') {
        console.warn('[tokenCache] SecureStore.getItemAsync timed out. Marking SecureStore as broken.');
        isSecureStoreBroken = true;
        return null;
      }
      try {
        await Promise.race([
          SecureStore.deleteItemAsync(key),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SecureStore delete timeout')), 1000))
        ]);
      } catch (e2: any) {
        if (e2?.message === 'SecureStore delete timeout') {
          isSecureStoreBroken = true;
        }
      }
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    if (isSecureStoreBroken) return;
    try {
      await Promise.race([
        SecureStore.setItemAsync(key, value),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SecureStore timeout')), 2000))
      ]);
    } catch (e: any) {
      if (e?.message === 'SecureStore timeout') {
        isSecureStoreBroken = true;
      }
    }
  },
};
import { useSettings } from '../src/hooks/useSettings';

// ──────────────────────────────────────────────────────────
// Auth Guard – shows loading while Clerk initializes,
// then redirects based on sign-in state
// ──────────────────────────────────────────────────────────
function AuthGuard() {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { settings, isLoaded: settingsLoaded } = useSettings();
  const { recomputeEveningCheckIn, recomputeInactivityNudge } = useSmartNotifications();
  const router = useRouter();
  const segments = useSegments();
  // Fallback: if Clerk doesn't load in 5s, treat as unauthenticated
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoaded) {
      timeoutRef.current = setTimeout(() => {
        console.warn('[AuthGuard] Clerk auth timed out. Treating as unauthenticated.');
        setAuthTimedOut(true);
      }, 5000);
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setAuthTimedOut(false);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [authLoaded]);

  const effectiveAuthLoaded = authLoaded || authTimedOut;
  const effectiveIsSignedIn = authTimedOut ? false : isSignedIn;

  useEffect(() => {
    if (!effectiveAuthLoaded || !settingsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isOnboarding = segments[0] === 'onboarding';

    if (!effectiveIsSignedIn && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (effectiveIsSignedIn) {
      if (!settings.hasCompletedOnboarding) {
        if (!isOnboarding) {
          router.replace('/onboarding');
        }
      } else {
        if (inAuthGroup || isOnboarding || segments.length === 0) {
          router.replace('/(tabs)');
        }
      }
    }
  }, [effectiveIsSignedIn, effectiveAuthLoaded, settingsLoaded, segments, settings.hasCompletedOnboarding]);

  // Smart notifications need recomputing whenever the app comes to the
  // foreground (cold start included) — the evening check-in should reflect
  // "what's incomplete right now", and the inactivity nudge should keep
  // getting pushed further out for as long as the user keeps opening the
  // app. Habit/completion changes are handled separately, at the mutations
  // themselves (see useHabits.ts / useCompletions.ts).
  useEffect(() => {
    if (!effectiveIsSignedIn) return;

    recomputeEveningCheckIn().catch((e) => console.error(e));
    recomputeInactivityNudge().catch((e) => console.error(e));

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        recomputeEveningCheckIn().catch((e) => console.error(e));
        recomputeInactivityNudge().catch((e) => console.error(e));
      }
    });
    return () => sub.remove();
  }, [effectiveIsSignedIn, recomputeEveningCheckIn, recomputeInactivityNudge]);

  // Show a loading indicator while Clerk and settings initialize
  if (!effectiveAuthLoaded || !settingsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#C7F464" />
      </View>
    );
  }

  return (
    <>
      <Slot />
      <NotificationBanner />
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Root Layout
// ──────────────────────────────────────────────────────────
const publishableKey = (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '').trim();
const isKeyValid =
  publishableKey.startsWith('pk_') &&
  !publishableKey.includes('REPLACE_WITH_YOUR_KEY');

if (!isKeyValid) {
  console.warn(
    '[HabitTracker] EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is missing or still a placeholder.\n' +
    'Add your key from https://dashboard.clerk.com → API Keys to enable authentication.'
  );
}

export default function RootLayout() {
  if (__DEV__) {
    console.log('[RootLayout] publishableKey:', publishableKey ? publishableKey.substring(0, 15) + '...' : 'EMPTY', 'isKeyValid:', isKeyValid);
  }

  useEffect(() => {
    // A static app.json config (userInterfaceStyle/backgroundColor) only
    // takes effect after a native prebuild — this app runs via Expo Go
    // (no dev-client), which can't pick that up at all. This runtime call
    // is what actually fixes the white flash between screens/tabs right
    // now; the app.json values are for when this eventually becomes a
    // real standalone/EAS build.
    SystemUI.setBackgroundColorAsync('#111111').catch(() => {
      // Not available on this platform/runtime — safe to ignore.
    });
  }, []);

  if (!isKeyValid) {
    return (
      <QueryClientProvider client={queryClient}>
        <Slot />
      </QueryClientProvider>
    );
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
