import { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a screen's root content with a quick fade + slight upward slide on
 * mount, so switching tabs/screens feels considered rather than an instant,
 * hard pop of content. Pairs with the tab navigator's own `animation: 'fade'`
 * (see app/(tabs)/_layout.tsx) — that handles the cross-tab transition,
 * this handles each screen's own content settling in.
 *
 * Uses the plain RN `Animated` API (not Reanimated) to match the existing
 * convention already used elsewhere in this app (NotificationBanner,
 * ToggleSwitch, onboarding's carousel) — `useNativeDriver: true` keeps it
 * running on the native thread regardless, so it's just as smooth.
 */
export function FadeInView({ children, style }: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
    // Runs once per mount — a fresh instance of this component is what we
    // want to animate in (e.g. navigating back to an already-visited tab
    // creates a new mount under Expo Router's default tab behavior).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
