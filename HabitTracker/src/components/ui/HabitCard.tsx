import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { CheckCircle2, Circle, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { habitFrequencyLabel } from '../../lib/constants';
import { formatTime } from '../../lib/dateUtils';

export interface HabitCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  emoji?: string;
  iconColor?: string;
  isCompleted: boolean;
  onToggle: () => void;
  /** Repeat schedule — shown as e.g. "Daily" / "Weekdays" / "Mon, Wed, Fri". */
  frequency?: string;
  frequencyDays?: number[];
  /** Reminder — shown as a small bell + time (e.g. "🔔 7:00 AM") when enabled. */
  reminderEnabled?: boolean;
  reminderTime?: string | null;
}

export function HabitCard({
  id,
  title,
  subtitle,
  emoji = '✨',
  iconColor = '#5AC8FA',
  isCompleted,
  onToggle,
  frequency,
  frequencyDays,
  reminderEnabled,
  reminderTime,
}: HabitCardProps) {
  const router = useRouter();
  const showMeta = !!frequency && !!frequencyDays;

  return (
    <TouchableOpacity
      style={[styles.card, isCompleted && styles.cardCompleted]}
      activeOpacity={0.7}
      onPress={() => id && router.push(`/habit/${id}`)}
    >
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: `${iconColor}25` }]}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, isCompleted && styles.titleDone]}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {showMeta && (
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>{habitFrequencyLabel(frequency!, frequencyDays!)}</Text>
              {reminderEnabled && !!reminderTime && (
                <View style={styles.reminderChip}>
                  <Bell size={10} color="#C7F464" />
                  <Text style={styles.reminderChipText}>{formatTime(reminderTime)}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.checkBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
        {isCompleted
          ? <CheckCircle2 size={28} color="#C7F464" />
          : <Circle size={28} color="#3F3F3F" />
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 14,
    marginBottom: 10,
  },
  cardCompleted: {
    borderColor: '#C7F46430',
    backgroundColor: '#C7F46408',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  iconWrap: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  textCol: { flexShrink: 1 },
  title: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  titleDone: { color: '#B5B5B5' },
  subtitle: { fontSize: 12, color: '#707070', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metaText: { fontSize: 11, color: '#707070', fontWeight: '600' },
  reminderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#C7F46415',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  reminderChipText: { fontSize: 10, color: '#C7F464', fontWeight: '700' },
  checkBtn: { padding: 4 },
});
