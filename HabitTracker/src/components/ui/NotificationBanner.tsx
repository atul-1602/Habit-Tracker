import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Bell, X } from 'lucide-react-native';
import { Text } from './Text';
import { appendNotificationLogEntry } from '../../hooks/useNotificationLog';

interface BannerContent {
  title: string;
  body: string;
}

const AUTO_DISMISS_MS = 4500;

/**
 * App-themed replacement for the native OS foreground-notification banner.
 * The native banner (Android's default heads-up style) can't be restyled to
 * match the app and was overlapping the tab bar — this renders our own,
 * slides in from the top (clear of the tab bar), and auto-dismisses.
 * `useNotifications.ts`'s handler sets `shouldShowBanner: false` so the
 * native one never appears alongside this.
 *
 * Mount once, near the root (see app/_layout.tsx), so it's available
 * app-wide regardless of which screen is active when a reminder fires.
 */
// Matches the fixed top offset every other screen in this app already uses
// (`paddingTop: 56` in their container styles) rather than pulling in a
// SafeAreaProvider dependency that isn't set up anywhere else in the app.
const TOP_OFFSET = 56;

export function NotificationBanner() {
  const [content, setContent] = useState<BannerContent | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.timing(translateY, {
      toValue: -120,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setContent(null));
  };

  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setContent({ title: title ?? 'Habit Tracker', body: body ?? '' });
      translateY.setValue(-120);
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 60 }).start();
      dismissTimer.current = setTimeout(hide, AUTO_DISMISS_MS);

      // Record it for the notifications screen (bell icon on Home) — this
      // is the single place every notification the app observes passes
      // through, so it's the natural spot to log them.
      appendNotificationLogEntry({
        title: title ?? 'Habit Tracker',
        body: body ?? '',
        habitId: typeof data?.habitId === 'string' ? data.habitId : undefined,
      });
    });
    return () => {
      sub.remove();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!content) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: TOP_OFFSET, transform: [{ translateY }] }]}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Bell size={18} color="#C7F464" />
        </View>
        <View style={styles.textWrap}>
          {!!content.title && <Text style={styles.title} numberOfLines={1}>{content.title}</Text>}
          {!!content.body && <Text style={styles.body} numberOfLines={2}>{content.body}</Text>}
        </View>
        <TouchableOpacity onPress={hide} style={styles.closeBtn} hitSlop={8}>
          <X size={16} color="#707070" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 999 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#C7F46420',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  body: { fontSize: 12, color: '#B5B5B5', marginTop: 2 },
  closeBtn: { padding: 4, marginLeft: 8 },
});
