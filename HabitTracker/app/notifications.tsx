import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { Text } from '../src/components/ui/Text';
import { useBackTo } from '../src/hooks/useBackTo';
import { ChevronLeft, Bell, Flame, Heart, Trash2 } from 'lucide-react-native';
import { useEffect } from 'react';
import { useNotificationLog, NotificationLogEntry } from '../src/hooks/useNotificationLog';
import { formatRelativeTime } from '../src/lib/dateUtils';

/** Picks an icon/color for a log entry based on its content — the app
 * currently only ever produces habit reminders, the evening check-in
 * (which itself sometimes uses streak-risk wording), and the inactivity
 * nudge, so a simple text match is enough to tell them apart without
 * needing a stored "type" field. */
function iconFor(entry: NotificationLogEntry) {
  const title = entry.title.toLowerCase();
  if (title.includes('streak')) return { Icon: Flame, color: '#FF7849', bg: '#FF784920' };
  if (title.includes('miss you')) return { Icon: Heart, color: '#FF5DA2', bg: '#FF5DA220' };
  return { Icon: Bell, color: '#C7F464', bg: '#C7F46420' };
}

export default function NotificationsScreen() {
  const goBack = useBackTo('/(tabs)');
  const { entries, isLoaded, markAllRead, clearAll } = useNotificationLog();

  useEffect(() => {
    if (isLoaded) markAllRead();
  }, [isLoaded]);

  const handleClearAll = () => {
    Alert.alert('Clear all notifications?', 'This removes your notification history. This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearAll },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {entries.length > 0 ? (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Trash2 size={18} color="#707070" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 42 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              Habit reminders, evening check-ins, and streak alerts will show up here.
            </Text>
          </View>
        ) : (
          entries.map((entry) => {
            const { Icon, color, bg } = iconFor(entry);
            return (
              <View key={entry.id} style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                  <Icon size={18} color={color} />
                </View>
                <View style={styles.textCol}>
                  <Text style={styles.rowTitle}>{entry.title}</Text>
                  {!!entry.body && <Text style={styles.rowBody}>{entry.body}</Text>}
                  <Text style={styles.rowTime}>{formatRelativeTime(entry.receivedAt)}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  clearBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  row: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  rowBody: { fontSize: 13, color: '#B5B5B5', marginTop: 3, lineHeight: 18 },
  rowTime: { fontSize: 11, color: '#707070', marginTop: 6 },

  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#707070', textAlign: 'center', lineHeight: 22 },
});
