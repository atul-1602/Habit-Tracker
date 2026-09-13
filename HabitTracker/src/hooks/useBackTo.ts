import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Makes a screen's "back" action — both its own on-screen back button AND
 * Android's hardware back button/gesture — explicitly return to a fixed
 * parent route, instead of relying on the navigation stack's default pop
 * target.
 *
 * Why this is needed: screens like Achievements/Settings live at the app's
 * root (siblings of the `(tabs)` group, not inside it), so `router.back()`
 * pops to whatever the tab navigator's underlying state resolves to — which
 * was landing on the Home tab instead of resuming Profile, the screen the
 * user actually came from. An explicit target sidesteps that entirely.
 *
 * `BackHandler` is Android-only in effect; it's a documented no-op on iOS,
 * so this is safe to use on every screen unconditionally.
 */
export function useBackTo(targetRoute: string) {
  const router = useRouter();

  const goBack = () => router.replace(targetRoute as any);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true; // we handled it — prevent the default pop behavior
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRoute]);

  return goBack;
}
